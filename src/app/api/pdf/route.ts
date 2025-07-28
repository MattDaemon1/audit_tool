import { NextRequest, NextResponse } from 'next/server';
import { generateAuditPdf } from '../../../lib/pdfGenerator';
import { runHybridAudit } from '../../../lib/auditOrchestrator';
import { securityLogger } from '@/lib/securityLogger';
import { AuditService } from '@/lib/auditService';
import { CacheService } from '@/lib/cacheService';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || undefined

    try {
        const body = await req.json();
        const { domain, mode = 'fast', options = {} } = body;
        const requestId = uuidv4()

        if (!domain) {
            await securityLogger.logSuspiciousActivity(ip, userAgent, 'Tentative génération PDF sans domaine')
            return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
        }

        await securityLogger.logAuditRequest(ip, userAgent, domain, 'pdf-generation', mode)
        console.log(`[PDF API] Génération PDF pour ${domain} en mode ${mode} [ID: ${requestId}]`);

        // Vérifier le cache d'abord
        const cachedResult = await CacheService.getCachedAudit(domain, mode)
        let auditResults: any

        if (cachedResult) {
            console.log(`[PDF API] Utilisation du cache pour ${domain} (${mode})`)
            auditResults = cachedResult
        } else {
            // Exécuter l'audit
            auditResults = await runHybridAudit(domain, mode);

            // Sauvegarder en base et cache
            try {
                await AuditService.saveAudit({
                    domain,
                    email: '',
                    mode,
                    ipAddress: ip,
                    userAgent,
                    requestId,
                    results: auditResults,
                    executionTime: auditResults.executionTime || 0,
                    pdfGenerated: true,
                    emailSent: false
                })

                await CacheService.setCachedAudit(domain, mode, auditResults)
            } catch (error) {
                await securityLogger.logSuspiciousActivity(ip, userAgent, `Erreur sauvegarde audit PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
                // Continue même si la sauvegarde échoue
            }
        }

        // Générer le PDF
        const pdfBuffer = await generateAuditPdf(domain, auditResults, {
            includeDetails: mode === 'complete',
            includeRecommendations: true,
            format: options.format || 'A4',
            ...options
        });

        // Retourner le PDF
        const response = new NextResponse(pdfBuffer);
        response.headers.set('Content-Type', 'application/pdf');
        response.headers.set('Content-Disposition', `attachment; filename="audit-${domain}-${Date.now()}.pdf"`);
        response.headers.set('Content-Length', pdfBuffer.length.toString());

        return response;

    } catch (error) {
        console.error('[PDF API] Erreur:', error);
        await securityLogger.logSecurityError(ip, userAgent, error instanceof Error ? error.message : 'Erreur génération PDF')
        return NextResponse.json(
            { error: `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 500 }
        );
    }
}
