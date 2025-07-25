import puppeteer from 'puppeteer';
import { HybridAuditResult } from './auditOrchestrator';

export interface PdfGenerationOptions {
    includeDetails?: boolean;
    includeRecommendations?: boolean;
    format?: 'A4' | 'Letter';
    margin?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
    };
}

export async function generateAuditPdf(
    domain: string,
    auditResults: HybridAuditResult,
    options: PdfGenerationOptions = {}
): Promise<Buffer> {
    const {
        includeDetails = true,
        includeRecommendations = true,
        format = 'A4',
        margin = { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
    } = options;

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Injecter Tailwind CSS
        await page.addStyleTag({
            url: 'https://cdn.tailwindcss.com'
        });

        // Générer le contenu HTML
        const htmlContent = generateReportHtml(domain, auditResults, { includeDetails, includeRecommendations });

        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });

        // Attendre que Tailwind soit chargé
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Générer le PDF
        const pdfBuffer = await page.pdf({
            format: format,
            margin: margin,
            printBackground: true,
            preferCSSPageSize: true
        });

        return pdfBuffer;

    } finally {
        await browser.close();
    }
}

function generateReportHtml(
    domain: string,
    results: HybridAuditResult,
    options: { includeDetails: boolean; includeRecommendations: boolean }
): string {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const getScoreColor = (score: number): string => {
        if (score >= 80) return 'text-green-600 bg-green-100';
        if (score >= 60) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getScoreBadgeColor = (score: number): string => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'Audit - ${domain}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      .page-break { page-break-before: always; }
      .no-break { page-break-inside: avoid; }
    }
    .score-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.25rem;
      color: white;
    }
  </style>
