import { NextRequest, NextResponse } from 'next/server';
import { generateAuditPdf } from '../../../lib/pdfGenerator';
import { HybridAuditResult } from '../../../lib/auditOrchestrator';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { domain = 'example.com', mode = 'fast' } = body;

        console.log(`[PDF DEMO] Génération PDF de démonstration pour ${domain}`);

        // Données fictives pour la démonstration
        const mockAuditResults: HybridAuditResult = {
            lighthouse: {
                seo: 85,
                performance: 92,
                accessibility: 78,
                bestPractices: 88
            },
            seoBasic: {
                title: "Exemple de Site Web - Page d'Accueil",
                description: "Une description meta bien optimisée pour le SEO avec les mots-clés importants.",
                h1: ["Bienvenue sur notre site", "Section principale"],
                canonical: "https://example.com/",
                hasRobotsTxt: true,
                hasSitemap: true
            },
            security: {
                https: true,
                headers: {
                    contentSecurityPolicy: true,
                    strictTransportSecurity: true,
                    xFrameOptions: true,
                    xContentTypeOptions: true,
                    referrerPolicy: true,
                    permissionsPolicy: false
                },
                headerScore: 83
            },
            rgpd: mode === 'complete' ? {
                hasCookieBanner: true,
                hasPrivacyPolicy: true,
                hasTermsOfService: true,
                cookieConsentDetected: true
            } : undefined,
            cookies: mode === 'complete' ? {
                total: 8,
                thirdParty: 3,
                hasSecureFlags: 5,
                details: [
                    {
                        name: "_ga",
                        domain: ".example.com",
                        httpOnly: false,
                        secure: true,
                        sameSite: "lax",
                        isThirdParty: true
                    },
                    {
                        name: "session_id",
                        domain: "example.com",
                        httpOnly: true,
                        secure: true,
                        sameSite: "strict",
                        isThirdParty: false
                    }
                ]
            } : undefined,
            seoAdvanced: mode === 'complete' ? {
                htmlStructure: {
                    hasTitle: true,
                    titleLength: 45,
                    hasMetaDescription: true,
                    metaDescriptionLength: 155,
                    hasH1: true,
                    h1Count: 2,
                    hasCanonical: true,
                    hasOpenGraph: true,
                    hasTwitterCard: false,
                    hasViewport: true,
                    hasLang: true,
                    hasSchemaMarkup: false
                },
                technicalSEO: {
                    robotsTxtExists: true,
                    robotsTxtAccessible: true,
                    sitemapExists: true,
                    sitemapAccessible: true,
                    httpsEnabled: true,
                    hasRedirect: false,
                    responseTime: 1250
                },
                content: {
                    imageCount: 12,
                    imagesWithoutAlt: 2,
                    internalLinks: 15,
                    externalLinks: 5,
                    textLength: 1450,
                    headingsStructure: {
                        h1: 2,
                        h2: 4,
                        h3: 6,
                        h4: 2,
                        h5: 0,
                        h6: 0
                    }
                },
                recommendations: [
                    "Optimiser la taille des images pour améliorer les performances",
                    "Ajouter des attributs alt manquants sur 2 images",
                    "Implémenter des données structurées Schema.org",
                    "Ajouter des balises Twitter Card",
                    "Augmenter le contenu textuel (minimum 300 mots recommandés)"
                ]
            } : undefined,
            securityRecommendations: [
                "Ajouter le header Permissions-Policy",
                "Vérifier la configuration HTTPS",
                "Mettre en place une politique de cookies plus stricte"
            ],
            executionTime: mode === 'complete' ? 42500 : 18750,
            mode: mode as 'fast' | 'complete'
        };

        // Générer le PDF
        const pdfBuffer = await generateAuditPdf(domain, mockAuditResults, {
            includeDetails: mode === 'complete',
            includeRecommendations: true,
            format: 'A4'
        });

        // Retourner le PDF
        const response = new NextResponse(pdfBuffer);
        response.headers.set('Content-Type', 'application/pdf');
        response.headers.set('Content-Disposition', `attachment; filename="audit-demo-${domain}-${Date.now()}.pdf"`);
        response.headers.set('Content-Length', pdfBuffer.length.toString());

        return response;

    } catch (error) {
        console.error('[PDF DEMO] Erreur:', error);
        return NextResponse.json(
            { error: `PDF demo generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 500 }
        );
    }
}
