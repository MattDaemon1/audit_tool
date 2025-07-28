// lib/seoAuditCheerio.ts - Version légère avec Cheerio
import * as cheerio from 'cheerio'

export type SeoAuditResult = {
    title: string | null
    description: string | null
    h1: string[]
    canonical: string | null
    hasRobotsTxt: boolean
    hasSitemap: boolean
}

export async function runSeoAudit(domain: string): Promise<SeoAuditResult> {
    const url = `https://${domain}`
    let html: string

    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'SEO-Audit-Bot/1.0' },
            redirect: 'follow'
        })

        if (!res.ok) {
            // Pour les erreurs 404 ou autres, on retourne des données partielles
            // au lieu de faire échouer complètement l'audit
            console.warn(`[SEO-CHEERIO] Site inaccessible (${res.status}): ${url}`)
            return {
                title: null,
                description: null,
                h1: [],
                canonical: null,
                hasRobotsTxt: false,
                hasSitemap: false
            }
        }

        html = await res.text()
    } catch (error) {
        console.warn(`[SEO-CHEERIO] Erreur de connexion: ${url} - ${error}`)
        return {
            title: null,
            description: null,
            h1: [],
            canonical: null,
            hasRobotsTxt: false,
            hasSitemap: false
        }
    }

    const $ = cheerio.load(html)

    const title = $('title').first().text().trim() || null
    const description = $('meta[name="description"]').attr('content')?.trim() || null
    const h1 = $('h1').map((_, el) => $(el).text().trim()).get().filter(text => text.length > 0)
    const canonical = $('link[rel="canonical"]').attr('href') || null

    // Vérification de robots.txt et sitemap.xml
    const hasRobotsTxt = await checkUrlExists(`https://${domain}/robots.txt`)
    const hasSitemap = await checkUrlExists(`https://${domain}/sitemap.xml`)

    return { title, description, h1, canonical, hasRobotsTxt, hasSitemap }
}

async function checkUrlExists(url: string): Promise<boolean> {
    try {
        const res = await fetch(url, {
            method: 'HEAD',
            headers: { 'User-Agent': 'SEO-Audit-Bot/1.0' }
        })
        return res.ok
    } catch {
        return false
    }
}
