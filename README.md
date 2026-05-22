# 🛡️ SafeVault

**SafeVault** est un gestionnaire de mots de passe moderne, sécurisé et élégant, conçu pour offrir une expérience utilisateur premium tout en garantissant une sécurité maximale grâce au chiffrement local (**Zero-Knowledge**).

![License: ELv2](https://img.shields.io/badge/license-ELv2-red.svg)
![Spring Boot](https://img.shields.io/badge/Backend-Spring%20Boot%203-brightgreen)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue)
![Tailwind](https://img.shields.io/badge/UI-Tailwind%20CSS%204-indigo)

## ✨ Fonctionnalités

### 🔒 Sécurité & Cryptographie
- **Architecture Zero-Knowledge** : Vos mots de passe sont chiffrés et déchiffrés localement dans votre navigateur. Le serveur ne voit jamais vos données en clair.
- **WebCrypto API** : Utilisation des standards industriels **AES-GCM (256-bit)** pour le chiffrement et **PBKDF2** pour la dérivation de clé à partir du mot de passe maître.
- **Vérification Mathématique** : Système de validation du mot de passe maître sans stockage de celui-ci.
- **Double Authentification (2FA / TOTP)** : Sécurisation accrue de votre compte grâce à la validation par code à usage unique (compatible Google Authenticator, Authy, etc.) avec génération de QR code.

### 🌐 Application Web (Vault)
- **Interface Premium** : Design moderne avec **Glassmorphism**, animations fluides via Framer Motion.
- **Organisation par Dossiers** : Classement et catégorisation de vos identifiants dans des dossiers, avec possibilité de déplacer facilement une entrée d'un dossier à un autre.
- **Logos Dynamiques** : Récupération automatique des favicons des sites web pour une reconnaissance visuelle instantanée.
- **Gestion Complète** : Ajout, modification, suppression (avec confirmation inline) et recherche d'identifiants.
- **Persistance Intelligente** : Option "Se souvenir de moi" pour garder le coffre déverrouillé de manière sécurisée.

### 🧩 Extension Navigateur
- **Remplissage Automatique** : Remplissage intelligent des formulaires de connexion (Bitwarden-style).
- **Auto-suggestion** : Détection automatique du site visité pour proposer les bons identifiants en priorité.
- **Déchiffrement Local** : L'extension embarque sa propre logique de déchiffrement pour une sécurité totale.

---

## 🛠️ Stack Technique

- **Backend** : Java 21, Spring Boot 3, Spring Security (JWT), PostgreSQL/H2, Flyway.
- **Frontend** : React, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Lucide Icons.
- **Extension** : TypeScript, Vite, Chrome Extension API (Manifest V3).

---

## 🚀 Installation & Lancement

### 1. Déploiement avec Docker (Recommandé)
Le projet est entièrement dockerisé pour un lancement rapide :
```bash
docker-compose up --build
```
*Le frontend sera accessible sur `http://localhost`, le backend sur `http://localhost:8080` et la base PostgreSQL sera gérée automatiquement.*

### 2. Installation Manuelle

#### Backend
```bash
cd backend
./mvnw spring-boot:run
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Extension Navigateur
1. Allez dans le dossier `extension`.
2. Installez les dépendances : `npm install`.
3. Compilez l'extension : `npm run build`.
4. Ouvrez Chrome et allez sur `chrome://extensions`.
5. Activez le **Mode développeur**.
6. Cliquez sur **Charger l'extension non empaquetée** et sélectionnez le dossier `extension/dist`.

---

## 📖 Utilisation

1. **Créez un compte** avec un mot de passe maître robuste (il est indispensable pour déchiffrer vos données).
2. **Ajoutez vos identifiants** dans le coffre.
3. **Utilisez l'extension** pour vous connecter en un clic sur vos sites favoris.

---

## 📝 Licence

Distribué sous la licence **Elastic License 2.0 (ELv2)**.

Cette licence vous permet d'utiliser, copier, distribuer et modifier le logiciel librement, mais **interdit explicitement de fournir SafeVault à des tiers sous la forme d'un service géré ou hébergé** (SaaS commercial concurrent).

Voir le fichier [LICENSE](file:///home/vthuillier/IdeaProjects/SafeVault/LICENSE) pour plus d'informations.

---

*Développé avec ❤️ pour une sécurité sans compromis.*
