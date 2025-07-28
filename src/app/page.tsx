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
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AuditResult | null>(null)
  const [error, setError] = useState('')
  const [auditMode, setAuditMode] = useState<AuditMode>('fast')
  const [emailSent, setEmailSent] = useState(false)

  const validateDomain = (url: string) => {
    // Nettoyage et validation stricte du domaine
    const cleanUrl = url.trim().toLowerCase()

    // Protection contre les injections et caractères malveillants
    if (cleanUrl.includes('<') || cleanUrl.includes('>') || cleanUrl.includes('"') ||
      cleanUrl.includes("'") || cleanUrl.includes('&') || cleanUrl.includes('javascript:') ||
      cleanUrl.includes('data:') || cleanUrl.includes('vbscript:') || cleanUrl.includes('file:')) {
      return false
    }

    // Validation stricte du format domaine
    const regex = /^(https?:\/\/)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/
    if (!regex.test(cleanUrl)) return false

    // Protection contre les domaines locaux et privés
    const blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '10.', '192.168.', '172.']
    if (blockedDomains.some(blocked => cleanUrl.includes(blocked))) {
      return false
    }

    // Limite de longueur
    return cleanUrl.length <= 253
  }

  const validateEmail = (email: string) => {
    // Nettoyage et validation stricte de l'email
    const cleanEmail = email.trim().toLowerCase()

    // Protection contre les injections
    if (cleanEmail.includes('<') || cleanEmail.includes('>') || cleanEmail.includes('"') ||
      cleanEmail.includes("'") || cleanEmail.includes('&') || cleanEmail.includes('script')) {
      return false
    }

    // Validation RFC compliant mais stricte
    const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

    // Limite de longueur
    return emailRegex.test(cleanEmail) && cleanEmail.length <= 254
  }

  const sanitizeInput = (input: string) => {
    return input.trim()
      .replace(/[<>]/g, '') // Retire les balises HTML
      .replace(/['"]/g, '') // Retire les quotes
      .replace(/javascript:/gi, '') // Protection XSS
      .replace(/data:/gi, '') // Protection data URLs
      .substring(0, 100) // Limite de taille
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
    setEmailSent(false)

    // Sanitisation et validation stricte
    const cleanDomain = sanitizeInput(domain)
    const cleanEmail = sanitizeInput(email)

    if (!validateDomain(cleanDomain)) {
      setError("Domaine invalide ou potentiellement dangereux")
      return
    }

    if (!cleanEmail) {
      setError("Email requis")
      return
    }

    if (!validateEmail(cleanEmail)) {
      setError("Format d'email invalide ou potentiellement dangereux")
      return
    }

    // Protection contre les attaques par déni de service
    if (loading) {
      setError("Une demande est déjà en cours")
      return
    }

    setLoading(true)

    try {
      // Timeout de sécurité pour éviter les blocages
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minutes max

      const res = await fetch('/api/send-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest' // Protection CSRF basique
        },
        body: JSON.stringify({
          domain: cleanDomain,
          email: cleanEmail,
          mode: auditMode,
          timestamp: Date.now() // Anti-replay
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur inconnue')
      }

      setResults(data.auditResults)
      setEmailSent(true)
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Timeout: La demande a pris trop de temps')
        } else {
          setError(error.message || 'Erreur lors de l\'audit')
        }
      } else {
        setError('Erreur inattendue')
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setResults(null)
    setDomain('')
    setEmail('')
    setError('')
    setEmailSent(false)
  }

  const downloadPdf = async () => {
    if (!results || !domain) return;

    // Protection contre les téléchargements multiples
    if (loading) {
      setError("Génération PDF déjà en cours")
      return
    }

    try {
      setLoading(true);

      // Timeout de sécurité
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 1 minute max pour PDF

      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          domain: sanitizeInput(domain),
          mode: results.mode,
          options: {
            includeDetails: results.mode === 'complete',
            includeRecommendations: true
          },
          timestamp: Date.now()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }

      // Vérification du type de contenu pour sécurité
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/pdf')) {
        throw new Error('Type de fichier inattendu')
      }

      // Télécharger le fichier avec nom sécurisé
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Nom de fichier sécurisé
      const safeDomain = sanitizeInput(domain).replace(/[^a-z0-9]/gi, '-')
      const safeDate = new Date().toISOString().split('T')[0]
      a.download = `audit-${safeDomain}-${safeDate}.pdf`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Timeout: Génération PDF trop longue')
        } else {
          setError(`Erreur PDF: ${err.message}`)
        }
      } else {
        setError('Erreur inattendue lors de la génération PDF')
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Konnect Insights</h1>
        <span className="text-lg text-gray-700 mb-4">
          Avec{' '}
          <a
            href="https://mattkonnect.com"
            target="_blank"
            rel="noopener"
            className="text-blue-600 underline hover:text-blue-800"
            itemProp="author"
            itemScope
            itemType="http://schema.org/Person"
          >
            <span itemProp="name">Matt Konnect</span>
          </a>
          , votre partenaire pour l'audit SEO
        </span>
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

              {/* Email obligatoire */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📧 Nous vous envoyons l'audit par email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@exemple.com"
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">
                  📋 Vous recevrez un rapport complet avec recommandations par email
                </p>
              </div>

              {error && <p className="text-red-500 mb-4">{error}</p>}
              {loading && (
                <p className="text-blue-500 mb-4">
                  🔄 Audit {auditMode === 'fast' ? 'rapide' : 'complet'} en cours + envoi email...
                  <br />
                  <span className="text-sm">
                    ({auditMode === 'fast' ? '~20s' : '~50s'} - Génération PDF incluse)
                  </span>
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 text-white font-semibold rounded ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {loading ? 'Audit + Envoi email...' : `📧 Lancer audit ${auditMode === 'fast' ? 'rapide' : 'complet'} + Email`}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              {emailSent && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-800 font-medium">
                      ✅ Rapport envoyé par email à {email}
                    </span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    Vérifiez votre boîte de réception (et vos spams) pour le rapport PDF complet.
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Résultats pour {domain}</h2>
                <div className="flex gap-4 items-center">
                  <span className="text-sm text-gray-600">
                    Mode {results.mode} • {Math.round(results.executionTime / 1000)}s
                  </span>
                  {!emailSent && (
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
                  )}
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
              <h3 className="text-xl font-semibold mb-4">Analyse SEO de base</h3>
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
                <h3 className="text-xl font-semibold mb-4">Analyse SEO avancée</h3>
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
