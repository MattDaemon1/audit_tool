// lib/auditOrchestrator.ts - Orchestrateur hybride
import { runLighthouseAudit } from './lighthouseAudit'
import { runSeoAudit as runCheerioSeoAudit } from './seoAuditCheerio'
import { runSEOAudit as runPuppeteerSeoAudit } from './seoAudit'

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
  seoAdvanced?: {
    htmlStructure: any
    technicalSEO: any
    content: any
    recommendations: string[]
  }
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

    let seoAdvanced = undefined

    // 3. SEO avancé avec Puppeteer (seulement en mode complet)
    if (mode === 'complete') {
      console.log(`[AUDIT] Démarrage audit SEO avancé (Puppeteer)`)
      const puppeteerStart = Date.now()
      try {
        seoAdvanced = await runPuppeteerSeoAudit(domain)
        console.log(`[AUDIT] SEO avancé terminé en ${Date.now() - puppeteerStart}ms`)
      } catch (error) {
        console.error(`[AUDIT] Erreur SEO avancé:`, error)
        // Continue sans l'audit avancé si ça échoue
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
      seoAdvanced,
      executionTime,
      mode
    }

  } catch (error) {
    console.error(`[AUDIT] Erreur audit hybride:`, error)
    throw new Error(`Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
