// lib/auditOrchestrator.ts - Orchestrateur hybride
import { runLighthouseAudit } from './lighthouseAudit'
import { runSeoAudit as runCheerioSeoAudit } from './seoAuditCheerio'
import { runSEOAudit as runPuppeteerSeoAudit } from './seoAudit'
import { performBasicSecurityAudit, performAdvancedRgpdSecurityAudit } from './rgpdSecurityAudit'

export type AuditMode = 'fast' | 'complete'

export interface HybridAuditResult {
    lighthouse: {
        seo: number
        performance: number
        accessibility: number
        bestPractices: number
    }
    seoBasic: {
        title: string | null
        description: string | null
        h1: string[]
        canonical: string | null
        hasRobotsTxt: boolean
        hasSitemap: boolean
    }
    security?: {
        https: boolean
        headers: {
            contentSecurityPolicy: boolean
            strictTransportSecurity: boolean
            xFrameOptions: boolean
            xContentTypeOptions: boolean
            referrerPolicy: boolean
            permissionsPolicy: boolean
        }
        headerScore: number
    }
    rgpd?: {
        hasCookieBanner: boolean
        hasPrivacyPolicy: boolean
        hasTermsOfService: boolean
        cookieConsentDetected: boolean
    }
    cookies?: {
        total: number
        thirdParty: number
        hasSecureFlags: number
        details: Array<{
            name: string
            domain: string
            httpOnly: boolean
            secure: boolean
            sameSite: string | undefined
            isThirdParty: boolean
        }>
    }
    seoAdvanced?: {
        htmlStructure: any
        technicalSEO: any
        content: any
        recommendations: string[]
    }
    securityRecommendations?: string[]
    executionTime: number
    mode: AuditMode
}

export async function runHybridAudit(domain: string, mode: AuditMode = 'fast'): Promise<HybridAuditResult> {
    const startTime = Date.now()

    try {
        // 1. Lighthouse audit (toujours exécuté)
        console.log(`[AUDIT] Démarrage audit Lighthouse pour ${domain}`)
        const lighthouseStart = Date.now()
        const lighthouseResult = await runLighthouseAudit(domain)
        console.log(`[AUDIT] Lighthouse terminé en ${Date.now() - lighthouseStart}ms`)

        // 2. SEO de base avec Cheerio (rapide)
        console.log(`[AUDIT] Démarrage audit SEO de base (Cheerio)`)
        const cheerioStart = Date.now()
        const seoBasic = await runCheerioSeoAudit(domain)
        console.log(`[AUDIT] SEO de base terminé en ${Date.now() - cheerioStart}ms`)

        // 3. Audit sécurité de base (mode rapide)
        console.log(`[AUDIT] Démarrage audit sécurité de base`)
        const securityStart = Date.now()
        const basicSecurity = await performBasicSecurityAudit(domain)
        console.log(`[AUDIT] Sécurité de base terminé en ${Date.now() - securityStart}ms`)

        let seoAdvanced = undefined
        let rgpdData = undefined
        let cookiesData = undefined
        let securityRecommendations = basicSecurity.recommendations || []

        // 4. Audits avancés (seulement en mode complet)
        if (mode === 'complete') {
            // SEO avancé avec Puppeteer
            console.log(`[AUDIT] Démarrage audit SEO avancé (Puppeteer)`)
            const puppeteerStart = Date.now()
            try {
                seoAdvanced = await runPuppeteerSeoAudit(domain)
                console.log(`[AUDIT] SEO avancé terminé en ${Date.now() - puppeteerStart}ms`)
            } catch (error) {
                console.error(`[AUDIT] Erreur SEO avancé:`, error)
                // Continue sans l'audit avancé si ça échoue
            }

            // RGPD & Sécurité avancés
            console.log(`[AUDIT] Démarrage audit RGPD & Sécurité avancé`)
            const rgpdStart = Date.now()
            try {
                const rgpdSecurityResult = await performAdvancedRgpdSecurityAudit(domain)
                rgpdData = rgpdSecurityResult.rgpd
                cookiesData = rgpdSecurityResult.cookies
                securityRecommendations = [...securityRecommendations, ...rgpdSecurityResult.recommendations]
                console.log(`[AUDIT] RGPD & Sécurité avancé terminé en ${Date.now() - rgpdStart}ms`)
            } catch (error) {
                console.error(`[AUDIT] Erreur RGPD & Sécurité:`, error)
                // Continue avec les données de base seulement
            }
        }

        const executionTime = Date.now() - startTime

        return {
            lighthouse: {
                seo: lighthouseResult.seo,
                performance: lighthouseResult.performance,
                accessibility: lighthouseResult.accessibility,
                bestPractices: lighthouseResult.bestPractices
            },
            seoBasic,
            security: basicSecurity.security,
            rgpd: rgpdData,
            cookies: cookiesData,
            seoAdvanced,
            securityRecommendations,
            executionTime,
            mode
        }

    } catch (error) {
        console.error(`[AUDIT] Erreur audit hybride:`, error)
        throw new Error(`Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}
