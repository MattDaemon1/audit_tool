import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/auditService'
import { CacheService } from '@/lib/cacheService'
import { securityLogger } from '@/lib/securityLogger'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    try {
        // Protection basique - en production, utiliser une authentification forte
        const auth = request.headers.get('authorization')
        if (!auth || auth !== 'Bearer admin-demo-token') {
            await securityLogger.logSuspiciousActivity(ip, userAgent, 'Tentative accès admin cleanup sans authentification')
            return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
        }

        const body = await request.json()
        const {
            cleanOldAudits = true,
            cleanExpiredCache = true,
            daysOld = 30
        } = body

        await securityLogger.logAuditRequest(ip, userAgent, 'admin', 'cleanup-start', 'admin')

        const results = {
            auditsDeleted: 0,
            cacheEntriesDeleted: 0,
            errors: [] as string[]
        }

        // Nettoyer les anciens audits
        if (cleanOldAudits) {
            try {
                results.auditsDeleted = await AuditService.cleanOldAudits(daysOld)
                console.log(`[CLEANUP] ${results.auditsDeleted} anciens audits supprimés`)
            } catch (error) {
                const errorMsg = `Erreur nettoyage audits: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
                results.errors.push(errorMsg)
                await securityLogger.logSecurityError(ip, userAgent, errorMsg)
            }
        }

        // Nettoyer le cache expiré
        if (cleanExpiredCache) {
            try {
                results.cacheEntriesDeleted = await CacheService.cleanExpiredCache()
                console.log(`[CLEANUP] ${results.cacheEntriesDeleted} entrées de cache supprimées`)
            } catch (error) {
                const errorMsg = `Erreur nettoyage cache: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
                results.errors.push(errorMsg)
                await securityLogger.logSecurityError(ip, userAgent, errorMsg)
            }
        }

        await securityLogger.logAuditRequest(ip, userAgent, 'admin', 'cleanup-complete', 'admin')

        return NextResponse.json({
            success: true,
            message: 'Nettoyage terminé',
            results,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('Erreur nettoyage admin:', error)
        await securityLogger.logSecurityError(ip, userAgent, error instanceof Error ? error.message : 'Erreur cleanup admin')

        return NextResponse.json({
            error: 'Erreur serveur lors du nettoyage'
        }, { status: 500 })
    }
}
