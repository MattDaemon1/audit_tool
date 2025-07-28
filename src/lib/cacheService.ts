import { prisma } from './database'
import { AuditResult } from './types'

export class CacheService {
    // TTL par défaut : 24 heures
    private static DEFAULT_TTL = 24 * 60 * 60 * 1000 // 24h en millisecondes

    // Récupérer un résultat du cache
    static async getCachedAudit(domain: string, mode: 'fast' | 'complete'): Promise<AuditResult | null> {
        try {
            // Nettoyer d'abord les entrées expirées
            await this.cleanExpiredCache()

            const cached = await prisma.auditCache.findUnique({
                where: {
                    domain_mode: {
                        domain: domain,
                        mode: mode
                    }
                }
            })

            if (!cached) {
                return null
            }

            // Vérifier l'expiration (sécurité supplémentaire)
            if (cached.expiresAt < new Date()) {
                await prisma.auditCache.delete({
                    where: { id: cached.id }
                })
                return null
            }

            console.log(`[CACHE] Hit pour ${domain} (${mode})`)
            return cached.results as AuditResult
        } catch (error) {
            console.error('Erreur récupération cache:', error)
            return null
        }
    }

    // Sauvegarder un résultat en cache
    static async setCachedAudit(domain: string, mode: 'fast' | 'complete', results: AuditResult, ttlMs?: number) {
        try {
            const expiresAt = new Date(Date.now() + (ttlMs || this.DEFAULT_TTL))

            await prisma.auditCache.upsert({
                where: {
                    domain_mode: {
                        domain: domain,
                        mode: mode
                    }
                },
                update: {
                    results: results as any,
                    expiresAt: expiresAt,
                    createdAt: new Date() // Mettre à jour la date de création
                },
                create: {
                    domain: domain,
                    mode: mode,
                    results: results as any,
                    expiresAt: expiresAt
                }
            })

            console.log(`[CACHE] Sauvegardé ${domain} (${mode}) - expire: ${expiresAt.toISOString()}`)
        } catch (error) {
            console.error('Erreur sauvegarde cache:', error)
            // Ne pas faire échouer l'audit pour un problème de cache
        }
    }

    // Invalider le cache pour un domaine
    static async invalidateCache(domain: string, mode?: 'fast' | 'complete') {
        try {
            if (mode) {
                // Invalider un mode spécifique
                await prisma.auditCache.delete({
                    where: {
                        domain_mode: {
                            domain: domain,
                            mode: mode
                        }
                    }
                })
                console.log(`[CACHE] Invalidé ${domain} (${mode})`)
            } else {
                // Invalider tous les modes pour ce domaine
                const deleted = await prisma.auditCache.deleteMany({
                    where: {
                        domain: domain
                    }
                })
                console.log(`[CACHE] Invalidé ${deleted.count} entrées pour ${domain}`)
            }
        } catch (error) {
            console.error('Erreur invalidation cache:', error)
        }
    }

    // Nettoyer les entrées expirées
    static async cleanExpiredCache() {
        try {
            const deleted = await prisma.auditCache.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date()
                    }
                }
            })

            if (deleted.count > 0) {
                console.log(`[CACHE] Nettoyé ${deleted.count} entrées expirées`)
            }

            return deleted.count
        } catch (error) {
            console.error('Erreur nettoyage cache:', error)
            return 0
        }
    }

    // Obtenir les statistiques du cache
    static async getCacheStatistics() {
        try {
            const total = await prisma.auditCache.count()
            const expired = await prisma.auditCache.count({
                where: {
                    expiresAt: {
                        lt: new Date()
                    }
                }
            })

            const byMode = await prisma.auditCache.groupBy({
                by: ['mode'],
                _count: {
                    mode: true
                }
            })

            return {
                total,
                active: total - expired,
                expired,
                byMode: byMode.reduce((acc: Record<string, number>, item: any) => {
                    acc[item.mode] = item._count.mode
                    return acc
                }, {} as Record<string, number>)
            }
        } catch (error) {
            console.error('Erreur statistiques cache:', error)
            return {
                total: 0,
                active: 0,
                expired: 0,
                byMode: {}
            }
        }
    }

    // Vider complètement le cache (admin)
    static async clearAllCache() {
        try {
            const deleted = await prisma.auditCache.deleteMany({})
            console.log(`[CACHE] Vidé complètement - ${deleted.count} entrées supprimées`)
            return deleted.count
        } catch (error) {
            console.error('Erreur vidage cache:', error)
            return 0
        }
    }

    // Récupérer les domaines les plus mis en cache
    static async getMostCachedDomains(limit: number = 10) {
        try {
            const domains = await prisma.auditCache.groupBy({
                by: ['domain'],
                _count: {
                    domain: true
                },
                orderBy: {
                    _count: {
                        domain: 'desc'
                    }
                },
                take: limit
            })

            return domains.map((d: any) => ({
                domain: d.domain,
                count: d._count.domain
            }))
        } catch (error) {
            console.error('Erreur domaines les plus cachés:', error)
            return []
        }
    }
}

// Instance exportée pour faciliter l'utilisation
export const cacheService = new CacheService()
