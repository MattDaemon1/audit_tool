import { NextRequest, NextResponse } from 'next/server'
import { runHybridAudit, AuditMode } from '@/lib/auditOrchestrator'
import { securityLogger } from '@/lib/securityLogger'
import { AuditService } from '@/lib/auditService'
import { CacheService } from '@/lib/cacheService'
import { v4 as uuidv4 } from 'uuid'

// Force Node.js runtime for Lighthouse compatibility
export const runtime = 'nodejs'

// Rate limiting simple (en mémoire - pour la production, utiliser Redis)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX = 5 // 5 requêtes par minute par IP

function checkRateLimit(ip: string): boolean {
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
    // Nettoyage et validation stricte
    const cleanDomain = domain.trim().toLowerCase()

    // Protection contre les injections
    if (cleanDomain.includes('<') || cleanDomain.includes('>') ||
        cleanDomain.includes('"') || cleanDomain.includes("'") ||
        cleanDomain.includes('javascript:') || cleanDomain.includes('data:') ||
        cleanDomain.includes('file:') || cleanDomain.includes('ftp:')) {
        return false
    }

    // Validation format domaine
    const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/
    if (!domainRegex.test(cleanDomain)) return false

    // Protection contre les domaines locaux/privés
    const blockedDomains = [
        'localhost', '127.0.0.1', '0.0.0.0', '::1',
        '10.', '192.168.', '172.16.', '172.17.', '172.18.',
        '172.19.', '172.20.', '172.21.', '172.22.', '172.23.',
        '172.24.', '172.25.', '172.26.', '172.27.', '172.28.',
        '172.29.', '172.30.', '172.31.'
    ]

    if (blockedDomains.some(blocked => cleanDomain.includes(blocked))) {
        return false
    }

    // Limite de longueur
    return cleanDomain.length <= 253
}

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || undefined

    try {
        // Protection CSRF basique
        const xRequestedWith = req.headers.get('x-requested-with')
        if (xRequestedWith !== 'XMLHttpRequest') {
            securityLogger.logSuspiciousActivity(ip, userAgent, 'Tentative de requête sans header CSRF')
            return NextResponse.json({ error: 'Requête non autorisée' }, { status: 403 })
        }

        // Rate limiting
        if (!checkRateLimit(ip)) {
            securityLogger.logRateLimitExceeded(ip, userAgent, '/api/audit')
            return NextResponse.json({
                error: 'Trop de requêtes. Veuillez attendre avant de réessayer.'
            }, { status: 429 })
        }

        const body = await req.json()
        const { domain, mode = 'fast', timestamp } = body

        // Validation de base
        if (!domain || typeof domain !== 'string') {
            securityLogger.logSuspiciousActivity(ip, userAgent, 'Domaine manquant ou invalide')
            return NextResponse.json({ error: 'Domaine manquant ou invalide' }, { status: 400 })
        }

        // Validation timestamp (protection anti-replay basique)
        if (!timestamp || typeof timestamp !== 'number') {
            securityLogger.logSuspiciousActivity(ip, userAgent, 'Timestamp manquant dans la requête')
            return NextResponse.json({ error: 'Timestamp manquant' }, { status: 400 })
        }

        const now = Date.now()
        if (Math.abs(now - timestamp) > 300000) { // 5 minutes max
            securityLogger.logSuspiciousActivity(ip, userAgent, 'Timestamp expiré ou futuriste')
            return NextResponse.json({ error: 'Requête expirée' }, { status: 400 })
        }

        // Validation stricte du domaine
        if (!validateDomain(domain)) {
            securityLogger.logSuspiciousActivity(ip, userAgent, `Domaine potentiellement dangereux: ${domain}`)
            return NextResponse.json({
                error: 'Domaine invalide ou potentiellement dangereux'
            }, { status: 400 })
        }

        // Validation du mode
        if (!['fast', 'complete'].includes(mode)) {
            securityLogger.logSuspiciousActivity(ip, userAgent, `Mode d'audit invalide: ${mode}`)
            return NextResponse.json({ error: 'Mode d\'audit invalide' }, { status: 400 })
        }

        const auditMode: AuditMode = mode === 'complete' ? 'complete' : 'fast'
        const requestId = uuidv4()

        // Log de l'audit légitime
        await securityLogger.logAuditRequest(ip, userAgent, domain, 'direct-api', auditMode)
        console.log(`[API] Audit ${auditMode} sécurisé de : ${domain} (IP: ${ip}) [ID: ${requestId}]`)

        // Vérifier le cache d'abord
        const cachedResult = await CacheService.getCachedAudit(domain, auditMode)
        let results: any

        if (cachedResult) {
            console.log(`[API] Utilisation du cache pour ${domain} (${auditMode})`)
            results = cachedResult
            await securityLogger.logAuditRequest(ip, userAgent, domain, 'direct-api-cached', auditMode)
        } else {
            // Exécuter l'audit
            results = await runHybridAudit(domain, auditMode)
            console.log(`[API] Audit terminé en ${Math.round((results.executionTime || 0) / 1000)}s`)

            // Sauvegarder en base et cache
            try {
                await AuditService.saveAudit({
                    domain,
                    email: '',
                    mode: auditMode,
                    ipAddress: ip,
                    userAgent,
                    requestId,
                    results,
                    executionTime: results.executionTime || 0,
                    pdfGenerated: false,
                    emailSent: false
                })

                await CacheService.setCachedAudit(domain, auditMode, results)

                await securityLogger.logAuditRequest(ip, userAgent, domain, 'direct-api-new', auditMode)
            } catch (error) {
                await securityLogger.logSuspiciousActivity(ip, userAgent, `Erreur sauvegarde audit: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
                // Continue même si la sauvegarde échoue
            }
        }

        return NextResponse.json({
            success: true,
            ...results
        })
    } catch (error) {
        console.error('Erreur audit sécurisé :', error)
        securityLogger.logSecurityError(ip, userAgent, error instanceof Error ? error.message : 'Erreur inconnue')

        // Ne pas exposer les détails de l'erreur en production
        const isDev = process.env.NODE_ENV === 'development'
        const errorMessage = isDev && error instanceof Error ? error.message : 'Erreur serveur'

        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
