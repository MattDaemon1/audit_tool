import fs from 'fs';
import path from 'path';
import { prisma } from './database';

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

    async logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>) {
        const logEntry: SecurityEvent = {
            ...event,
            timestamp: new Date().toISOString(),
            ip: this.sanitizeForLog(event.ip),
            userAgent: event.userAgent ? this.sanitizeForLog(event.userAgent) : undefined,
            domain: event.domain ? this.sanitizeForLog(event.domain) : undefined,
            email: event.email ? this.sanitizeForLog(event.email) : undefined,
            message: this.sanitizeForLog(event.message)
        };

        // Sauvegarder en base de données ET en fichier
        try {
            // Base de données (principal)
            await prisma.securityLog.create({
                data: {
                    type: logEntry.type,
                    severity: logEntry.severity,
                    ipAddress: logEntry.ip,
                    userAgent: logEntry.userAgent,
                    domain: logEntry.domain,
                    email: logEntry.email,
                    message: logEntry.message,
                    details: event.userAgent ? { userAgent: event.userAgent } : null
                }
            });

            // Fichier (backup)
            const logLine = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(this.logFile, logLine);

            // Console log pour les événements critiques
            if (event.severity === 'critical' || event.severity === 'high') {
                console.error(`[SECURITY] ${event.type.toUpperCase()}: ${event.message}`);
            }
        } catch (error) {
            console.error('Erreur lors de l\'écriture du log de sécurité:', error);

            // En cas d'erreur DB, au moins sauver en fichier
            try {
                const logLine = JSON.stringify(logEntry) + '\n';
                fs.appendFileSync(this.logFile, logLine);
            } catch (fileError) {
                console.error('Erreur critique: impossible de logger l\'événement de sécurité');
            }
        }
    }

    async logSuspiciousActivity(ip: string, userAgent: string | undefined, reason: string) {
        await this.logSecurityEvent({
            type: 'security',
            ip,
            userAgent,
            message: `Activité suspecte détectée: ${reason}`,
            severity: 'high'
        });
    }

    async logRateLimitExceeded(ip: string, userAgent: string | undefined, endpoint: string) {
        await this.logSecurityEvent({
            type: 'rate_limit',
            ip,
            userAgent,
            message: `Limite de taux dépassée pour l'endpoint: ${endpoint}`,
            severity: 'medium'
        });
    }

    async logAuditRequest(ip: string, userAgent: string | undefined, domain: string, email: string, mode: string) {
        await this.logSecurityEvent({
            type: 'audit',
            ip,
            userAgent,
            domain,
            email,
            message: `Demande d'audit ${mode} pour ${domain}`,
            severity: 'low'
        });
    }

    async logSecurityError(ip: string, userAgent: string | undefined, error: string) {
        await this.logSecurityEvent({
            type: 'error',
            ip,
            userAgent,
            message: `Erreur de sécurité: ${error}`,
            severity: 'high'
        });
    }

    // Nouvelles méthodes pour exploiter la base de données

    // Récupérer les événements de sécurité récents
    async getRecentSecurityEvents(limit: number = 50, severity?: string) {
        try {
            return await prisma.securityLog.findMany({
                where: severity ? { severity } : undefined,
                orderBy: { createdAt: 'desc' },
                take: limit
            });
        } catch (error) {
            console.error('Erreur récupération événements sécurité:', error);
            return [];
        }
    }

    // Récupérer les IPs les plus suspectes
    async getSuspiciousIPs(limit: number = 10) {
        try {
            const suspiciousIPs = await prisma.securityLog.groupBy({
                by: ['ipAddress'],
                where: {
                    severity: {
                        in: ['high', 'critical']
                    }
                },
                _count: {
                    ipAddress: true
                },
                orderBy: {
                    _count: {
                        ipAddress: 'desc'
                    }
                },
                take: limit
            });

            return suspiciousIPs.map((ip: any) => ({
                ip: ip.ipAddress,
                count: ip._count.ipAddress
            }));
        } catch (error) {
            console.error('Erreur récupération IPs suspectes:', error);
            return [];
        }
    }

    // Statistiques de sécurité
    async getSecurityStatistics() {
        try {
            const stats = await prisma.securityLog.groupBy({
                by: ['type', 'severity'],
                _count: {
                    type: true
                }
            });

            const result: Record<string, Record<string, number>> = {};
            stats.forEach((stat: any) => {
                if (!result[stat.type]) {
                    result[stat.type] = {};
                }
                result[stat.type][stat.severity] = stat._count.type;
            });

            return result;
        } catch (error) {
            console.error('Erreur statistiques sécurité:', error);
            return {};
        }
    }

    // Nettoyer les anciens logs (plus de X jours)
    async cleanupOldLogs(daysToKeep: number = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const deleted = await prisma.securityLog.deleteMany({
                where: {
                    createdAt: {
                        lt: cutoffDate
                    }
                }
            });

            console.log(`Supprimé ${deleted.count} logs de sécurité anciens`);
            return deleted.count;
        } catch (error) {
            console.error('Erreur nettoyage logs sécurité:', error);
            return 0;
        }
    }
}

export const securityLogger = new SecurityLogger();