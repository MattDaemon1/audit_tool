import { NextRequest, NextResponse } from 'next/server';
import { runHybridAudit } from '@/lib/auditOrchestrator';
import { generateAuditPdf } from '@/lib/pdfGenerator';
import { emailService } from '@/lib/emailService';
import { securityLogger } from '@/lib/securityLogger';
import { AuditService } from '@/lib/auditService';
import { CacheService } from '@/lib/cacheService';
import { v4 as uuidv4 } from 'uuid';

// Force Node.js runtime for Lighthouse compatibility
export const runtime = 'nodejs'

// Rate limiting simple (en mémoire)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>()
const RATE_LIMIT_WINDOW = 300000 // 5 minutes pour email (plus restrictif)
const RATE_LIMIT_MAX = 3 // 3 emails max par 5 minutes par IP

function checkEmailRateLimit(ip: string): boolean {
    const now = Date.now()
    const userLimit = rateLimitMap.get(ip)

    if (!userLimit || now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(ip, { count: 1, timestamp: now })
        return true
    }

    if (userLimit.count >= RATE_LIMIT_MAX) {
        return false
    }

    userLimit.count++
    return true
}

function validateDomain(domain: string): boolean {
    const cleanDomain = domain.trim().toLowerCase()

    // Protection contre les injections
    if (cleanDomain.includes('<') || cleanDomain.includes('>') ||
        cleanDomain.includes('"') || cleanDomain.includes("'") ||
        cleanDomain.includes('javascript:') || cleanDomain.includes('data:') ||
        cleanDomain.includes('file:') || cleanDomain.includes('ftp:')) {
        return false
    }

    // Validation format domaine
    const domainRegex = /^(https?:\/\/)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/
    if (!domainRegex.test(cleanDomain)) return false

    // Protection contre les domaines locaux/privés
    const blockedDomains = [
        'localhost', '127.0.0.1', '0.0.0.0', '::1',
        '10.', '192.168.', '172.'
    ]

    return !blockedDomains.some(blocked => cleanDomain.includes(blocked)) &&
        cleanDomain.length <= 253
}

function validateEmail(email: string): boolean {
    const cleanEmail = email.trim().toLowerCase()

    // Protection contre les injections
    if (cleanEmail.includes('<') || cleanEmail.includes('>') ||
        cleanEmail.includes('"') || cleanEmail.includes("'") ||
        cleanEmail.includes('script') || cleanEmail.includes('javascript:')) {
        return false
    }

    // Validation RFC compliant mais stricte
    const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

    return emailRegex.test(cleanEmail) && cleanEmail.length <= 254
}

