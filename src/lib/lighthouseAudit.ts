// lib/lighthouseAudit.ts
import lighthouse from 'lighthouse'
import { launch } from 'puppeteer'

type AuditResult = {
    seo: number
    performance: number
    accessibility: number
    bestPractices: number
}

export async function runLighthouseAudit(domain: string): Promise<AuditResult> {
    let browser

    try {
        console.log(`Running Lighthouse audit for domain: ${domain}`)

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

        console.log('Browser launched successfully')

        // Attendre que le navigateur soit prêt
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Effacer les performance marks précédents pour éviter les conflits
        try {
            if (typeof performance !== 'undefined') {
                performance.clearMarks()
                performance.clearMeasures()
            }
        } catch (e) {
            // Ignore les erreurs de performance marks
        }

        const targetUrl = `https://${domain}`
        console.log(`Running Lighthouse on URL: ${targetUrl}`)

        const runnerResult = await lighthouse(targetUrl, {
            port: 9222,
            output: 'json',
            logLevel: 'error',
            onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices'],
            disableStorageReset: false,
        })

        console.log('Lighthouse completed, checking results...')

        if (!runnerResult?.lhr?.categories) {
            console.error('Lighthouse results structure invalid:', {
                hasRunnerResult: !!runnerResult,
                hasLhr: !!runnerResult?.lhr,
                hasCategories: !!runnerResult?.lhr?.categories
            })
            throw new Error('Lighthouse audit failed to return results')
        }

        const categories = runnerResult.lhr.categories
        console.log('Lighthouse categories found:', Object.keys(categories))

        const results = {
            seo: Math.round((categories.seo?.score || 0) * 100),
            performance: Math.round((categories.performance?.score || 0) * 100),
            accessibility: Math.round((categories.accessibility?.score || 0) * 100),
            bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
        }

        console.log('Lighthouse audit results:', results)
        return results
    } catch (error) {
        console.error('Lighthouse audit error:', error)
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            domain: domain
        })

        // Pour le développement, on lance l'erreur pour voir le problème
        throw new Error(`Lighthouse audit failed for ${domain}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
        if (browser) {
            try {
                await browser.close()
            } catch (e) {
                console.error('Error closing browser:', e)
            }
        }
    }
}
