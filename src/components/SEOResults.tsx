'use client'

import { SEOAuditResult } from '@/lib/seoAudit'

interface SEOResultsProps {
    seoDetails: SEOAuditResult
}

export default function SEOResults({ seoDetails }: SEOResultsProps) {
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600'
        if (score >= 60) return 'text-yellow-600'
        return 'text-red-600'
    }

    const getStatusIcon = (status: boolean) => {
        return status ? '✅' : '❌'
    }

    return (
        <div className="mt-8 space-y-6">
            <h3 className="text-xl font-semibold mb-4">Analyse SEO Détaillée</h3>

            {/* HTML Structure */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h4 className="text-lg font-semibold mb-4 text-blue-600">Structure HTML</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Titre de page:</span>
                            <span>{getStatusIcon(seoDetails.htmlStructure.hasTitle)}
                                {seoDetails.htmlStructure.hasTitle &&
                                    <span className="text-sm text-gray-600">
                                        ({seoDetails.htmlStructure.titleLength} caractères)
                                    </span>
                                }
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Meta description:</span>
                            <span>{getStatusIcon(seoDetails.htmlStructure.hasMetaDescription)}
                                {seoDetails.htmlStructure.hasMetaDescription &&
                                    <span className="text-sm text-gray-600">
                                        ({seoDetails.htmlStructure.metaDescriptionLength} caractères)
                                    </span>
                                }
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Balise H1:</span>
                            <span>{getStatusIcon(seoDetails.htmlStructure.hasH1)}
                                {seoDetails.htmlStructure.hasH1 &&
                                    <span className="text-sm text-gray-600">
                                        ({seoDetails.htmlStructure.h1Count} trouvé(s))
                                    </span>
                                }
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>URL canonique:</span>
                            <span>{getStatusIcon(seoDetails.htmlStructure.hasCanonical)}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Open Graph:</span>
                            <span>{getStatusIcon(seoDetails.htmlStructure.hasOpenGraph)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Twitter Card:</span>
                            <span>{getStatusIcon(seoDetails.htmlStructure.hasTwitterCard)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Viewport:</span>
                            <span>{getStatusIcon(seoDetails.htmlStructure.hasViewport)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Langue définie:</span>
                            <span>{getStatusIcon(seoDetails.htmlStructure.hasLang)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Données structurées:</span>
                            <span>{getStatusIcon(seoDetails.htmlStructure.hasSchemaMarkup)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Technical SEO */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h4 className="text-lg font-semibold mb-4 text-purple-600">SEO Technique</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Robots.txt:</span>
                            <span>{getStatusIcon(seoDetails.technicalSEO.robotsTxtExists)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Sitemap XML:</span>
                            <span>{getStatusIcon(seoDetails.technicalSEO.sitemapExists)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>HTTPS activé:</span>
                            <span>{getStatusIcon(seoDetails.technicalSEO.httpsEnabled)}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Temps de réponse:</span>
                            <span className={seoDetails.technicalSEO.responseTime > 3000 ? 'text-red-600' : 'text-green-600'}>
                                {seoDetails.technicalSEO.responseTime}ms
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Redirection:</span>
                            <span>{seoDetails.technicalSEO.hasRedirect ? '⚠️' : '✅'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Analysis */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h4 className="text-lg font-semibold mb-4 text-green-600">Analyse du Contenu</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Longueur du texte:</span>
                            <span className={seoDetails.content.textLength < 300 ? 'text-red-600' : 'text-green-600'}>
                                {seoDetails.content.textLength} caractères
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Images totales:</span>
                            <span>{seoDetails.content.imageCount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Images sans alt:</span>
                            <span className={seoDetails.content.imagesWithoutAlt > 0 ? 'text-red-600' : 'text-green-600'}>
                                {seoDetails.content.imagesWithoutAlt}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Liens internes:</span>
                            <span>{seoDetails.content.internalLinks}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Liens externes:</span>
                            <span>{seoDetails.content.externalLinks}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <h5 className="font-semibold mb-2">Structure des titres:</h5>
                    <div className="flex flex-wrap gap-4 text-sm">
                        <span>H1: {seoDetails.content.headingsStructure.h1}</span>
                        <span>H2: {seoDetails.content.headingsStructure.h2}</span>
                        <span>H3: {seoDetails.content.headingsStructure.h3}</span>
                        <span>H4: {seoDetails.content.headingsStructure.h4}</span>
                        <span>H5: {seoDetails.content.headingsStructure.h5}</span>
                        <span>H6: {seoDetails.content.headingsStructure.h6}</span>
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            {seoDetails.recommendations.length > 0 && (
                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                    <h4 className="text-lg font-semibold mb-4 text-yellow-800">Recommandations d'Amélioration</h4>
                    <ul className="space-y-2">
                        {seoDetails.recommendations.map((recommendation, index) => (
                            <li key={index} className="flex items-start">
                                <span className="text-yellow-600 mr-2">•</span>
                                <span className="text-yellow-700">{recommendation}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
