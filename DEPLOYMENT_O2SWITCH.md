# Guide de Déploiement o2switch

## 📋 Préparation du Déploiement

### 1. Build de Production
✅ **TERMINÉ** - La build production a été compilée avec succès
```bash
npm run build
```

### 2. Fichiers à Transférer

#### Dossiers Obligatoires :
- `.next/` (dossier généré par la build)
- `public/` (assets statiques)
- `node_modules/` (dépendances)
- `src/` (code source)

#### Fichiers de Configuration :
- `package.json`
- `next.config.ts`
- `.env.local` (à créer sur le serveur)
- `tsconfig.json`
- `postcss.config.mjs`
- `eslint.config.mjs`

## 🔧 Configuration Serveur o2switch

### 1. Variables d'Environnement (.env.local)
Créer ce fichier à la racine sur o2switch :
```env
# API Brevo
BREVO_API_KEY=votre_clé_brevo
BREVO_SENDER_EMAIL=votre_email@domaine.com
BREVO_SENDER_NAME=Nom Expéditeur

# Configuration Next.js
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://votre-domaine.com
```

### 2. Configuration Node.js sur o2switch

#### Version Node.js Recommandée :
- **Node.js 18.x ou 20.x** (vérifier la compatibilité o2switch)

#### Commandes d'Installation :
```bash
# Sur le serveur o2switch
npm install --production
npm run build
```

### 3. Configuration du Serveur Web

#### Option A : Serveur Node.js Standalone
```bash
# Démarrage en production
npm start
```

#### Option B : Configuration Apache/Nginx (Reverse Proxy)
Si o2switch utilise Apache, configurer un reverse proxy vers le port Next.js (3000 par défaut).

## 📁 Structure de Déploiement

```
votre-domaine/
├── .env.local (à créer)
├── .next/ (généré par build)
├── node_modules/ (npm install)
├── public/
├── src/
├── package.json
├── next.config.ts
└── autres fichiers config...
```

## 🚀 Étapes de Déploiement

### 1. Préparation Locale
```bash
# Vérifier que la build fonctionne
npm run build
npm start
```

### 2. Transfert FTP/SFTP
- Compresser le projet (sans node_modules pour gagner du temps)
- Uploader via FTP/SFTP o2switch
- Décompresser sur le serveur

### 3. Installation sur Serveur
```bash
# Sur o2switch
npm install --production
npm run build
```

### 4. Configuration Variables
- Créer le fichier `.env.local`
- Ajouter vos clés API Brevo
- Configurer l'URL de base

### 5. Test et Démarrage
```bash
# Test local
npm start

# Accès : https://votre-domaine.com
```

## ⚙️ Configuration Spécifique o2switch

### Fichier .htaccess (si nécessaire)
```apache
RewriteEngine On
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

### Script de Démarrage Automatique
Créer un fichier `start.sh` :
```bash
#!/bin/bash
cd /path/to/your/app
npm start
```

## 🔍 Tests Post-Déploiement

### Fonctionnalités à Tester :
1. ✅ Page d'accueil
2. ✅ Formulaire d'audit
3. ✅ Génération PDF
4. ✅ Envoi email
5. ✅ API endpoints

### URLs de Test :
- `/` - Page principale
- `/api/audit` - API d'audit
- `/api/send-audit` - Envoi email

## 🛠️ Troubleshooting

### Problèmes Fréquents :

#### 1. Erreur Node.js Version
```bash
# Vérifier version
node --version
npm --version
```

#### 2. Permissions Fichiers
```bash
chmod -R 755 /path/to/app
chmod 644 .env.local
```

#### 3. Port Occupé
Modifier le port dans `package.json` :
```json
{
  "scripts": {
    "start": "next start -p 3001"
  }
}
```

## 📞 Support o2switch

- Documentation Node.js : [o2switch Node.js](https://faq.o2switch.fr/)
- Support technique o2switch
- Vérifier les limitations hébergement mutualisé vs VPS

---

## 📋 Checklist Finale

- [ ] Build production réussie ✅
- [ ] Fichiers uploadés sur o2switch
- [ ] Variables d'environnement configurées
- [ ] npm install exécuté
- [ ] npm run build exécuté
- [ ] Application démarrée
- [ ] Tests fonctionnels OK
- [ ] Monitoring et logs configurés

**Status Actuel : Prêt pour le déploiement** 🚀
