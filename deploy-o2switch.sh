#!/bin/bash

# Script de préparation pour déploiement o2switch
# Exécuter sur votre serveur o2switch

echo "🚀 Installation Audit SEO Tool sur o2switch"
echo "============================================"

# 1. Vérifier Node.js
echo "📋 Vérification de l'environnement..."
node --version
npm --version

# 2. Installation des dépendances
echo "📦 Installation des dépendances..."
npm install --production

# 3. Build de production (si nécessaire)
echo "🔨 Build de production..."
npm run build

# 4. Vérification des variables d'environnement
echo "🔧 Vérification configuration..."
if [ ! -f .env.local ]; then
    echo "⚠️  ATTENTION: Fichier .env.local manquant !"
    echo "Copiez le contenu de .env.production.example vers .env.local"
    echo "Et ajoutez vos vraies clés API"
    exit 1
fi

# 5. Test de démarrage
echo "🧪 Test de démarrage..."
echo "L'application va démarrer en mode production..."
echo "Appuyez sur Ctrl+C pour arrêter le test"
echo ""
echo "🌐 Une fois démarré, testez sur : http://votre-domaine.com"
echo ""

# Démarrage
npm start
