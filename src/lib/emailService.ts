export interface EmailData {
    to: string;
    subject: string;
    htmlContent: string;
    attachments?: Array<{
        name: string;
        content: string; // base64 encoded
    }>;
}

export class EmailService {
    private apiKey: string;

    constructor() {
        if (!process.env.BREVO_API_KEY) {
            throw new Error('BREVO_API_KEY is required');
        }
        this.apiKey = process.env.BREVO_API_KEY;
    }

    async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            const payload = {
                to: [{ email: emailData.to }],
                sender: {
                    email: process.env.FROM_EMAIL || 'info@mattkonnect.com',
                    name: process.env.FROM_NAME || 'Konnect Insights by Matt Konnect'
                },
                subject: emailData.subject,
                htmlContent: emailData.htmlContent,
                ...(emailData.attachments && emailData.attachments.length > 0 && {
                    attachment: emailData.attachments.map(att => ({
                        name: att.name,
                        content: att.content
                    }))
                })
            };

            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'api-key': this.apiKey
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Brevo API Error: ${errorData.message || response.statusText}`);
            }

            const result = await response.json();

            return {
                success: true,
                messageId: result.messageId || 'unknown'
            };
        } catch (error: any) {
            console.error('Erreur envoi email:', error);
            return {
                success: false,
                error: error.message || 'Erreur inconnue lors de l\'envoi'
            };
        }
    } async sendAuditReport(
        email: string,
        domain: string,
        auditResults: any,
        pdfBase64?: string
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const subject = `🔍 Votre audit SEO pour ${domain} est prêt !`;
        const htmlContent = this.generateAuditEmailTemplate(domain, auditResults);

        const emailData: EmailData = {
            to: email,
            subject,
            htmlContent
        };

        // Ajouter le PDF en pièce jointe si fourni
        if (pdfBase64) {
            emailData.attachments = [{
                name: `audit-${domain}-${new Date().toISOString().split('T')[0]}.pdf`,
                content: pdfBase64
            }];
        }

        return this.sendEmail(emailData);
    }

    private generateAuditEmailTemplate(domain: string, results: any): string {
        const getScoreColor = (score: number) => {
            if (score >= 80) return '#10B981'; // green
            if (score >= 60) return '#F59E0B'; // yellow
            return '#EF4444'; // red
        };

        const getScoreEmoji = (score: number) => {
            if (score >= 80) return '🟢';
            if (score >= 60) return '🟡';
            return '🔴';
        };

        return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audit SEO - ${domain}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f9fafb; }
        .container { background: white; margin: 20px; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .content { padding: 30px; }
        .score-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .score-card { background: #f8fafc; border-radius: 8px; padding: 15px; text-align: center; border-left: 4px solid #e5e7eb; }
        .score-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .score-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
        .cta-section { background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .cta-button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 5px; transition: background 0.3s; }
        .cta-button:hover { background: #4338ca; }
        .cta-secondary { background: #10b981; }
        .cta-tertiary { background: #f59e0b; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 4px; }
        .alert { background: #fee2e2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 15px 0; }
        .alert-title { font-weight: 600; color: #dc2626; margin-bottom: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔍 Konnect Insights</div>
            <h1>Votre audit SEO est prêt !</h1>
            <p>Analyse complète de <strong>${domain}</strong></p>
        </div>
        
        <div class="content">
            <h2>📊 Résultats de l'audit</h2>
            
            <div class="score-grid">
                <div class="score-card" style="border-left-color: ${getScoreColor(results.lighthouse.performance)};">
                    <div class="score-value" style="color: ${getScoreColor(results.lighthouse.performance)};">
                        ${getScoreEmoji(results.lighthouse.performance)} ${results.lighthouse.performance}
                    </div>
                    <div class="score-label">Performance</div>
                </div>
                <div class="score-card" style="border-left-color: ${getScoreColor(results.lighthouse.seo)};">
                    <div class="score-value" style="color: ${getScoreColor(results.lighthouse.seo)};">
                        ${getScoreEmoji(results.lighthouse.seo)} ${results.lighthouse.seo}
                    </div>
                    <div class="score-label">SEO</div>
                </div>
                <div class="score-card" style="border-left-color: ${getScoreColor(results.lighthouse.accessibility)};">
                    <div class="score-value" style="color: ${getScoreColor(results.lighthouse.accessibility)};">
                        ${getScoreEmoji(results.lighthouse.accessibility)} ${results.lighthouse.accessibility}
                    </div>
                    <div class="score-label">Accessibilité</div>
                </div>
                <div class="score-card" style="border-left-color: ${getScoreColor(results.lighthouse.bestPractices)};">
                    <div class="score-value" style="color: ${getScoreColor(results.lighthouse.bestPractices)};">
                        ${getScoreEmoji(results.lighthouse.bestPractices)} ${results.lighthouse.bestPractices}
                    </div>
                    <div class="score-label">Bonnes Pratiques</div>
                </div>
            </div>

            <h3>🔍 Points clés détectés</h3>
            <ul>
                <li><strong>Titre :</strong> ${results.seoBasic.title ? '✅ Présent' : '❌ Manquant'}</li>
                <li><strong>Meta description :</strong> ${results.seoBasic.description ? '✅ Présente' : '❌ Manquante'}</li>
                <li><strong>H1 :</strong> ${results.seoBasic.h1?.length > 0 ? `✅ ${results.seoBasic.h1.length} trouvé(s)` : '❌ Aucun'}</li>
                ${results.security ? `<li><strong>Sécurité :</strong> ${results.security.headerScore}% des headers de sécurité</li>` : ''}
            </ul>

            ${results.lighthouse.seo < 80 || results.lighthouse.performance < 80 ? `
            <div class="alert">
                <div class="alert-title">⚠️ Points d'amélioration détectés</div>
                <p>Votre site présente des opportunités d'optimisation importantes. Le rapport détaillé en pièce jointe contient toutes les recommandations.</p>
            </div>
            ` : ''}

            <div class="cta-section">
                <h3 style="margin-top: 0;">🚀 Prochaines étapes</h3>
                <p>Choisissez l'option qui vous convient le mieux :</p>
                
                <div style="text-align: center; margin: 20px 0;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://audit.mattkonnect.com'}/contact" class="cta-button">
                        ✅ Corriger mon site
                    </a>
                    <br><small style="color: #6b7280;">Recevez un audit complet + plan d'action détaillé</small>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://audit.mattkonnect.com'}/marque-blanche" class="cta-button cta-secondary">
                        🚀 Passer à la version agence
                    </a>
                    <br><small style="color: #6b7280;">Obtenez des audits en marque blanche</small>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://audit.mattkonnect.com'}/" class="cta-button cta-tertiary">
                        🔁 Effectuer un nouvel audit
                    </a>
                    <br><small style="color: #6b7280;">Scanner un autre site maintenant</small>
                </div>
            </div>

            <p><strong>📋 Rapport complet en pièce jointe</strong></p>
            <p>Le PDF joint contient l'analyse détaillée avec toutes les recommandations techniques pour optimiser votre site.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p>Besoin d'aide ? Répondez simplement à cet email ou contactez-nous.</p>
            <p><strong>Matt Konnect</strong><br>
            📧 info@mattkonnect.com<br>
            🌐 Expertise digitale & SEO</p>
        </div>
        
        <div class="footer">
            <p>© 2025 Konnect Insights by Matt Konnect - Tous droits réservés</p>
            <p>Cet email vous a été envoyé suite à votre demande d'audit SEO pour ${domain}</p>
        </div>
    </div>
</body>
</html>
    `;
    }
}

export const emailService = new EmailService();
