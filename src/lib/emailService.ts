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
            const payload: any = {
                to: [{ email: emailData.to }],
                sender: {
                    email: process.env.FROM_EMAIL || 'info@mattkonnect.com',
                    name: process.env.FROM_NAME || 'Konnect Insights by Matt Konnect'
                },
                subject: emailData.subject,
                htmlContent: emailData.htmlContent
            };

            // Ajouter les pièces jointes si présentes
            if (emailData.attachments && emailData.attachments.length > 0) {
                payload.attachment = emailData.attachments.map(att => {
                    // Nettoyer le contenu base64 (supprimer préfixe data: si présent)
                    let cleanContent = att.content;
                    if (cleanContent.includes(',')) {
                        cleanContent = cleanContent.split(',')[1];
                    }

                    return {
                        name: att.name,
                        content: cleanContent
                    };
                });
            }

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
                console.error('Brevo API Error Details:', errorData);

                // Si erreur d'attachment, retry sans PDF
                if (errorData.message &&
                    (errorData.message.includes('attachment') ||
                        errorData.message.includes('file') ||
                        errorData.code === 'invalid_parameter') &&
                    payload.attachment) {

                    console.warn('[EMAIL] Erreur attachment détectée, retry sans PDF...');
                    delete payload.attachment;

                    const retryResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'api-key': this.apiKey
                        },
                        body: JSON.stringify(payload)
                    });

                    if (retryResponse.ok) {
                        const retryResult = await retryResponse.json();
                        console.log('[EMAIL] Email envoyé sans PDF après retry');
                        return {
                            success: true,
                            messageId: retryResult.messageId || 'unknown'
                        };
                    }
                }

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
    }

    async sendAuditReport(
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
            try {
                // Nettoyer le base64 de tout préfixe data: ou autres caractères invalides
                let cleanBase64 = pdfBase64;

                // Supprimer les préfixes data: s'ils existent
                cleanBase64 = cleanBase64.replace(/^data:application\/pdf;base64,/, '');
                cleanBase64 = cleanBase64.replace(/^data:.*;base64,/, '');

                // Supprimer les espaces, retours à la ligne et autres caractères non-base64
                cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '');

                // Validation stricte du base64
                const isValidBase64 = (str: string): boolean => {
                    try {
                        // Vérifier que ce n'est pas vide
                        if (!str || str.length === 0) return false;

                        // Vérifier la longueur (doit être multiple de 4)
                        if (str.length % 4 !== 0) return false;

                        // Vérifier le format base64 (plus permissif pour le contenu PDF)
                        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(str)) return false;

                        // Test de décodage réel
                        const decoded = Buffer.from(str, 'base64');

                        // Vérifier que ce ressemble à un PDF (commence par %PDF)
                        const header = decoded.subarray(0, 4).toString();
                        if (header !== '%PDF') {
                            console.warn('[EMAIL] Contenu décodé ne commence pas par %PDF:', header);
                            return false;
                        }

                        return true;
                    } catch (error) {
                        console.error('[EMAIL] Erreur validation base64:', error);
                        return false;
                    }
                };                // Vérifier les contraintes Brevo (taille max ~10MB en base64)
                const maxSizeBytes = 8 * 1024 * 1024; // 8MB pour être sûr
                const minSizeBytes = 1024; // 1KB minimum (PDF valide)
                const estimatedSize = (cleanBase64.length * 3) / 4; // Taille réelle du fichier

                if (cleanBase64 &&
                    cleanBase64.length > 0 &&
                    isValidBase64(cleanBase64) &&
                    estimatedSize >= minSizeBytes &&
                    estimatedSize <= maxSizeBytes) {

                    emailData.attachments = [{
                        name: `audit-${domain.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
                        content: cleanBase64
                    }];
                    console.log(`[EMAIL] PDF attachment validé: ${Math.round(estimatedSize / 1024)}Ko`);
                } else {
                    if (estimatedSize > maxSizeBytes) {
                        console.warn(`[EMAIL] PDF trop volumineux (${Math.round(estimatedSize / 1024)}Ko > ${Math.round(maxSizeBytes / 1024)}Ko)`);
                    } else if (estimatedSize < minSizeBytes) {
                        console.warn(`[EMAIL] PDF trop petit (${Math.round(estimatedSize / 1024)}Ko < ${Math.round(minSizeBytes / 1024)}Ko)`);
                    } else {
                        console.warn('[EMAIL] Format base64 invalide, envoi sans pièce jointe');
                    }
                }
            } catch (error) {
                console.error('[EMAIL] Erreur traitement PDF:', error);
                // Continuer sans pièce jointe en cas d'erreur
            }
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
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Audit SEO - ${domain}</title>
    <!--[if gte mso 9]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
    <style type="text/css">
        body, table, td, p, a, li { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
        body { margin: 0; padding: 0; background-color: #f9fafb; font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #667eea; color: #ffffff; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .score-card { background-color: #f8fafc; padding: 15px; margin: 10px 0; text-align: center; border-radius: 8px; }
        .score-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .score-label { font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
        .cta-button { display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 5px; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #667eea; color: #ffffff; padding: 30px 20px; text-align: center;">
                            <h1 style="font-size: 24px; margin: 0 0 10px 0; color: #ffffff;">🔍 Konnect Insights</h1>
                            <h2 style="font-size: 18px; margin: 10px 0; color: #ffffff;">Votre audit SEO est prêt !</h2>
                            <p style="font-size: 14px; margin: 5px 0; color: #ffffff;">Analyse complète de <strong>${domain}</strong></p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px 20px;">
                            <h3 style="font-size: 20px; margin-bottom: 20px; color: #1f2937;">📊 Résultats de l'audit</h3>
                            
                            <!-- Scores -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td width="48%" style="padding: 5px;">
                                        <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; border-left: 4px solid ${getScoreColor(results.lighthouse.performance)};">
                                            <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: ${getScoreColor(results.lighthouse.performance)};">
                                                ${getScoreEmoji(results.lighthouse.performance)} ${results.lighthouse.performance}
                                            </div>
                                            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Performance</div>
                                        </div>
                                    </td>
                                    <td width="48%" style="padding: 5px;">
                                        <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; border-left: 4px solid ${getScoreColor(results.lighthouse.seo)};">
                                            <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: ${getScoreColor(results.lighthouse.seo)};">
                                                ${getScoreEmoji(results.lighthouse.seo)} ${results.lighthouse.seo}
                                            </div>
                                            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">SEO</div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td width="48%" style="padding: 5px;">
                                        <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; border-left: 4px solid ${getScoreColor(results.lighthouse.accessibility)};">
                                            <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: ${getScoreColor(results.lighthouse.accessibility)};">
                                                ${getScoreEmoji(results.lighthouse.accessibility)} ${results.lighthouse.accessibility}
                                            </div>
                                            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Accessibilité</div>
                                        </div>
                                    </td>
                                    <td width="48%" style="padding: 5px;">
                                        <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; border-left: 4px solid ${getScoreColor(results.lighthouse.bestPractices)};">
                                            <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px; color: ${getScoreColor(results.lighthouse.bestPractices)};">
                                                ${getScoreEmoji(results.lighthouse.bestPractices)} ${results.lighthouse.bestPractices}
                                            </div>
                                            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Bonnes Pratiques</div>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <h3 style="margin: 30px 0 15px 0;">🔍 Points clés détectés</h3>
                            <ul style="margin: 0; padding-left: 20px;">
                                <li><strong>Titre :</strong> ${results.seoBasic.title ? '✅ Présent' : '❌ Manquant'}</li>
                                <li><strong>Meta description :</strong> ${results.seoBasic.description ? '✅ Présente' : '❌ Manquante'}</li>
                                <li><strong>H1 :</strong> ${results.seoBasic.h1?.length > 0 ? `✅ ${results.seoBasic.h1.length} trouvé(s)` : '❌ Aucun'}</li>
                                ${results.security ? `<li><strong>Sécurité :</strong> ${results.security.headerScore}% des headers de sécurité</li>` : ''}
                            </ul>

                            ${results.lighthouse.seo < 80 || results.lighthouse.performance < 80 ? `
                            <div style="background-color: #fee2e2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 15px 0;">
                                <div style="font-weight: 600; color: #dc2626; margin-bottom: 5px;">⚠️ Points d'amélioration détectés</div>
                                <p style="margin: 0;">Votre site présente des opportunités d'optimisation importantes. Le rapport détaillé en pièce jointe contient toutes les recommandations.</p>
                            </div>
                            ` : ''}

                            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                                <h3 style="margin-top: 0;">🚀 Prochaines étapes</h3>
                                <p>Choisissez l'option qui vous convient le mieux :</p>
                                
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td align="center" style="padding: 10px 0;">
                                            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://audit.mattkonnect.com'}/contact" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                                                ✅ Corriger mon site
                                            </a>
                                            <br><small style="color: #6b7280;">Recevez un audit complet + plan d'action détaillé</small>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding: 10px 0;">
                                            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://audit.mattkonnect.com'}/marque-blanche" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                                                🚀 Passer à la version agence
                                            </a>
                                            <br><small style="color: #6b7280;">Obtenez des audits en marque blanche</small>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding: 10px 0;">
                                            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://audit.mattkonnect.com'}/" style="display: inline-block; background-color: #f59e0b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                                                🔁 Effectuer un nouvel audit
                                            </a>
                                            <br><small style="color: #6b7280;">Scanner un autre site maintenant</small>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <p><strong>📋 Rapport complet en pièce jointe</strong></p>
                            <p>Le PDF joint contient l'analyse détaillée avec toutes les recommandations techniques pour optimiser votre site.</p>
                            
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                            
                            <p>Besoin d'aide ? Répondez simplement à cet email ou contactez-nous.</p>
                            <p><strong>Matt Konnect</strong><br>
                            📧 info@mattkonnect.com<br>
                            🌐 Expertise digitale & SEO</p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                            <p>© 2025 Konnect Insights by Matt Konnect - Tous droits réservés</p>
                            <p>Cet email vous a été envoyé suite à votre demande d'audit SEO pour ${domain}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }
}

export const emailService = new EmailService();
