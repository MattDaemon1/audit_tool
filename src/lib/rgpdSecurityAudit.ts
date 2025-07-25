import puppeteer from 'puppeteer';

export interface SecurityHeaders {
    contentSecurityPolicy: boolean;
    strictTransportSecurity: boolean;
    xFrameOptions: boolean;
    xContentTypeOptions: boolean;
    referrerPolicy: boolean;
    permissionsPolicy: boolean;
}

export interface CookieInfo {
    name: string;
    domain: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: string | undefined;
    isThirdParty: boolean;
}

export interface RgpdSecurityResult {
    security: {
        https: boolean;
        headers: SecurityHeaders;
        headerScore: number;
    };
    cookies: {
        total: number;
        thirdParty: number;
        hasSecureFlags: number;
        details: CookieInfo[];
    };
    rgpd: {
        hasCookieBanner: boolean;
        hasPrivacyPolicy: boolean;
        hasTermsOfService: boolean;
        cookieConsentDetected: boolean;
    };
    recommendations: string[];
}

export async function performBasicSecurityAudit(domain: string): Promise<Partial<RgpdSecurityResult>> {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;

    try {
        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow'
        });

        const headers = response.headers;

        const securityHeaders: SecurityHeaders = {
            contentSecurityPolicy: headers.has('content-security-policy'),
            strictTransportSecurity: headers.has('strict-transport-security'),
            xFrameOptions: headers.has('x-frame-options'),
            xContentTypeOptions: headers.has('x-content-type-options'),
            referrerPolicy: headers.has('referrer-policy'),
            permissionsPolicy: headers.has('permissions-policy')
        };

        const headerScore = Object.values(securityHeaders).filter(Boolean).length;

        const recommendations: string[] = [];

        if (!securityHeaders.contentSecurityPolicy) {
            recommendations.push("Ajouter un header Content-Security-Policy");
        }
        if (!securityHeaders.strictTransportSecurity) {
            recommendations.push("Ajouter un header Strict-Transport-Security (HSTS)");
        }
        if (!securityHeaders.xFrameOptions) {
            recommendations.push("Ajouter un header X-Frame-Options");
        }
        if (!securityHeaders.xContentTypeOptions) {
            recommendations.push("Ajouter un header X-Content-Type-Options");
        }

        return {
            security: {
                https: url.startsWith('https'),
                headers: securityHeaders,
                headerScore: Math.round((headerScore / 6) * 100)
            },
            recommendations
        };

    } catch (error) {
        console.error('Erreur audit sécurité basique:', error);
        return {
            security: {
                https: false,
                headers: {
                    contentSecurityPolicy: false,
                    strictTransportSecurity: false,
                    xFrameOptions: false,
                    xContentTypeOptions: false,
                    referrerPolicy: false,
                    permissionsPolicy: false
                },
                headerScore: 0
            },
            recommendations: ["Impossible d'analyser les headers de sécurité"]
        };
    }
}

