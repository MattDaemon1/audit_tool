import { prisma } from './database'
import { AuditResult } from './types'

export interface AuditData {
    domain: string
    email: string
    mode: 'fast' | 'complete'
    ipAddress?: string
    userAgent?: string
    requestId?: string
    results: AuditResult
    executionTime: number
    pdfGenerated: boolean
    emailSent: boolean
    emailMessageId?: string
}

export class AuditService {

    // Sauvegarder un audit complet
    static async saveAudit(data: AuditData) {
        try {
            const audit = await prisma.audit.create({
                data: {
                    domain: data.domain,
                    email: data.email,
                    mode: data.mode,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    requestId: data.requestId,

                    // Séparer les résultats par type pour faciliter les requêtes
                    lighthouseResults: data.results.lighthouse,
                    seoBasicResults: data.results.seoBasic,
                    securityResults: data.results.security,
                    rgpdResults: data.results.rgpd,
                    cookiesResults: data.results.cookies,
                    seoAdvancedResults: data.results.seoAdvanced,

                    executionTime: data.executionTime,
                    pdfGenerated: data.pdfGenerated,
                    emailSent: data.emailSent,
                    emailMessageId: data.emailMessageId,
                    status: 'completed'
                }
            })

            // Mettre à jour les statistiques
            await this.updateStatistics(data.mode, data.emailSent)

            // Mettre à jour les domaines populaires
            await this.updatePopularDomains(data.domain, data.results)

            return audit
        } catch (error) {
            console.error('Erreur sauvegarde audit:', error)
            throw error
        }
    }

    // Sauvegarder un audit en échec
    static async saveFailedAudit(data: Partial<AuditData> & { errorMessage: string }) {
        try {
            return await prisma.audit.create({
                data: {
                    domain: data.domain!,
                    email: data.email!,
                    mode: data.mode!,
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    requestId: data.requestId,
                    executionTime: data.executionTime || 0,
                    pdfGenerated: false,
                    emailSent: false,
                    status: 'failed',
                    errorMessage: data.errorMessage
                }
            })
        } catch (error) {
            console.error('Erreur sauvegarde audit échoué:', error)
            throw error
        }
    }

    // Récupérer l'historique des audits pour un domaine
    static async getAuditHistory(domain: string, limit: number = 10) {
        try {
            return await prisma.audit.findMany({
                where: {
                    domain: domain,
                    status: 'completed'
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit,
                select: {
                    id: true,
                    createdAt: true,
                    mode: true,
                    executionTime: true,
                    lighthouseResults: true,
                    status: true
                }
            })
        } catch (error) {
            console.error('Erreur récupération historique:', error)
            return []
        }
    }

    // Récupérer les audits récents par email
    static async getUserAudits(email: string, limit: number = 20) {
        try {
            return await prisma.audit.findMany({
                where: {
                    email: email,
                    status: 'completed'
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit,
                select: {
                    id: true,
                    domain: true,
                    createdAt: true,
                    mode: true,
                    executionTime: true,
                    lighthouseResults: true
                }
            })
        } catch (error) {
            console.error('Erreur récupération audits utilisateur:', error)
            return []
        }
    }

    // Mettre à jour les statistiques quotidiennes
    private static async updateStatistics(mode: string, emailSent: boolean) {
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            await prisma.statistics.upsert({
                where: {
                    date: today
                },
                update: {
                    totalAudits: { increment: 1 },
                    fastAudits: mode === 'fast' ? { increment: 1 } : undefined,
                    completeAudits: mode === 'complete' ? { increment: 1 } : undefined,
                    emailsSent: emailSent ? { increment: 1 } : undefined,
                    emailsFailed: !emailSent ? { increment: 1 } : undefined
                },
                create: {
                    date: today,
                    totalAudits: 1,
                    fastAudits: mode === 'fast' ? 1 : 0,
                    completeAudits: mode === 'complete' ? 1 : 0,
                    emailsSent: emailSent ? 1 : 0,
                    emailsFailed: !emailSent ? 1 : 0
                }
            })
        } catch (error) {
            console.error('Erreur mise à jour statistiques:', error)
            // Ne pas faire échouer l'audit pour un problème de stats
        }
    }

    // Mettre à jour les domaines populaires
    private static async updatePopularDomains(domain: string, results: AuditResult) {
        try {
            const lighthouse = results.lighthouse

            await prisma.popularDomain.upsert({
                where: {
                    domain: domain
                },
                update: {
                    auditCount: { increment: 1 },
                    lastAuditAt: new Date(),
                    avgPerformance: lighthouse.performance,
                    avgSeo: lighthouse.seo,
                    avgAccessibility: lighthouse.accessibility,
                    avgBestPractices: lighthouse.bestPractices
                },
                create: {
                    domain: domain,
                    auditCount: 1,
                    avgPerformance: lighthouse.performance,
                    avgSeo: lighthouse.seo,
                    avgAccessibility: lighthouse.accessibility,
                    avgBestPractices: lighthouse.bestPractices
                }
            })
        } catch (error) {
            console.error('Erreur mise à jour domaines populaires:', error)
            // Ne pas faire échouer l'audit pour un problème de stats
        }
    }

    // Récupérer les domaines les plus audités
    static async getPopularDomains(limit: number = 10) {
        try {
            return await prisma.popularDomain.findMany({
                orderBy: {
                    auditCount: 'desc'
                },
                take: limit
            })
        } catch (error) {
            console.error('Erreur récupération domaines populaires:', error)
            return []
        }
    }

    // Récupérer les statistiques globales
    static async getGlobalStatistics() {
        try {
            const stats = await prisma.statistics.aggregate({
                _sum: {
                    totalAudits: true,
                    fastAudits: true,
                    completeAudits: true,
                    emailsSent: true,
                    emailsFailed: true
                },
                _avg: {
                    avgExecutionTime: true
                }
            })

            return {
                totalAudits: stats._sum.totalAudits || 0,
                fastAudits: stats._sum.fastAudits || 0,
                completeAudits: stats._sum.completeAudits || 0,
                emailsSent: stats._sum.emailsSent || 0,
                emailsFailed: stats._sum.emailsFailed || 0,
                avgExecutionTime: stats._avg.avgExecutionTime || 0
            }
        } catch (error) {
            console.error('Erreur récupération statistiques globales:', error)
            return {
                totalAudits: 0,
                fastAudits: 0,
                completeAudits: 0,
                emailsSent: 0,
                emailsFailed: 0,
                avgExecutionTime: 0
            }
        }
    }

    // Nettoyer les anciens audits (plus de X jours)
    static async cleanupOldAudits(daysToKeep: number = 90) {
        try {
            const cutoffDate = new Date()
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

            const deleted = await prisma.audit.deleteMany({
                where: {
                    createdAt: {
                        lt: cutoffDate
                    }
                }
            })

            console.log(`Supprimé ${deleted.count} audits anciens`)
            return deleted.count
        } catch (error) {
            console.error('Erreur nettoyage audits anciens:', error)
            return 0
        }
    }
}

// Instance exportée pour faciliter l'utilisation
export const auditService = new AuditService()
