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
        console.log('Running Lighthouse audit...')

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

        const runnerResult = await lighthouse(`https://${domain}`, {
            port: 9222,
            output: 'json',
            logLevel: 'error',
            onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices'],
            disableStorageReset: false,
        })

        if (!runnerResult?.lhr?.categories) {
            throw new Error('Lighthouse audit failed to return results')
        }

        return {
            seo: Math.round((runnerResult.lhr.categories.seo?.score || 0) * 100),
            performance: Math.round((runnerResult.lhr.categories.performance?.score || 0) * 100),
            accessibility: Math.round((runnerResult.lhr.categories.accessibility?.score || 0) * 100),
            bestPractices: Math.round((runnerResult.lhr.categories['best-practices']?.score || 0) * 100),
        }
    } catch (error) {
        console.error('Lighthouse audit error:', error)

        // Retourner des valeurs par défaut plutôt que d'échouer complètement
        return {
            seo: 0,
            performance: 0,
            accessibility: 0,
            bestPractices: 0,
        }
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