export async function performAdvancedRgpdSecurityAudit(domain: string): Promise<RgpdSecurityResult> {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Intercepter les cookies
        const cookies: CookieInfo[] = [];

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Analyser les cookies
        const pageCookies = await page.cookies();
        const mainDomain = new URL(url).hostname;

        for (const cookie of pageCookies) {
            cookies.push({
                name: cookie.name,
                domain: cookie.domain,
                httpOnly: cookie.httpOnly || false,
                secure: cookie.secure || false,
                sameSite: cookie.sameSite,
                isThirdParty: !cookie.domain.includes(mainDomain)
            });
        }

        // Détecter bandeau cookies et éléments RGPD
        const rgpdElements = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            const links = Array.from(document.querySelectorAll('a')).map(a => a.textContent?.toLowerCase() || '');

            return {
                hasCookieBanner: !!(
                    document.querySelector('[class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"]') ||
                    text.includes('cookie') ||
                    text.includes('consentement') ||
                    text.includes('accepter')
                ),
                hasPrivacyPolicy: links.some(link =>
                    link.includes('politique de confidentialité') ||
                    link.includes('privacy policy') ||
                    link.includes('vie privée')
                ),
                hasTermsOfService: links.some(link =>
                    link.includes('conditions d\'utilisation') ||
                    link.includes('terms of service') ||
                    link.includes('mentions légales')
                ),
                cookieConsentDetected: !!(
                    document.querySelector('[class*="gdpr"], [id*="gdpr"], [class*="cookieConsent"]') ||
                    text.includes('gdpr') ||
                    text.includes('rgpd')
                )
            };
        });

        // Analyser les headers de sécurité
        const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
        const responseHeaders = response?.headers() || {};

        const securityHeaders: SecurityHeaders = {
            contentSecurityPolicy: 'content-security-policy' in responseHeaders,
            strictTransportSecurity: 'strict-transport-security' in responseHeaders,
            xFrameOptions: 'x-frame-options' in responseHeaders,
            xContentTypeOptions: 'x-content-type-options' in responseHeaders,
            referrerPolicy: 'referrer-policy' in responseHeaders,
            permissionsPolicy: 'permissions-policy' in responseHeaders
        };

        const headerScore = Object.values(securityHeaders).filter(Boolean).length;
        const thirdPartyCookies = cookies.filter(c => c.isThirdParty).length;
        const secureCookies = cookies.filter(c => c.secure && c.httpOnly).length;

        // Générer recommandations
        const recommendations: string[] = [];

        // Sécurité
        if (!securityHeaders.contentSecurityPolicy) {
            recommendations.push("Implémenter une Content Security Policy (CSP)");
        }
        if (!securityHeaders.strictTransportSecurity) {
            recommendations.push("Activer HSTS pour forcer HTTPS");
        }
        if (!securityHeaders.xFrameOptions) {
            recommendations.push("Ajouter X-Frame-Options pour prévenir le clickjacking");
        }

        // RGPD
        if (!rgpdElements.hasCookieBanner && cookies.length > 0) {
            recommendations.push("Ajouter un bandeau de consentement aux cookies (RGPD)");
        }
        if (!rgpdElements.hasPrivacyPolicy) {
            recommendations.push("Créer une politique de confidentialité");
        }
        if (thirdPartyCookies > 0 && !rgpdElements.cookieConsentDetected) {
            recommendations.push("Implémenter un système de consentement GDPR pour les cookies tiers");
        }

        // Cookies
        if (cookies.length > 0 && secureCookies < cookies.length) {
            recommendations.push("Sécuriser tous les cookies (flags Secure et HttpOnly)");
        }

        return {
            security: {
                https: url.startsWith('https'),
                headers: securityHeaders,
                headerScore: Math.round((headerScore / 6) * 100)
            },
            cookies: {
                total: cookies.length,
                thirdParty: thirdPartyCookies,
                hasSecureFlags: secureCookies,
                details: cookies
            },
            rgpd: rgpdElements,
            recommendations
        };

    } catch (error) {
        console.error('Erreur audit RGPD/Sécurité avancé:', error);

        // Fallback sur audit basique
        const basicResult = await performBasicSecurityAudit(domain);

        return {
            security: basicResult.security || {
                https: false,
                headers: {
                    contentSecurityPolicy: false,
                    strictTransportSecurity: false,
                    xFrameOptions: false,
                    xContentTypeOptions: false,
                    referrerPolicy: false,
                    permissionsPolicy: false
                },
                headerScore: 0
            },
            cookies: {
                total: 0,
                thirdParty: 0,
                hasSecureFlags: 0,
                details: []
            },
            rgpd: {
                hasCookieBanner: false,
                hasPrivacyPolicy: false,
                hasTermsOfService: false,
                cookieConsentDetected: false
            },
            recommendations: basicResult.recommendations || ["Erreur lors de l'audit RGPD/Sécurité"]
        };
    } finally {
        await browser.close();
    }
}
