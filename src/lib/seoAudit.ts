// lib/seoAudit.ts
import { launch } from 'puppeteer'

export interface SEOAuditResult {
    htmlStructure: {
        hasTitle: boolean
        titleLength: number
        hasMetaDescription: boolean
        metaDescriptionLength: number
        hasH1: boolean
        h1Count: number
        hasCanonical: boolean
        hasOpenGraph: boolean
        hasTwitterCard: boolean
        hasViewport: boolean
        hasLang: boolean
        hasSchemaMarkup: boolean
    }
    technicalSEO: {
        robotsTxtExists: boolean
        robotsTxtAccessible: boolean
        sitemapExists: boolean
        sitemapAccessible: boolean
        httpsEnabled: boolean
        hasRedirect: boolean
        responseTime: number
    }
    content: {
        imageCount: number
        imagesWithoutAlt: number
        internalLinks: number
        externalLinks: number
        textLength: number
        headingsStructure: {
            h1: number
            h2: number
            h3: number
            h4: number
            h5: number
            h6: number
        }
    }
    recommendations: string[]
}

export async function runSEOAudit(domain: string): Promise<SEOAuditResult> {
    let browser
    const url = `https://${domain}`
    const recommendations: string[] = []

    try {
        browser = await launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
            ],
        })

        const page = await browser.newPage()

        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')

        const startTime = Date.now()
        const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
        const responseTime = Date.now() - startTime

        if (!response) {
            throw new Error('Failed to load page')
        }

        // Analyze HTML structure
        const htmlStructure = await page.evaluate(() => {
            const title = document.querySelector('title')
            const metaDescription = document.querySelector('meta[name="description"]')
            const h1Elements = document.querySelectorAll('h1')
            const canonical = document.querySelector('link[rel="canonical"]')
            const ogTitle = document.querySelector('meta[property="og:title"]')
            const twitterCard = document.querySelector('meta[name="twitter:card"]')
            const viewport = document.querySelector('meta[name="viewport"]')
            const htmlLang = document.documentElement.getAttribute('lang')
            const jsonLd = document.querySelectorAll('script[type="application/ld+json"]')

            return {
                hasTitle: !!title?.textContent?.trim(),
                titleLength: title?.textContent?.trim()?.length || 0,
                hasMetaDescription: !!metaDescription?.getAttribute('content')?.trim(),
                metaDescriptionLength: metaDescription?.getAttribute('content')?.trim()?.length || 0,
                hasH1: h1Elements.length > 0,
                h1Count: h1Elements.length,
                hasCanonical: !!canonical,
                hasOpenGraph: !!ogTitle,
                hasTwitterCard: !!twitterCard,
                hasViewport: !!viewport,
                hasLang: !!htmlLang,
                hasSchemaMarkup: jsonLd.length > 0
            }
        })

        // Analyze content
        const content = await page.evaluate(() => {
            const images = document.querySelectorAll('img')
            const imagesWithoutAlt = Array.from(images).filter(img => !img.getAttribute('alt')?.trim())
            const internalLinks = document.querySelectorAll('a[href^="/"], a[href*="' + window.location.hostname + '"]')
            const externalLinks = document.querySelectorAll('a[href^="http"]:not([href*="' + window.location.hostname + '"])')
            const textContent = document.body.textContent || ''

            const headings = {
                h1: document.querySelectorAll('h1').length,
                h2: document.querySelectorAll('h2').length,
                h3: document.querySelectorAll('h3').length,
                h4: document.querySelectorAll('h4').length,
                h5: document.querySelectorAll('h5').length,
                h6: document.querySelectorAll('h6').length,
            }

            return {
                imageCount: images.length,
                imagesWithoutAlt: imagesWithoutAlt.length,
                internalLinks: internalLinks.length,
                externalLinks: externalLinks.length,
                textLength: textContent.trim().length,
                headingsStructure: headings
            }
        })

        // Check technical SEO elements
        const robotsTxtUrl = `https://${domain}/robots.txt`
        const sitemapUrl = `https://${domain}/sitemap.xml`

        let robotsTxtExists = false
        let robotsTxtAccessible = false
        let sitemapExists = false
        let sitemapAccessible = false

        try {
            const robotsResponse = await page.goto(robotsTxtUrl, { timeout: 10000 })
            robotsTxtExists = robotsResponse?.status() === 200
            robotsTxtAccessible = robotsTxtExists
        } catch (error) {
            robotsTxtExists = false
            robotsTxtAccessible = false
        }

        try {
            const sitemapResponse = await page.goto(sitemapUrl, { timeout: 10000 })
            sitemapExists = sitemapResponse?.status() === 200
            sitemapAccessible = sitemapExists
        } catch (error) {
            sitemapExists = false
            sitemapAccessible = false
        }

        const technicalSEO = {
            robotsTxtExists,
            robotsTxtAccessible,
            sitemapExists,
            sitemapAccessible,
            httpsEnabled: response.url().startsWith('https://'),
            hasRedirect: response.url() !== url,
            responseTime
        }

        // Generate recommendations
        if (!htmlStructure.hasTitle) {
            recommendations.push('Ajouter une balise <title> à la page')
        } else if (htmlStructure.titleLength < 30 || htmlStructure.titleLength > 60) {
            recommendations.push('Optimiser la longueur du titre (30-60 caractères recommandés)')
        }

        if (!htmlStructure.hasMetaDescription) {
            recommendations.push('Ajouter une meta description')
        } else if (htmlStructure.metaDescriptionLength < 120 || htmlStructure.metaDescriptionLength > 160) {
            recommendations.push('Optimiser la longueur de la meta description (120-160 caractères)')
        }

        if (!htmlStructure.hasH1) {
            recommendations.push('Ajouter une balise H1 principale')
        } else if (htmlStructure.h1Count > 1) {
            recommendations.push('Utiliser une seule balise H1 par page')
        }

        if (!htmlStructure.hasCanonical) {
            recommendations.push('Ajouter une URL canonique')
        }

        if (!htmlStructure.hasOpenGraph) {
            recommendations.push('Ajouter les balises Open Graph pour les réseaux sociaux')
        }

        if (!htmlStructure.hasViewport) {
            recommendations.push('Ajouter une balise viewport pour le responsive design')
        }

        if (!htmlStructure.hasLang) {
            recommendations.push('Définir la langue de la page avec l\'attribut lang')
        }

        if (!htmlStructure.hasSchemaMarkup) {
            recommendations.push('Ajouter des données structurées (Schema.org)')
        }

        if (!technicalSEO.robotsTxtExists) {
            recommendations.push('Créer un fichier robots.txt')
        }

        if (!technicalSEO.sitemapExists) {
            recommendations.push('Créer un sitemap XML')
        }

        if (!technicalSEO.httpsEnabled) {
            recommendations.push('Activer HTTPS pour sécuriser le site')
        }

        if (content.imagesWithoutAlt > 0) {
            recommendations.push(`Ajouter des attributs alt à ${content.imagesWithoutAlt} image(s)`)
        }

        if (technicalSEO.responseTime > 3000) {
            recommendations.push('Améliorer le temps de réponse du serveur (>3s)')
        }

        if (content.textLength < 300) {
            recommendations.push('Augmenter le contenu textuel de la page (minimum 300 mots recommandés)')
        }

        return {
            htmlStructure,
            technicalSEO,
            content,
            recommendations
        }

    } catch (error) {
        console.error('SEO audit error:', error)
        throw new Error(`SEO audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
        if (browser) {
            await browser.close()
        }
    }
}
