import { NextRequest, NextResponse } from 'next/server'
import { runHybridAudit, AuditMode } from '@/lib/auditOrchestrator'

// Force Node.js runtime for Lighthouse compatibility
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { domain, mode = 'fast' } = body

        if (!domain || typeof domain !== 'string') {
            return NextResponse.json({ error: 'Domaine manquant ou invalide' }, { status: 400 })
        }

        const isValid = /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)
        if (!isValid) {
            return NextResponse.json({ error: 'Format de domaine invalide' }, { status: 400 })
        }

        const auditMode: AuditMode = mode === 'complete' ? 'complete' : 'fast'
        console.log(`[API] Audit ${auditMode} de : ${domain}`)

        const results = await runHybridAudit(domain, auditMode)

        return NextResponse.json({
            success: true,
            ...results
        })
    } catch (error) {
        console.error('Erreur audit :', error)
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
