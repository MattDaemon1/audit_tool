import { NextRequest, NextResponse } from 'next/server'
import { runLighthouseAudit } from '@/lib/lighthouseAudit'

// Force Node.js runtime for Lighthouse compatibility
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { domain } = body

        if (!domain || typeof domain !== 'string') {
            return NextResponse.json({ error: 'Domaine manquant ou invalide' }, { status: 400 })
        }

        const isValid = /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)
        if (!isValid) {
            return NextResponse.json({ error: 'Format de domaine invalide' }, { status: 400 })
        }

        console.log(`[API] Audit de : ${domain}`)

        const results = await runLighthouseAudit(domain)

        return NextResponse.json({ success: true, scores: results })
    } catch (error) {
        console.error('Erreur audit :', error)
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