</head>
<body class="bg-gray-50 text-gray-800">
  
  <!-- Header -->
  <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 mb-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-4xl font-bold mb-2">Rapport d'Audit Web</h1>
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-semibold">${domain}</h2>
          <p class="text-blue-200">Généré le ${currentDate}</p>
        </div>
        <div class="text-right">
          <p class="text-blue-200">Mode: <span class="font-semibold">${results.mode === 'fast' ? 'Rapide' : 'Complet'}</span></p>
          <p class="text-blue-200">Durée: <span class="font-semibold">${Math.round(results.executionTime / 1000)}s</span></p>
        </div>
      </div>
    </div>
  </div>

  <div class="max-w-4xl mx-auto px-4 space-y-8">
    
    <!-- Scores Lighthouse -->
    <div class="no-break bg-white rounded-lg shadow-lg p-6">
      <h3 class="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Scores Lighthouse</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        
        <div class="text-center">
          <div class="score-circle ${getScoreBadgeColor(results.lighthouse.performance)} mx-auto mb-2">
            ${results.lighthouse.performance}
          </div>
          <h4 class="font-semibold">Performance</h4>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div class="h-2 rounded-full ${getScoreBadgeColor(results.lighthouse.performance)}" style="width: ${results.lighthouse.performance}%"></div>
          </div>
        </div>

        <div class="text-center">
          <div class="score-circle ${getScoreBadgeColor(results.lighthouse.seo)} mx-auto mb-2">
            ${results.lighthouse.seo}
          </div>
          <h4 class="font-semibold">SEO</h4>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div class="h-2 rounded-full ${getScoreBadgeColor(results.lighthouse.seo)}" style="width: ${results.lighthouse.seo}%"></div>
          </div>
        </div>

        <div class="text-center">
          <div class="score-circle ${getScoreBadgeColor(results.lighthouse.accessibility)} mx-auto mb-2">
            ${results.lighthouse.accessibility}
          </div>
          <h4 class="font-semibold">Accessibilité</h4>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div class="h-2 rounded-full ${getScoreBadgeColor(results.lighthouse.accessibility)}" style="width: ${results.lighthouse.accessibility}%"></div>
          </div>
        </div>

        <div class="text-center">
          <div class="score-circle ${getScoreBadgeColor(results.lighthouse.bestPractices)} mx-auto mb-2">
            ${results.lighthouse.bestPractices}
          </div>
          <h4 class="font-semibold">Bonnes Pratiques</h4>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div class="h-2 rounded-full ${getScoreBadgeColor(results.lighthouse.bestPractices)}" style="width: ${results.lighthouse.bestPractices}%"></div>
          </div>
        </div>

      </div>
    </div>

    <!-- SEO de Base -->
    <div class="no-break bg-white rounded-lg shadow-lg p-6">
      <h3 class="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Analyse SEO de Base</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div class="p-4 rounded-lg ${results.seoBasic.title ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
          <div class="flex items-center">
            <span class="text-2xl mr-3">${results.seoBasic.title ? '✅' : '❌'}</span>
            <div>
              <h4 class="font-semibold">Titre de la page</h4>
              <p class="text-sm text-gray-600">${results.seoBasic.title || 'Manquant'}</p>
            </div>
          </div>
        </div>

        <div class="p-4 rounded-lg ${results.seoBasic.description ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
          <div class="flex items-center">
            <span class="text-2xl mr-3">${results.seoBasic.description ? '✅' : '❌'}</span>
            <div>
              <h4 class="font-semibold">Meta Description</h4>
              <p class="text-sm text-gray-600">${results.seoBasic.description || 'Manquante'}</p>
            </div>
          </div>
        </div>

        <div class="p-4 rounded-lg ${results.seoBasic.h1.length > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
          <div class="flex items-center">
            <span class="text-2xl mr-3">${results.seoBasic.h1.length > 0 ? '✅' : '❌'}</span>
            <div>
              <h4 class="font-semibold">Balises H1 (${results.seoBasic.h1.length})</h4>
              <p class="text-sm text-gray-600">${results.seoBasic.h1.length > 0 ? results.seoBasic.h1.join(', ') : 'Aucune trouvée'}</p>
            </div>
          </div>
        </div>

        <div class="p-4 rounded-lg ${results.seoBasic.canonical ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}">
          <div class="flex items-center">
            <span class="text-2xl mr-3">${results.seoBasic.canonical ? '✅' : '⚠️'}</span>
            <div>
              <h4 class="font-semibold">URL Canonique</h4>
              <p class="text-sm text-gray-600">${results.seoBasic.canonical || 'Non définie'}</p>
            </div>
          </div>
        </div>

        <div class="p-4 rounded-lg ${results.seoBasic.hasRobotsTxt ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
          <div class="flex items-center">
            <span class="text-2xl mr-3">${results.seoBasic.hasRobotsTxt ? '✅' : '❌'}</span>
            <div>
              <h4 class="font-semibold">Robots.txt</h4>
              <p class="text-sm text-gray-600">${results.seoBasic.hasRobotsTxt ? 'Présent' : 'Absent'}</p>
            </div>
          </div>
        </div>

        <div class="p-4 rounded-lg ${results.seoBasic.hasSitemap ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
          <div class="flex items-center">
            <span class="text-2xl mr-3">${results.seoBasic.hasSitemap ? '✅' : '❌'}</span>
            <div>
              <h4 class="font-semibold">Sitemap XML</h4>
              <p class="text-sm text-gray-600">${results.seoBasic.hasSitemap ? 'Présent' : 'Absent'}</p>
            </div>
          </div>
        </div>

      </div>
    </div>

    ${results.security ? `
    <!-- Sécurité & RGPD -->
    <div class="no-break bg-white rounded-lg shadow-lg p-6">
      <h3 class="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Sécurité & RGPD</h3>
      
      <!-- Score de sécurité -->
      <div class="mb-6 p-4 rounded-lg bg-gray-50">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-lg font-semibold">Score de Sécurité</h4>
          <div class="flex items-center">
            <div class="score-circle ${getScoreBadgeColor(results.security.headerScore)} w-16 h-16 text-sm">
              ${results.security.headerScore}%
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div class="flex items-center p-2 rounded ${results.security.https ? 'bg-green-100' : 'bg-red-100'}">
            <span class="mr-2">${results.security.https ? '✅' : '❌'}</span>
            <span class="text-sm">HTTPS</span>
          </div>
          <div class="flex items-center p-2 rounded ${results.security.headers.contentSecurityPolicy ? 'bg-green-100' : 'bg-red-100'}">
            <span class="mr-2">${results.security.headers.contentSecurityPolicy ? '✅' : '❌'}</span>
            <span class="text-sm">CSP</span>
          </div>
          <div class="flex items-center p-2 rounded ${results.security.headers.strictTransportSecurity ? 'bg-green-100' : 'bg-red-100'}">
            <span class="mr-2">${results.security.headers.strictTransportSecurity ? '✅' : '❌'}</span>
            <span class="text-sm">HSTS</span>
          </div>
          <div class="flex items-center p-2 rounded ${results.security.headers.xFrameOptions ? 'bg-green-100' : 'bg-red-100'}">
            <span class="mr-2">${results.security.headers.xFrameOptions ? '✅' : '❌'}</span>
            <span class="text-sm">X-Frame-Options</span>
          </div>
          <div class="flex items-center p-2 rounded ${results.security.headers.xContentTypeOptions ? 'bg-green-100' : 'bg-red-100'}">
            <span class="mr-2">${results.security.headers.xContentTypeOptions ? '✅' : '❌'}</span>
            <span class="text-sm">X-Content-Type</span>
          </div>
          <div class="flex items-center p-2 rounded ${results.security.headers.referrerPolicy ? 'bg-green-100' : 'bg-red-100'}">
            <span class="mr-2">${results.security.headers.referrerPolicy ? '✅' : '❌'}</span>
            <span class="text-sm">Referrer Policy</span>
          </div>
        </div>
      </div>

      ${results.rgpd ? `
      <!-- RGPD -->
      <div class="mb-6">
        <h4 class="text-lg font-semibold mb-3">Conformité RGPD</h4>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex items-center p-3 rounded-lg ${results.rgpd.hasCookieBanner ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
            <span class="text-xl mr-3">${results.rgpd.hasCookieBanner ? '✅' : '❌'}</span>
            <span>Bandeau cookies</span>
          </div>
          <div class="flex items-center p-3 rounded-lg ${results.rgpd.hasPrivacyPolicy ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
            <span class="text-xl mr-3">${results.rgpd.hasPrivacyPolicy ? '✅' : '❌'}</span>
            <span>Politique de confidentialité</span>
          </div>
          <div class="flex items-center p-3 rounded-lg ${results.rgpd.hasTermsOfService ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
            <span class="text-xl mr-3">${results.rgpd.hasTermsOfService ? '✅' : '❌'}</span>
            <span>Mentions légales</span>
          </div>
          <div class="flex items-center p-3 rounded-lg ${results.rgpd.cookieConsentDetected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
            <span class="text-xl mr-3">${results.rgpd.cookieConsentDetected ? '✅' : '❌'}</span>
            <span>Consentement GDPR</span>
          </div>
        </div>
      </div>
      ` : ''}

      ${results.cookies ? `
      <!-- Cookies -->
      <div>
        <h4 class="text-lg font-semibold mb-3">Analyse des Cookies</h4>
        <div class="grid grid-cols-3 gap-4 mb-4">
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">${results.cookies.total}</div>
            <div class="text-sm text-gray-600">Total cookies</div>
          </div>
          <div class="text-center p-4 bg-orange-50 rounded-lg">
            <div class="text-2xl font-bold text-orange-600">${results.cookies.thirdParty}</div>
            <div class="text-sm text-gray-600">Cookies tiers</div>
          </div>
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <div class="text-2xl font-bold text-green-600">${results.cookies.hasSecureFlags}</div>
            <div class="text-sm text-gray-600">Sécurisés</div>
          </div>
        </div>
      </div>
      ` : ''}
    </div>
    ` : ''}

    ${options.includeDetails && results.seoAdvanced ? `
    <!-- Page break pour mode complet -->
    <div class="page-break"></div>
    
    <!-- SEO Avancé -->
    <div class="no-break bg-white rounded-lg shadow-lg p-6">
      <h3 class="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Analyse SEO Avancée</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Structure HTML -->
        <div>
          <h4 class="text-lg font-semibold mb-4 text-green-600">Structure HTML</h4>
          <div class="space-y-2">
            <div class="flex items-center">
              <span class="mr-2">${results.seoAdvanced.htmlStructure?.hasTitle ? '✅' : '❌'}</span>
              <span class="text-sm">Titre</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">${results.seoAdvanced.htmlStructure?.hasMetaDescription ? '✅' : '❌'}</span>
              <span class="text-sm">Meta description</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">${results.seoAdvanced.htmlStructure?.hasH1 ? '✅' : '❌'}</span>
              <span class="text-sm">H1</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">${results.seoAdvanced.htmlStructure?.hasOpenGraph ? '✅' : '❌'}</span>
              <span class="text-sm">Open Graph</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">${results.seoAdvanced.htmlStructure?.hasCanonical ? '✅' : '❌'}</span>
              <span class="text-sm">Canonical</span>
            </div>
          </div>
        </div>

        <!-- SEO Technique -->
        <div>
          <h4 class="text-lg font-semibold mb-4 text-blue-600">SEO Technique</h4>
          <div class="space-y-2">
            <div class="flex items-center">
              <span class="mr-2">${results.seoAdvanced.technicalSEO?.httpsEnabled ? '✅' : '❌'}</span>
              <span class="text-sm">HTTPS</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">${results.seoAdvanced.technicalSEO?.robotsTxtExists ? '✅' : '❌'}</span>
              <span class="text-sm">Robots.txt</span>
            </div>
            <div class="flex items-center">
              <span class="mr-2">${results.seoAdvanced.technicalSEO?.sitemapExists ? '✅' : '❌'}</span>
              <span class="text-sm">Sitemap</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">Temps de réponse</span>
              <span class="text-sm font-semibold">${results.seoAdvanced.technicalSEO?.responseTime}ms</span>
            </div>
          </div>
        </div>

        <!-- Contenu -->
        <div>
          <h4 class="text-lg font-semibold mb-4 text-purple-600">Contenu</h4>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm">Images</span>
              <span class="text-sm font-semibold">${results.seoAdvanced.content?.imageCount || 0}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">Sans alt</span>
              <span class="text-sm font-semibold">${results.seoAdvanced.content?.imagesWithoutAlt || 0}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">Liens internes</span>
              <span class="text-sm font-semibold">${results.seoAdvanced.content?.internalLinks || 0}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm">Liens externes</span>
              <span class="text-sm font-semibold">${results.seoAdvanced.content?.externalLinks || 0}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
    ` : ''}

    ${options.includeRecommendations && (results.seoAdvanced?.recommendations || results.securityRecommendations) ? `
    <!-- Recommandations -->
    <div class="no-break bg-white rounded-lg shadow-lg p-6">
      <h3 class="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Recommandations</h3>
      
      ${results.seoAdvanced?.recommendations ? `
      <div class="mb-6">
        <h4 class="text-lg font-semibold mb-4 text-blue-600">SEO</h4>
        <ul class="space-y-2">
          ${results.seoAdvanced.recommendations.map((rec: string) => `
            <li class="flex items-start">
              <span class="text-blue-500 mr-3 mt-1">•</span>
              <span class="text-sm">${rec}</span>
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}

      ${results.securityRecommendations && results.securityRecommendations.length > 0 ? `
      <div>
        <h4 class="text-lg font-semibold mb-4 text-red-600">Sécurité & RGPD</h4>
        <ul class="space-y-2">
          ${results.securityRecommendations.map((rec: string) => `
            <li class="flex items-start">
              <span class="text-red-500 mr-3 mt-1">•</span>
              <span class="text-sm">${rec}</span>
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
    </div>
    ` : ''}

  </div>

  <!-- Footer -->
  <div class="bg-gray-100 mt-12 p-6 text-center text-sm text-gray-600">
    <p>Rapport généré par Audit Tool • ${currentDate} • ${domain}</p>
    <p class="mt-1">Ce rapport contient une analyse automatisée et peut nécessiter une validation manuelle.</p>
  </div>

</body>
</html>
  `;
}
