import { PrismaClient } from '@prisma/client'

// Instance globale Prisma pour éviter les connexions multiples en développement
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Fonction de nettoyage pour fermer la connexion proprement
export async function disconnectDatabase() {
    await prisma.$disconnect()
}
