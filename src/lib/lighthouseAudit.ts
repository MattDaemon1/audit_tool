// lib/lighthouseAudit.ts
import lighthouse from 'lighthouse'
import { launch } from 'puppeteer'
import { runSEOAudit, SEOAuditResult } from './seoAudit'

type AuditResult = {
    seo: number
    performance: number
    accessibility: number
    bestPractices: number
    seoDetails?: SEOAuditResult
}

export async function runLighthouseAudit(domain: string): Promise<AuditResult> {
    let browser

    try {
        browser = await launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--remote-debugging-port=9222',
            ],
        })

        const runnerResult = await lighthouse(`https://${domain}`, {
            port: 9222,
            output: 'json',
            logLevel: 'error', // Reduce logging to avoid issues
            onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices'],
            disableStorageReset: false,
        })

        if (!runnerResult?.lhr?.categories) {
            throw new Error('Lighthouse audit failed to return results')
        }

        // Run detailed SEO audit
        console.log('Running detailed SEO audit...')
        const seoDetails = await runSEOAudit(domain)

        return {
            seo: Math.round((runnerResult.lhr.categories.seo?.score || 0) * 100),
            performance: Math.round((runnerResult.lhr.categories.performance?.score || 0) * 100),
            accessibility: Math.round((runnerResult.lhr.categories.accessibility?.score || 0) * 100),
            bestPractices: Math.round((runnerResult.lhr.categories['best-practices']?.score || 0) * 100),
            seoDetails
        }
    } catch (error) {
        console.error('Lighthouse audit error:', error)
        throw new Error(`Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
        if (browser) {
            await browser.close()
        }
    }
}
