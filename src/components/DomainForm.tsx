'use client'

import { useState } from 'react'

interface AuditResult {
    seo: number
    performance: number
    accessibility: number
    bestPractices: number
    seoDetails?: any
}

export default function DomainForm() {
    const [domain, setDomain] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<AuditResult | null>(null)
    const [error, setError] = useState('')

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
                body: JSON.stringify({ domain }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Erreur inconnue')
            }

            setResults(data.scores)
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

    return (
        <div className="max-w-4xl mx-auto">
            {!results ? (
                <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Entrez le domaine à auditer</h2>
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
                    {loading && <p className="text-blue-500 mb-4">Audit en cours... Cela peut prendre jusqu'à 30 secondes.</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 text-white font-semibold rounded ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {loading ? 'Analyse en cours...' : 'Lancer audit'}
                    </button>
                </form>
            ) : (
                <div>
                    {/* Scores Overview */}
                    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Résultats de l'audit pour {domain}</h2>
                            <button
                                onClick={resetForm}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Nouvel audit
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className={`text-3xl font-bold ${getScoreColor(results.performance)}`}>
                                    {results.performance}
                                </div>
                                <div className="text-gray-600">Performance</div>
                            </div>
                            <div className="text-center">
                                <div className={`text-3xl font-bold ${getScoreColor(results.seo)}`}>
                                    {results.seo}
                                </div>
                                <div className="text-gray-600">SEO</div>
                            </div>
                            <div className="text-center">
                                <div className={`text-3xl font-bold ${getScoreColor(results.accessibility)}`}>
                                    {results.accessibility}
                                </div>
                                <div className="text-gray-600">Accessibilité</div>
                            </div>
                            <div className="text-center">
                                <div className={`text-3xl font-bold ${getScoreColor(results.bestPractices)}`}>
                                    {results.bestPractices}
                                </div>
                                <div className="text-gray-600">Bonnes Pratiques</div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed SEO Results - Version simplifiée */}
                    {results.seoDetails && (
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-xl font-semibold mb-4">Analyse SEO Détaillée</h3>

                            {/* Recommandations */}
                            {results.seoDetails.recommendations && results.seoDetails.recommendations.length > 0 && (
                                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                    <h4 className="text-lg font-semibold mb-3 text-yellow-800">Recommandations</h4>
                                    <ul className="space-y-2">
                                        {results.seoDetails.recommendations.map((recommendation: string, index: number) => (
                                            <li key={`rec-${index}`} className="flex items-start">
                                                <span className="text-yellow-600 mr-2">•</span>
                                                <span className="text-yellow-700">{recommendation}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}