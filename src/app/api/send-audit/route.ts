import { NextRequest, NextResponse } from 'next/server';
import { runHybridAudit } from '@/lib/auditOrchestrator';
import { generateAuditPdf } from '@/lib/pdfGenerator';
import { emailService } from '@/lib/emailService';

export async function POST(request: NextRequest) {
    try {
        const { domain, email, mode = 'fast', options = {} } = await request.json();

        // Validation des données
        if (!domain || !email) {
            return NextResponse.json(
                { error: 'Domain et email sont requis' },
                { status: 400 }
            );
        }

        // Validation de l'email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Format d\'email invalide' },
                { status: 400 }
            );
        }

        // Validation du domaine
        const domainRegex = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}$/;
        if (!domainRegex.test(domain)) {
            return NextResponse.json(
                { error: 'Format de domaine invalide' },
                { status: 400 }
            );
        }

        console.log(`[EMAIL-AUDIT] Démarrage audit + envoi email pour ${domain} (${email})`);

        // 1. Exécuter l'audit
        const auditResults = await runHybridAudit(domain, mode);
        console.log(`[EMAIL-AUDIT] Audit terminé en ${Math.round(auditResults.executionTime / 1000)}s`);

        // 2. Générer le PDF
        let pdfBase64: string | undefined;
        try {
            const pdfBuffer = await generateAuditPdf(domain, auditResults, {
                includeDetails: mode === 'complete',
                includeRecommendations: true,
                ...options
            });
            pdfBase64 = pdfBuffer.toString('base64');
            console.log(`[EMAIL-AUDIT] PDF généré (${Math.round(pdfBuffer.length / 1024)} Ko)`);
        } catch (pdfError) {
            console.error('[EMAIL-AUDIT] Erreur génération PDF:', pdfError);
            // Continuer sans PDF en cas d'erreur
        }

        // 3. Envoyer l'email
        const emailResult = await emailService.sendAuditReport(
            email,
            domain,
            auditResults,
            pdfBase64
        );

        if (!emailResult.success) {
            return NextResponse.json(
                { error: `Erreur envoi email: ${emailResult.error}` },
                { status: 500 }
            );
        }

        console.log(`[EMAIL-AUDIT] Email envoyé avec succès (ID: ${emailResult.messageId})`);

        // 4. Retourner les résultats
        return NextResponse.json({
            success: true,
            message: 'Audit terminé et rapport envoyé par email',
            auditResults,
            emailSent: true,
            messageId: emailResult.messageId,
            pdfGenerated: !!pdfBase64
        });

    } catch (error: any) {
        console.error('[EMAIL-AUDIT] Erreur:', error);
        return NextResponse.json(
            { error: error.message || 'Erreur interne du serveur' },
            { status: 500 }
        );
    }
}
