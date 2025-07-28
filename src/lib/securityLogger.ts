import fs from 'fs';
import path from 'path';

interface SecurityEvent {
    timestamp: string;
    type: 'security' | 'audit' | 'error' | 'rate_limit';
    ip: string;
    userAgent?: string;
    domain?: string;
    email?: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

class SecurityLogger {
    private logDir: string;
    private logFile: string;

    constructor() {
        this.logDir = path.join(process.cwd(), 'logs');
        this.logFile = path.join(this.logDir, 'security.log');
        this.ensureLogDir();
    }

    private ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private sanitizeForLog(data: any): string {
        if (typeof data === 'string') {
            // Retire les caractères potentiellement dangereux pour les logs
            return data.replace(/[\r\n\t]/g, ' ').substring(0, 500);
        }
        return JSON.stringify(data).substring(0, 500);
    }

    logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>) {
        const logEntry: SecurityEvent = {
            ...event,
            timestamp: new Date().toISOString(),
            ip: this.sanitizeForLog(event.ip),
            userAgent: event.userAgent ? this.sanitizeForLog(event.userAgent) : undefined,
            domain: event.domain ? this.sanitizeForLog(event.domain) : undefined,
            email: event.email ? this.sanitizeForLog(event.email) : undefined,
            message: this.sanitizeForLog(event.message)
        };

        const logLine = JSON.stringify(logEntry) + '\n';

        try {
            fs.appendFileSync(this.logFile, logLine);

            // Console log pour les événements critiques
            if (event.severity === 'critical' || event.severity === 'high') {
                console.error(`[SECURITY] ${event.type.toUpperCase()}: ${event.message}`);
            }
        } catch (error) {
            console.error('Erreur lors de l\'écriture du log de sécurité:', error);
        }
    }

    logSuspiciousActivity(ip: string, userAgent: string | undefined, reason: string) {
        this.logSecurityEvent({
            type: 'security',
            ip,
            userAgent,
            message: `Activité suspecte détectée: ${reason}`,
            severity: 'high'
        });
    }

    logRateLimitExceeded(ip: string, userAgent: string | undefined, endpoint: string) {
        this.logSecurityEvent({
            type: 'rate_limit',
            ip,
            userAgent,
            message: `Limite de taux dépassée pour l'endpoint: ${endpoint}`,
            severity: 'medium'
        });
    }

    logAuditRequest(ip: string, userAgent: string | undefined, domain: string, email: string, mode: string) {
        this.logSecurityEvent({
            type: 'audit',
            ip,
            userAgent,
            domain,
            email,
            message: `Demande d'audit ${mode} pour ${domain}`,
            severity: 'low'
        });
    }

    logSecurityError(ip: string, userAgent: string | undefined, error: string) {
        this.logSecurityEvent({
            type: 'error',
            ip,
            userAgent,
            message: `Erreur de sécurité: ${error}`,
            severity: 'high'
        });
    }
}

export const securityLogger = new SecurityLogger();
