# 🚀 Audit Tool - Outil d'Audit SEO Hybride

Un outil moderne d'audit SEO développé avec Next.js 15, proposant deux modes d'analyse : **rapide** et **complet** pour s'adapter à tous les besoins.

## ✨ Fonctionnalités

### ⚡ Mode Rapide (~15 secondes)
- **Lighthouse** : Performance, SEO, Accessibilité, Bonnes pratiques
- **SEO de base** (Cheerio) :
  - Titre et meta description
  - Balises H1
  - URL canonique  
  - Vérification robots.txt et sitemap.xml

### 🔬 Mode Complet (~45 secondes)
- **Toutes les fonctionnalités du mode rapide**
- **Analyse SEO avancée** (Puppeteer) :
  - Structure HTML détaillée (Open Graph, Schema.org)
  - SEO technique approfondi (redirections, HTTPS)
  - Analyse du contenu (images, liens internes/externes)
  - Recommandations personnalisées

## 🛠️ Technologies

- **Next.js 15.4.4** avec TypeScript
- **Lighthouse 12.8.0** pour les métriques core
- **Puppeteer 24.15.0** pour l'analyse avancée  
- **Cheerio** pour l'analyse HTML légère
- **Tailwind CSS 4** pour l'interface

## 🏗️ Architecture Hybride

```
src/
├── app/
│   ├── page.tsx                 # Interface avec sélection de mode
│   └── api/audit/route.ts       # API endpoint hybride
├── lib/
│   ├── auditOrchestrator.ts     # Coordinateur des modes
│   ├── lighthouseAudit.ts       # Métriques Lighthouse
│   ├── seoAudit.ts             # SEO avancé (Puppeteer)  
│   └── seoAuditCheerio.ts      # SEO basique (Cheerio)
```
- **Structure HTML** : Vérification des balises essentielles
  - Titre de page (longueur optimale 30-60 caractères)
  - Meta description (120-160 caractères)
  - Balises H1 (unicité recommandée)
  - URL canoniques
  - Balises Open Graph et Twitter Cards
  - Viewport et langue de la page
  - Données structurées (Schema.org)

- **SEO Technique**
  - Fichier robots.txt
  - Sitemap XML
  - HTTPS activé
  - Temps de réponse serveur
  - Détection de redirections

- **Analyse de Contenu**
  - Images avec/sans attributs alt
  - Structure des titres (H1-H6)
  - Liens internes et externes
  - Longueur du contenu textuel

### 📊 Interface Utilisateur
- Dashboard avec scores visuels color-codés
- Recommandations d'amélioration automatiques
- Interface responsive et intuitive
- Indicateurs visuels pour chaque critère

## 🛠️ Technologies Utilisées

- **Framework** : Next.js 15.4.4
- **Runtime** : Node.js
- **Styling** : Tailwind CSS 4
- **Audit Engine** : Lighthouse 12.8.0
- **Browser Automation** : Puppeteer 24.15.0
- **Language** : TypeScript 5

## 🚦 Installation et Démarrage

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Installation
```bash
# Cloner le repository
git clone https://github.com/MattDaemon1/audit_tool.git
cd audit_tool

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

### Scripts disponibles
```bash
# Développement avec Turbopack
npm run dev

# Build de production
npm run build

# Démarrer en mode production
npm run start

# Linting
npm run lint
```

## 🎯 Utilisation

1. **Saisir un domaine** : Entrez l'URL du site à auditer (ex: `exemple.com`)
2. **Lancer l'audit** : Cliquez sur "Lancer l'audit" (peut prendre 30 secondes)
3. **Consulter les résultats** : 
   - Scores Lighthouse (Performance, SEO, Accessibilité, Bonnes Pratiques)
   - Analyse détaillée de la structure HTML
   - Vérifications techniques SEO
   - Recommandations d'amélioration
4. **Nouvel audit** : Possibilité de tester un autre domaine

## 🏗️ Architecture du Projet

```
src/
├── app/
│   ├── api/audit/
│   │   └── route.ts          # API endpoint pour les audits
│   ├── layout.tsx
│   ├── page.tsx              # Page d'accueil
│   └── globals.css
├── components/
│   ├── DomainForm.tsx        # Formulaire et affichage des résultats
│   └── SEOResults.tsx        # Composant d'affichage SEO détaillé
└── lib/
    ├── lighthouseAudit.ts    # Logique d'audit Lighthouse
    └── seoAudit.ts           # Logique d'audit SEO personnalisé
```

## 🔧 Configuration

### Next.js Configuration
Le projet est configuré pour supporter Lighthouse avec :
- `serverExternalPackages` pour externaliser Lighthouse et Puppeteer
- Configuration Webpack personnalisée pour le mode serveur
- Runtime Node.js forcé pour l'API route

### Variables d'Environnement
Aucune variable d'environnement requise pour le moment.

## 🚀 Déploiement

### Vercel (Recommandé)
```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel
```

### Autres plateformes
Le projet peut être déployé sur toute plateforme supportant Node.js :
- Netlify
- Railway
- Render
- AWS
- Google Cloud Platform

## 🎯 Prochaines Fonctionnalités

- [ ] **Core Web Vitals détaillés** : LCP, FID, CLS
- [ ] **Audit mobile spécifique** : Tests responsive design
- [ ] **Analyse de mots-clés** : Densité et répartition
- [ ] **Export de rapports** : PDF/Excel
- [ ] **Historique des audits** : Suivi des améliorations
- [ ] **API publique** : Intégration tiers
- [ ] **Tests multi-navigateurs** : Compatibilité étendue
- [ ] **Audit de sécurité** : SSL, headers de sécurité

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commitez vos changements (`git commit -m 'Add: Amazing Feature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👨‍💻 Auteur

**MattDaemon1**
- GitHub: [@MattDaemon1](https://github.com/MattDaemon1)
- Projet: [audit_tool](https://github.com/MattDaemon1/audit_tool)

## 🙏 Remerciements

- [Lighthouse](https://github.com/GoogleChrome/lighthouse) - Audit automatisé des performances web
- [Puppeteer](https://pptr.dev/) - Contrôle programmatique de Chrome
- [Next.js](https://nextjs.org/) - Framework React pour la production
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utilitaire