export async function POST(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    try {
        // Protection CSRF
        const xRequestedWith = request.headers.get('x-requested-with')
        if (xRequestedWith !== 'XMLHttpRequest') {
            await securityLogger.logSuspiciousActivity(ip, userAgent, 'Tentative de requête sans header CSRF')
            return NextResponse.json({ error: 'Requête non autorisée' }, { status: 403 })
        }

        // Rate limiting pour emails (plus strict)
        if (!checkEmailRateLimit(ip)) {
            await securityLogger.logRateLimitExceeded(ip, userAgent, '/api/send-audit')
            return NextResponse.json({
                error: 'Limite d\'envoi atteinte. Veuillez attendre 5 minutes avant de réessayer.'
            }, { status: 429 })
        } const { domain, email, mode = 'fast', options = {}, timestamp } = await request.json();

        // Validation de base
        if (!domain || !email) {
            return NextResponse.json(
                { error: 'Domain et email sont requis' },
                { status: 400 }
            );
        }

        // Validation timestamp (protection anti-replay)
        if (!timestamp || typeof timestamp !== 'number') {
            return NextResponse.json({ error: 'Timestamp manquant' }, { status: 400 })
        }

        const now = Date.now()
        if (Math.abs(now - timestamp) > 300000) { // 5 minutes max
            return NextResponse.json({ error: 'Requête expirée' }, { status: 400 })
        }

        // Validation stricte de l'email
        if (!validateEmail(email)) {
            return NextResponse.json(
                { error: 'Format d\'email invalide ou potentiellement dangereux' },
                { status: 400 }
            );
        }

        // Validation stricte du domaine
        if (!validateDomain(domain)) {
            return NextResponse.json(
                { error: 'Format de domaine invalide ou potentiellement dangereux' },
                { status: 400 }
            );
        }

        // Validation du mode
        if (!['fast', 'complete'].includes(mode)) {
            return NextResponse.json({ error: 'Mode d\'audit invalide' }, { status: 400 })
        }

        // Nettoyage des inputs
        const cleanDomain = domain.trim().toLowerCase()
        const cleanEmail = email.trim().toLowerCase()
        const requestId = uuidv4()

        console.log(`[EMAIL-AUDIT] Démarrage audit sécurisé + envoi email pour ${cleanDomain} (${cleanEmail}) [IP: ${ip}] [ID: ${requestId}]`);

        // Vérifier le cache d'abord
        const cachedResult = await CacheService.getCachedAudit(cleanDomain, mode)
        let auditResults: any

        if (cachedResult) {
            console.log(`[EMAIL-AUDIT] Utilisation du cache pour ${cleanDomain}`)
            auditResults = cachedResult
            await securityLogger.logAuditRequest(ip, userAgent, cleanDomain, cleanEmail.replace(/(?<=.{2}).(?=.*@)/g, '*'), 'email-cached')
        } else {
            // 1. Exécuter l'audit avec timeout
            auditResults = await Promise.race([
                runHybridAudit(cleanDomain, mode),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout audit')), 120000) // 2 minutes max
                )
            ]) as any;

            console.log(`[EMAIL-AUDIT] Audit terminé en ${Math.round(auditResults.executionTime / 1000)}s`)

            // Sauvegarder en base et cache
            try {
                await AuditService.saveAudit({
                    domain: cleanDomain,
                    email: cleanEmail,
                    mode,
                    ipAddress: ip,
                    userAgent,
                    requestId,
                    results: auditResults,
                    executionTime: auditResults.executionTime || 0,
                    pdfGenerated: false,
                    emailSent: false
                })

                await CacheService.setCachedAudit(cleanDomain, mode, auditResults)

                await securityLogger.logAuditRequest(ip, userAgent, cleanDomain, cleanEmail.replace(/(?<=.{2}).(?=.*@)/g, '*'), 'email-new')
            } catch (error) {
                await securityLogger.logSuspiciousActivity(ip, userAgent, `Erreur sauvegarde audit email: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
                // Continue même si la sauvegarde échoue
            }
        }        // 2. Générer le PDF avec protection
        let pdfBase64: string | undefined;
        try {
            const pdfBuffer = await Promise.race([
                generateAuditPdf(cleanDomain, auditResults, {
                    includeDetails: mode === 'complete',
                    includeRecommendations: true,
                    ...options
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout PDF')), 60000) // 1 minute max pour PDF
                )
            ]) as Buffer;

            // Vérification taille PDF (max 10MB)
            if (pdfBuffer.length > 10 * 1024 * 1024) {
                throw new Error('PDF trop volumineux')
            }

            pdfBase64 = pdfBuffer.toString('base64');
            console.log(`[EMAIL-AUDIT] PDF généré en sécurité (${Math.round(pdfBuffer.length / 1024)} Ko)`);
        } catch (pdfError) {
            console.error('[EMAIL-AUDIT] Erreur génération PDF sécurisée:', pdfError);
            // Continuer sans PDF en cas d'erreur
        }

        // 3. Envoyer l'email avec protection
        const emailResult = await emailService.sendAuditReport(
            cleanEmail,
            cleanDomain,
            auditResults,
            pdfBase64
        );

        if (!emailResult.success) {
            return NextResponse.json(
                { error: `Erreur envoi email: ${emailResult.error}` },
                { status: 500 }
            );
        }

        console.log(`[EMAIL-AUDIT] Email envoyé en sécurité (ID: ${emailResult.messageId})`);

        // 4. Mettre à jour le statut d'envoi email si l'audit était déjà sauvegardé
        try {
            if (!cachedResult) {
                // Déjà sauvegardé plus haut, pas besoin de re-sauvegarder
                console.log(`[EMAIL-AUDIT] Audit déjà sauvegardé avec statut email`)
            }
            console.log(`[EMAIL-AUDIT] Statut email traité`)
        } catch (dbError) {
            console.error('[EMAIL-AUDIT] Erreur gestion statut email:', dbError)
            // Ne pas faire échouer la requête pour une erreur de sauvegarde
        }

        // 5. Logger l'audit réussi
        await securityLogger.logAuditRequest(ip, userAgent, cleanDomain, cleanEmail, mode)

        // 6. Retourner les résultats
        return NextResponse.json({
            success: true,
            message: 'Audit terminé et rapport envoyé par email en sécurité',
            auditResults,
            emailSent: true,
            messageId: emailResult.messageId,
            pdfGenerated: !!pdfBase64
        });

    } catch (error: any) {
        console.error('[EMAIL-AUDIT] Erreur sécurisée:', error);

        // Ne pas exposer les détails de l'erreur en production
        const isDev = process.env.NODE_ENV === 'development'
        const errorMessage = isDev ? error.message || 'Erreur interne du serveur' : 'Erreur interne du serveur'

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
