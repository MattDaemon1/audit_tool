'use client'

import { useState } from 'react'

type AuditMode = 'fast' | 'complete'

interface AuditResult {
  lighthouse: {
    seo: number
    performance: number
    accessibility: number
    bestPractices: number
  }
  seoBasic: {
    title: string | null
    description: string | null
    h1: string[]
    canonical: string | null
    hasRobotsTxt: boolean
    hasSitemap: boolean
  }
  security?: {
    https: boolean
    headers: {
      contentSecurityPolicy: boolean
      strictTransportSecurity: boolean
      xFrameOptions: boolean
      xContentTypeOptions: boolean
      referrerPolicy: boolean
      permissionsPolicy: boolean
    }
    headerScore: number
  }
  rgpd?: {
    hasCookieBanner: boolean
    hasPrivacyPolicy: boolean
    hasTermsOfService: boolean
    cookieConsentDetected: boolean
  }
  cookies?: {
    total: number
    thirdParty: number
    hasSecureFlags: number
    details: Array<{
      name: string
      domain: string
      httpOnly: boolean
      secure: boolean
      sameSite: string | undefined
      isThirdParty: boolean
    }>
  }
  seoAdvanced?: any
  securityRecommendations?: string[]
  executionTime: number
  mode: AuditMode
}

