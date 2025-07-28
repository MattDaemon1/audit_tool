// Types partagés pour l'application
export type AuditMode = 'fast' | 'complete'

export interface AuditResult {
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
