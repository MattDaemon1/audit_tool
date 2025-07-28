import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/auditService'
import { CacheService } from '@/lib/cacheService'
import { securityLogger } from '@/lib/securityLogger'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    try {
        // Protection basique - en production, ajouter une authentification
        const auth = request.headers.get('authorization')
        if (!auth || auth !== 'Bearer admin-demo-token') {
            await securityLogger.logSuspiciousActivity(ip, userAgent, 'Tentative accès admin sans authentification')
            return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
        }

        await securityLogger.logAuditRequest(ip, userAgent, 'admin', 'stats-access', 'admin')

        // Récupérer les statistiques
        const [
            auditStats,
            cacheStats,
            securityStats,
            popularDomains
        ] = await Promise.all([
            AuditService.getGlobalStatistics(),
            CacheService.getCacheStatistics(),
            securityLogger.getSecurityStatistics(),
            AuditService.getPopularDomains(10)
        ])

        return NextResponse.json({
            success: true,
            data: {
                audits: auditStats,
                cache: cacheStats,
                security: securityStats,
                popularDomains
            },
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('Erreur récupération stats admin:', error)
        await securityLogger.logSecurityError(ip, userAgent, error instanceof Error ? error.message : 'Erreur stats admin')

        return NextResponse.json({
            error: 'Erreur serveur lors de la récupération des statistiques'
        }, { status: 500 })
    }
}
