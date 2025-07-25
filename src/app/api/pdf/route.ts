import { NextRequest, NextResponse } from 'next/server';
import { generateAuditPdf } from '../../../lib/pdfGenerator';
import { runHybridAudit } from '../../../lib/auditOrchestrator';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { domain, mode = 'fast', options = {} } = body;

        if (!domain) {
            return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
        }

        console.log(`[PDF API] Génération PDF pour ${domain} en mode ${mode}`);

        // Exécuter l'audit
        const auditResults = await runHybridAudit(domain, mode);

        // Générer le PDF
        const pdfBuffer = await generateAuditPdf(domain, auditResults, {
            includeDetails: mode === 'complete',
            includeRecommendations: true,
            format: options.format || 'A4',
            ...options
        });

        // Retourner le PDF
        const response = new NextResponse(pdfBuffer);
        response.headers.set('Content-Type', 'application/pdf');
        response.headers.set('Content-Disposition', `attachment; filename="audit-${domain}-${Date.now()}.pdf"`);
        response.headers.set('Content-Length', pdfBuffer.length.toString());

        return response;

    } catch (error) {
        console.error('[PDF API] Erreur:', error);
        return NextResponse.json(
            { error: `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 500 }
        );
    }
}
