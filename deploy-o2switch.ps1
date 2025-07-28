# Script PowerShell pour déploiement o2switch
# Exécuter sur votre serveur o2switch (si PowerShell disponible)

Write-Host "🚀 Installation Audit SEO Tool sur o2switch" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# 1. Vérifier Node.js
Write-Host "📋 Vérification de l'environnement..." -ForegroundColor Yellow
node --version
npm --version

# 2. Installation des dépendances
Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
npm install --production

# 3. Build de production (si nécessaire)
Write-Host "🔨 Build de production..." -ForegroundColor Yellow
npm run build

# 4. Vérification des variables d'environnement
Write-Host "🔧 Vérification configuration..." -ForegroundColor Yellow
if (!(Test-Path ".env.local")) {
    Write-Host "⚠️  ATTENTION: Fichier .env.local manquant !" -ForegroundColor Red
    Write-Host "Copiez le contenu de .env.production.example vers .env.local" -ForegroundColor Red
    Write-Host "Et ajoutez vos vraies clés API" -ForegroundColor Red
    exit 1
}

# 5. Test de démarrage
Write-Host "🧪 Test de démarrage..." -ForegroundColor Yellow
Write-Host "L'application va démarrer en mode production..." -ForegroundColor Cyan
Write-Host "Appuyez sur Ctrl+C pour arrêter le test" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Une fois démarré, testez sur : http://votre-domaine.com" -ForegroundColor Green
Write-Host ""

# Démarrage
npm start
