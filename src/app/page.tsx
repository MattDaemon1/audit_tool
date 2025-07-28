'use client'

import { useState } from 'react'
import { AuditMode, AuditResult } from '../lib/types'

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
      setError("Email requis pour recevoir le rapport d'audit")
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

      console.log(`[CLIENT] Démarrage audit sécurisé: ${cleanDomain} (${auditMode})`)

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

      console.log(`[CLIENT] Audit reçu:`, data.auditResults)
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
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header avec logo et navigation */}
        <header className="text-center mb-8 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Analysez vos <span className="text-blue-600">pages web</span>
          </h1>

          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-4">
            Extrayez la structure HTML, analysez les liens internes, comptez les mots et optimisez votre contenu avec notre outil.
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <span>Avec</span>
            <a
              href="https://mattkonnect.com"
              target="_blank"
              rel="noopener"
              className="text-blue-600 hover:text-blue-800 font-medium underline transition-colors"
              itemProp="author"
              itemScope
              itemType="http://schema.org/Person"
            >
              <span itemProp="name">Matt Konnect</span>
            </a>
            <span>, votre partenaire pour l'audit SEO</span>
          </div>
        </header>

        {/* Features Section */}
        <div className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Gratuit</h3>
              <p className="text-gray-600 text-sm">Analysez vos pages web sans frais ni inscription</p>
            </div>

            <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Instantané</h3>
              <p className="text-gray-600 text-sm">Obtenez vos résultats d'analyse en quelques secondes</p>
            </div>

            <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Sécurisé</h3>
              <p className="text-gray-600 text-sm">Vos données restent privées et sécurisées</p>
            </div>
          </div>
        </div>
        {!results ? (
          <div className="max-w-lg mx-auto">
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/20">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-2xl mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Analyser une page</h2>
                <p className="text-gray-600">Collez l'URL de la page que vous souhaitez analyser</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* URL Input - Plus proéminent */}
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="https://exemple.com"
                      className="w-full pl-12 pr-4 py-5 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white placeholder-gray-400"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Collez l'URL de la page que vous souhaitez analyser
                  </p>
                </div>

                {/* Bouton d'analyse principal */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-5 text-white font-semibold text-lg rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 ${loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transform hover:-translate-y-1'
                    }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Analyser →
                    </>
                  )}
                </button>

                {/* Section pliable pour les options avancées */}
                <details className="group">
                  <summary className="cursor-pointer text-center text-sm text-gray-600 hover:text-gray-800 transition-colors">
                    <span className="border-b border-dotted border-gray-400">Options avancées</span>
                  </summary>

                  <div className="mt-6 space-y-6 pt-6 border-t border-gray-100">
                    {/* Mode selection */}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700">Mode d'analyse</label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${auditMode === 'fast'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}>
                          <input
                            type="radio"
                            name="mode"
                            value="fast"
                            checked={auditMode === 'fast'}
                            onChange={(e) => setAuditMode(e.target.value as AuditMode)}
                            className="sr-only"
                          />
                          <div className="flex-1 text-center">
                            <div className="text-sm font-semibold text-gray-800">Rapide</div>
                            <div className="text-xs text-gray-500">~15 secondes</div>
                          </div>
                          {auditMode === 'fast' && (
                            <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full"></div>
                          )}
                        </label>

                        <label className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${auditMode === 'complete'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}>
                          <input
                            type="radio"
                            name="mode"
                            value="complete"
                            checked={auditMode === 'complete'}
                            onChange={(e) => setAuditMode(e.target.value as AuditMode)}
                            className="sr-only"
                          />
                          <div className="flex-1 text-center">
                            <div className="text-sm font-semibold text-gray-800">Complet</div>
                            <div className="text-xs text-gray-500">~45 secondes</div>
                          </div>
                          {auditMode === 'complete' && (
                            <div className="absolute top-2 right-2 w-3 h-3 bg-purple-500 rounded-full"></div>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Email Input */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email pour recevoir le rapport (obligatoire)
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="votre.email@exemple.com"
                          className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recevez un rapport complet avec recommandations PDF par email
                      </p>
                    </div>
                  </div>
                </details>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-red-700 font-medium">{error}</span>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <div className="flex-1">
                        <div className="text-blue-800 font-medium">
                          Analyse {auditMode === 'fast' ? 'rapide' : 'complète'} en cours{email && ' + envoi email'}...
                        </div>
                        <div className="text-blue-600 text-sm">
                          ({auditMode === 'fast' ? '~20s' : '~50s'}{email && ' - Génération PDF incluse'})
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header Results */}
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/20">
              {emailSent && (
                <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-green-800">
                        Rapport envoyé par email à {email}
                      </h3>
                      <p className="text-green-700 text-sm mt-1">
                        Vérifiez votre boîte de réception (et vos spams) pour le rapport PDF complet.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
                <div className="mb-4 lg:mb-0">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Résultats pour {domain}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Mode {results.mode}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {Math.round(results.executionTime / 1000)}s
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  {!emailSent && (
                    <button
                      onClick={downloadPdf}
                      disabled={loading}
                      className={`px-6 py-3 text-white rounded-xl flex items-center gap-2 transition-all ${loading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {loading ? 'Génération...' : 'Télécharger PDF'}
                    </button>
                  )}
                  <button
                    onClick={resetForm}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Nouvel audit
                  </button>
                </div>
              </div>

              {/* Lighthouse Scores */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border border-orange-100">
                  <div className={`text-4xl font-bold mb-2 ${getScoreColor(results.lighthouse.performance)}`}>
                    {results.lighthouse.performance}
                  </div>
                  <div className="text-gray-600 font-medium">Performance</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${results.lighthouse.performance >= 80 ? 'bg-green-500' : results.lighthouse.performance >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${results.lighthouse.performance}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                  <div className={`text-4xl font-bold mb-2 ${getScoreColor(results.lighthouse.seo)}`}>
                    {results.lighthouse.seo}
                  </div>
                  <div className="text-gray-600 font-medium">SEO</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${results.lighthouse.seo >= 80 ? 'bg-green-500' : results.lighthouse.seo >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${results.lighthouse.seo}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
                  <div className={`text-4xl font-bold mb-2 ${getScoreColor(results.lighthouse.accessibility)}`}>
                    {results.lighthouse.accessibility}
                  </div>
                  <div className="text-gray-600 font-medium">Accessibilité</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${results.lighthouse.accessibility >= 80 ? 'bg-green-500' : results.lighthouse.accessibility >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${results.lighthouse.accessibility}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl border border-green-100">
                  <div className={`text-4xl font-bold mb-2 ${getScoreColor(results.lighthouse.bestPractices)}`}>
                    {results.lighthouse.bestPractices}
                  </div>
                  <div className="text-gray-600 font-medium">Bonnes Pratiques</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${results.lighthouse.bestPractices >= 80 ? 'bg-green-500' : results.lighthouse.bestPractices >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${results.lighthouse.bestPractices}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* SEO Basic Results */}
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Analyse SEO de base</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">Titre</span>
                    <span className={`text-sm ${results.seoBasic.title ? 'text-green-600' : 'text-red-600'}`}>
                      {results.seoBasic.title ? '✅ Présent' : '❌ Manquant'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">Meta description</span>
                    <span className={`text-sm ${results.seoBasic.description ? 'text-green-600' : 'text-red-600'}`}>
                      {results.seoBasic.description ? '✅ Présente' : '❌ Manquante'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">H1 ({results.seoBasic.h1.length})</span>
                    <span className={`text-sm ${results.seoBasic.h1.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {results.seoBasic.h1.length > 0 ? '✅ Présent' : '❌ Aucun'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">Canonical</span>
                    <span className={`text-sm ${results.seoBasic.canonical ? 'text-green-600' : 'text-red-600'}`}>
                      {results.seoBasic.canonical ? '✅ Présent' : '❌ Manquant'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">Robots.txt</span>
                    <span className={`text-sm ${results.seoBasic.hasRobotsTxt ? 'text-green-600' : 'text-red-600'}`}>
                      {results.seoBasic.hasRobotsTxt ? '✅ Présent' : '❌ Absent'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">Sitemap</span>
                    <span className={`text-sm ${results.seoBasic.hasSitemap ? 'text-green-600' : 'text-red-600'}`}>
                      {results.seoBasic.hasSitemap ? '✅ Présent' : '❌ Absent'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security & RGPD Results */}
            {results.security && (
              <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">Sécurité & RGPD</h3>
                </div>

                {/* Security Score */}
                <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-red-800">Score de Sécurité</h4>
                    <div className="text-3xl font-bold text-red-600">{results.security.headerScore}%</div>
                  </div>
                  <div className="w-full bg-red-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${results.security.headerScore}%` }}
                    ></div>
                  </div>
                </div>

                {/* Security Headers Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">HTTPS</span>
                    <span className={`text-sm font-semibold ${results.security.https ? 'text-green-600' : 'text-red-600'}`}>
                      {results.security.https ? '✅ Activé' : '❌ Absent'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">CSP</span>
                    <span className={`text-sm font-semibold ${results.security.headers.contentSecurityPolicy ? 'text-green-600' : 'text-red-600'}`}>
                      {results.security.headers.contentSecurityPolicy ? '✅ Présent' : '❌ Absent'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">HSTS</span>
                    <span className={`text-sm font-semibold ${results.security.headers.strictTransportSecurity ? 'text-green-600' : 'text-red-600'}`}>
                      {results.security.headers.strictTransportSecurity ? '✅ Présent' : '❌ Absent'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">X-Frame</span>
                    <span className={`text-sm font-semibold ${results.security.headers.xFrameOptions ? 'text-green-600' : 'text-red-600'}`}>
                      {results.security.headers.xFrameOptions ? '✅ Présent' : '❌ Absent'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">X-Content-Type</span>
                    <span className={`text-sm font-semibold ${results.security.headers.xContentTypeOptions ? 'text-green-600' : 'text-red-600'}`}>
                      {results.security.headers.xContentTypeOptions ? '✅ Présent' : '❌ Absent'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">Referrer Policy</span>
                    <span className={`text-sm font-semibold ${results.security.headers.referrerPolicy ? 'text-green-600' : 'text-red-600'}`}>
                      {results.security.headers.referrerPolicy ? '✅ Présent' : '❌ Absent'}
                    </span>
                  </div>
                </div>

                {/* RGPD Info (mode complet seulement) */}
                {results.rgpd && (
                  <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                    <h4 className="text-lg font-semibold text-blue-800 mb-4">Conformité RGPD</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className={`text-2xl mb-1 ${results.rgpd.hasCookieBanner ? 'text-green-600' : 'text-red-600'}`}>
                          {results.rgpd.hasCookieBanner ? '✅' : '❌'}
                        </div>
                        <div className="text-sm text-gray-700">Bandeau cookies</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl mb-1 ${results.rgpd.hasPrivacyPolicy ? 'text-green-600' : 'text-red-600'}`}>
                          {results.rgpd.hasPrivacyPolicy ? '✅' : '❌'}
                        </div>
                        <div className="text-sm text-gray-700">Politique de confidentialité</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl mb-1 ${results.rgpd.hasTermsOfService ? 'text-green-600' : 'text-red-600'}`}>
                          {results.rgpd.hasTermsOfService ? '✅' : '❌'}
                        </div>
                        <div className="text-sm text-gray-700">Mentions légales</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl mb-1 ${results.rgpd.cookieConsentDetected ? 'text-green-600' : 'text-red-600'}`}>
                          {results.rgpd.cookieConsentDetected ? '✅' : '❌'}
                        </div>
                        <div className="text-sm text-gray-700">Consentement GDPR</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cookies Info (mode complet seulement) */}
                {results.cookies && (
                  <div className="mb-6 p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl border border-orange-100">
                    <h4 className="text-lg font-semibold text-orange-800 mb-4">
                      Cookies ({results.cookies.total} total, {results.cookies.thirdParty} tiers)
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-4 bg-white rounded-xl">
                        <div className="text-2xl font-bold text-orange-600 mb-1">{results.cookies.total}</div>
                        <div className="text-sm text-gray-700">Total cookies</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-xl">
                        <div className="text-2xl font-bold text-red-600 mb-1">{results.cookies.thirdParty}</div>
                        <div className="text-sm text-gray-700">Cookies tiers</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-xl">
                        <div className="text-2xl font-bold text-green-600 mb-1">{results.cookies.hasSecureFlags}/{results.cookies.total}</div>
                        <div className="text-sm text-gray-700">Sécurisés</div>
                      </div>
                    </div>
                    {results.cookies.details.length > 0 && (
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-orange-700 hover:text-orange-800 transition-colors">
                          Voir le détail des cookies →
                        </summary>
                        <div className="mt-4 max-h-32 overflow-y-auto bg-white rounded-xl p-4">
                          {results.cookies.details.map((cookie, index) => (
                            <div key={index} className="text-xs p-2 border-b border-gray-100 last:border-b-0">
                              <div className="flex items-center justify-between">
                                <strong className="text-gray-800">{cookie.name}</strong>
                                <div className="flex gap-2">
                                  {cookie.isThirdParty && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">Tiers</span>}
                                  {cookie.secure && cookie.httpOnly && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Sécurisé</span>}
                                </div>
                              </div>
                              <div className="text-gray-500 mt-1">{cookie.domain}</div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {/* Security Recommendations */}
                {results.securityRecommendations && results.securityRecommendations.length > 0 && (
                  <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl border border-red-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-red-800">Recommandations Sécurité</h4>
                    </div>
                    <ul className="space-y-2">
                      {results.securityRecommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-red-700">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span className="text-sm">{rec}</span>
                        </li>
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
                  <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-yellow-800">Recommandations SEO</h4>
                    </div>
                    <div className="space-y-2">
                      {results.seoAdvanced.recommendations.map((rec: string, index: number) => (
                        <div key={`seo-rec-${index}`} className="flex items-start gap-2 text-yellow-700">
                          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Performance Results */}
            {results.lighthouse && (
              <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">Performance Détaillée</h3>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">{results.lighthouse.performance || 'N/A'}</div>
                      <div className="text-sm text-blue-700 font-medium">Score Performance</div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 mb-1">{results.lighthouse.accessibility || 'N/A'}</div>
                      <div className="text-sm text-green-700 font-medium">Accessibilité</div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 mb-1">{results.lighthouse.bestPractices || 'N/A'}</div>
                      <div className="text-sm text-purple-700 font-medium">Bonnes Pratiques</div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 mb-1">{results.lighthouse.seo || 'N/A'}</div>
                      <div className="text-sm text-orange-700 font-medium">SEO</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security & RGPD Results */}
            {results.security && (
              <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">Sécurité & RGPD</h3>
                </div>

                {/* Security Score */}
                <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-red-800">Score de Sécurité</h4>
                    <div className="text-3xl font-bold text-red-600">{results.security.headerScore}%</div>
                  </div>
                  <div className="w-full bg-red-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${results.security.headerScore}%` }}
                    ></div>
                  </div>
                </div>

                {/* Security Headers Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">HTTPS</span>
                    <span className={`text-sm font-semibold ${results.security.https ? 'text-green-600' : 'text-red-600'}`}>
                      {results.security.https ? '✅ Activé' : '❌ Absent'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">CSP</span>
                    <span className={`text-sm font-semibold ${results.security.headers.contentSecurityPolicy ? 'text-green-600' : 'text-red-600'}`}>
                      {results.security.headers.contentSecurityPolicy ? '✅ Présent' : '❌ Absent'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">HSTS</span>
                    <span className={`text-sm font-semibold ${results.security.headers.strictTransportSecurity ? 'text-green-600' : 'text-red-600'}`}>
                      {results.security.headers.strictTransportSecurity ? '✅ Présent' : '❌ Absent'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">X-Frame</span>
                    <span className={`text-sm font-semibold ${results.security.headers.xFrameOptions ? 'text-green-600' : 'text-red-600'}`}>
                      {results.security.headers.xFrameOptions ? '✅ Présent' : '❌ Absent'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">X-Content-Type</span>
                    <span className={`text-sm font-semibold ${results.security.headers.xContentTypeOptions ? 'text-green-600' : 'text-red-600'}`}>
                      {results.security.headers.xContentTypeOptions ? '✅ Présent' : '❌ Absent'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">Referrer Policy</span>
                    <span className={`text-sm font-semibold ${results.security.headers.referrerPolicy ? 'text-green-600' : 'text-red-600'}`}>
                      {results.security.headers.referrerPolicy ? '✅ Présent' : '❌ Absent'}
                    </span>
                  </div>
                </div>

                {/* RGPD Info (mode complet seulement) */}
                {results.rgpd && (
                  <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                    <h4 className="text-lg font-semibold text-blue-800 mb-4">Conformité RGPD</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className={`text-2xl mb-1 ${results.rgpd.hasCookieBanner ? 'text-green-600' : 'text-red-600'}`}>
                          {results.rgpd.hasCookieBanner ? '✅' : '❌'}
                        </div>
                        <div className="text-sm text-gray-700">Bandeau cookies</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl mb-1 ${results.rgpd.hasPrivacyPolicy ? 'text-green-600' : 'text-red-600'}`}>
                          {results.rgpd.hasPrivacyPolicy ? '✅' : '❌'}
                        </div>
                        <div className="text-sm text-gray-700">Politique de confidentialité</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl mb-1 ${results.rgpd.hasTermsOfService ? 'text-green-600' : 'text-red-600'}`}>
                          {results.rgpd.hasTermsOfService ? '✅' : '❌'}
                        </div>
                        <div className="text-sm text-gray-700">Mentions légales</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl mb-1 ${results.rgpd.cookieConsentDetected ? 'text-green-600' : 'text-red-600'}`}>
                          {results.rgpd.cookieConsentDetected ? '✅' : '❌'}
                        </div>
                        <div className="text-sm text-gray-700">Consentement GDPR</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cookies Info (mode complet seulement) */}
                {results.cookies && (
                  <div className="mb-6 p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl border border-orange-100">
                    <h4 className="text-lg font-semibold text-orange-800 mb-4">
                      Cookies ({results.cookies.total} total, {results.cookies.thirdParty} tiers)
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-4 bg-white rounded-xl">
                        <div className="text-2xl font-bold text-orange-600 mb-1">{results.cookies.total}</div>
                        <div className="text-sm text-gray-700">Total cookies</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-xl">
                        <div className="text-2xl font-bold text-red-600 mb-1">{results.cookies.thirdParty}</div>
                        <div className="text-sm text-gray-700">Cookies tiers</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-xl">
                        <div className="text-2xl font-bold text-green-600 mb-1">{results.cookies.hasSecureFlags}/{results.cookies.total}</div>
                        <div className="text-sm text-gray-700">Sécurisés</div>
                      </div>
                    </div>
                    {results.cookies.details.length > 0 && (
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-orange-700 hover:text-orange-800 transition-colors">
                          Voir le détail des cookies →
                        </summary>
                        <div className="mt-4 max-h-32 overflow-y-auto bg-white rounded-xl p-4">
                          {results.cookies.details.map((cookie, index) => (
                            <div key={index} className="text-xs p-2 border-b border-gray-100 last:border-b-0">
                              <div className="flex items-center justify-between">
                                <strong className="text-gray-800">{cookie.name}</strong>
                                <div className="flex gap-2">
                                  {cookie.isThirdParty && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">Tiers</span>}
                                  {cookie.secure && cookie.httpOnly && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Sécurisé</span>}
                                </div>
                              </div>
                              <div className="text-gray-500 mt-1">{cookie.domain}</div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {/* Security Recommendations */}
                {results.securityRecommendations && results.securityRecommendations.length > 0 && (
                  <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl border border-red-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-red-800">Recommandations Sécurité</h4>
                    </div>
                    <div className="space-y-2">
                      {results.securityRecommendations.map((rec: string, index: number) => (
                        <div key={`sec-rec-${index}`} className="flex items-start gap-2 text-red-700">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
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