export default function Home() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AuditResult | null>(null)
  const [error, setError] = useState('')
  const [auditMode, setAuditMode] = useState<AuditMode>('fast')

  const validateDomain = (url: string) => {
    const regex = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}$/
    return regex.test(url)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResults(null)

    if (!validateDomain(domain)) {
      setError("Domaine invalide (ex: exemple.com)")
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, mode: auditMode }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur inconnue')
      }

      setResults(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setResults(null)
    setDomain('')
    setError('')
  }

  const downloadPdf = async () => {
    if (!results || !domain) return;

    try {
      setLoading(true);
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          mode: results.mode,
          options: {
            includeDetails: results.mode === 'complete',
            includeRecommendations: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }

      // Télécharger le fichier
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${domain}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err: any) {
      setError(`Erreur PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Audit de site web</h1>

        {!results ? (
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Entrez le domaine à auditer</h2>

              {/* Mode selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Mode d'audit</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mode"
                      value="fast"
                      checked={auditMode === 'fast'}
                      onChange={(e) => setAuditMode(e.target.value as AuditMode)}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      <strong>Rapide</strong> (~15s)<br />
                      <span className="text-gray-600">Lighthouse + SEO de base</span>
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mode"
                      value="complete"
                      checked={auditMode === 'complete'}
                      onChange={(e) => setAuditMode(e.target.value as AuditMode)}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      <strong>Complet</strong> (~45s)<br />
                      <span className="text-gray-600">+ Analyse avancée</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="ex: exemple.com"
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {error && <p className="text-red-500 mb-4">{error}</p>}
              {loading && (
                <p className="text-blue-500 mb-4">
                  Audit {auditMode === 'fast' ? 'rapide' : 'complet'} en cours...
                  {auditMode === 'fast' ? ' (~15s)' : ' (~45s)'}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 text-white font-semibold rounded ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {loading ? 'Analyse en cours...' : `Lancer audit ${auditMode === 'fast' ? 'rapide' : 'complet'}`}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Résultats pour {domain}</h2>
                <div className="flex gap-4 items-center">
                  <span className="text-sm text-gray-600">
                    Mode {results.mode} • {Math.round(results.executionTime / 1000)}s
                  </span>
                  <button
                    onClick={downloadPdf}
                    disabled={loading}
                    className={`px-4 py-2 text-white rounded flex items-center gap-2 ${loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {loading ? 'Génération...' : 'PDF'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Nouvel audit
                  </button>
                </div>
              </div>

              {/* Lighthouse Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(results.lighthouse.performance)}`}>
                    {results.lighthouse.performance}
                  </div>
                  <div className="text-gray-600">Performance</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(results.lighthouse.seo)}`}>
                    {results.lighthouse.seo}
                  </div>
                  <div className="text-gray-600">SEO</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(results.lighthouse.accessibility)}`}>
                    {results.lighthouse.accessibility}
                  </div>
                  <div className="text-gray-600">Accessibilité</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(results.lighthouse.bestPractices)}`}>
                    {results.lighthouse.bestPractices}
                  </div>
                  <div className="text-gray-600">Bonnes Pratiques</div>
                </div>
              </div>
            </div>

            {/* SEO Basic Results */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">Analyse SEO de base (Cheerio)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Titre:</strong> {results.seoBasic.title || '❌ Manquant'}
                </div>
                <div>
                  <strong>Meta description:</strong> {results.seoBasic.description || '❌ Manquante'}
                </div>
                <div>
                  <strong>H1 ({results.seoBasic.h1.length}):</strong> {results.seoBasic.h1.join(', ') || '❌ Aucun'}
                </div>
                <div>
                  <strong>Canonical:</strong> {results.seoBasic.canonical || '❌ Manquant'}
                </div>
                <div>
                  <strong>Robots.txt:</strong> {results.seoBasic.hasRobotsTxt ? '✅ Présent' : '❌ Absent'}
                </div>
                <div>
                  <strong>Sitemap:</strong> {results.seoBasic.hasSitemap ? '✅ Présent' : '❌ Absent'}
                </div>
              </div>
            </div>

            {/* Security & RGPD Results */}
            {results.security && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Sécurité & RGPD</h3>

                {/* Security Headers */}
                <div className="mb-4">
                  <h4 className="font-semibold text-red-600 mb-2">Headers de Sécurité ({results.security.headerScore}%)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div>HTTPS: {results.security.https ? '✅' : '❌'}</div>
                    <div>CSP: {results.security.headers.contentSecurityPolicy ? '✅' : '❌'}</div>
                    <div>HSTS: {results.security.headers.strictTransportSecurity ? '✅' : '❌'}</div>
                    <div>X-Frame: {results.security.headers.xFrameOptions ? '✅' : '❌'}</div>
                    <div>X-Content-Type: {results.security.headers.xContentTypeOptions ? '✅' : '❌'}</div>
                    <div>Referrer Policy: {results.security.headers.referrerPolicy ? '✅' : '❌'}</div>
                  </div>
                </div>

                {/* RGPD Info (mode complet seulement) */}
                {results.rgpd && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-blue-600 mb-2">Conformité RGPD</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>Bandeau cookies: {results.rgpd.hasCookieBanner ? '✅' : '❌'}</div>
                      <div>Politique de confidentialité: {results.rgpd.hasPrivacyPolicy ? '✅' : '❌'}</div>
                      <div>Mentions légales: {results.rgpd.hasTermsOfService ? '✅' : '❌'}</div>
                      <div>Consentement GDPR: {results.rgpd.cookieConsentDetected ? '✅' : '❌'}</div>
                    </div>
                  </div>
                )}

                {/* Cookies Info (mode complet seulement) */}
                {results.cookies && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-orange-600 mb-2">
                      Cookies ({results.cookies.total} total, {results.cookies.thirdParty} tiers)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>Total: {results.cookies.total}</div>
                      <div>Cookies tiers: {results.cookies.thirdParty}</div>
                      <div>Sécurisés: {results.cookies.hasSecureFlags}/{results.cookies.total}</div>
                    </div>
                    {results.cookies.details.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">Détail des cookies</summary>
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          {results.cookies.details.map((cookie, index) => (
                            <div key={index} className="text-xs p-1 border-b">
                              <strong>{cookie.name}</strong> ({cookie.domain})
                              {cookie.isThirdParty && <span className="text-red-500"> [Tiers]</span>}
                              {cookie.secure && cookie.httpOnly && <span className="text-green-500"> [Sécurisé]</span>}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {/* Security Recommendations */}
                {results.securityRecommendations && results.securityRecommendations.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-800 mb-2">Recommandations Sécurité</h4>
                    <ul className="text-sm space-y-1">
                      {results.securityRecommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-red-700">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* SEO Advanced Results (if available) */}
            {results.seoAdvanced && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Analyse SEO avancée (Puppeteer)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-green-600 mb-2">Structure HTML</h4>
                    <ul className="space-y-1">
                      <li>Titre: {results.seoAdvanced.htmlStructure?.hasTitle ? '✅' : '❌'}</li>
                      <li>Meta desc: {results.seoAdvanced.htmlStructure?.hasMetaDescription ? '✅' : '❌'}</li>
                      <li>H1: {results.seoAdvanced.htmlStructure?.hasH1 ? '✅' : '❌'}</li>
                      <li>Open Graph: {results.seoAdvanced.htmlStructure?.hasOpenGraph ? '✅' : '❌'}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-600 mb-2">Technique</h4>
                    <ul className="space-y-1">
                      <li>HTTPS: {results.seoAdvanced.technicalSEO?.httpsEnabled ? '✅' : '❌'}</li>
                      <li>Temps: {results.seoAdvanced.technicalSEO?.responseTime}ms</li>
                      <li>Robots: {results.seoAdvanced.technicalSEO?.robotsTxtExists ? '✅' : '❌'}</li>
                      <li>Sitemap: {results.seoAdvanced.technicalSEO?.sitemapExists ? '✅' : '❌'}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-600 mb-2">Contenu</h4>
                    <ul className="space-y-1">
                      <li>Images: {results.seoAdvanced.content?.imageCount || 0}</li>
                      <li>Sans alt: {results.seoAdvanced.content?.imagesWithoutAlt || 0}</li>
                      <li>Liens int: {results.seoAdvanced.content?.internalLinks || 0}</li>
                      <li>Liens ext: {results.seoAdvanced.content?.externalLinks || 0}</li>
                    </ul>
                  </div>
                </div>

                {results.seoAdvanced.recommendations && results.seoAdvanced.recommendations.length > 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 mb-2">Recommandations</h4>
                    <ul className="text-sm space-y-1">
                      {results.seoAdvanced.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-yellow-700">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
