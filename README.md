# Ultimate Secure Chat

Une application de chat sécurisée, décentralisée et chiffrée de bout en bout qui respecte votre vie privée.

![Screenshot de l'application](./screenshot.png)

## Caractéristiques

- **Chiffrement de bout en bout (E2EE)** - Tous les messages sont chiffrés sur l'appareil de l'expéditeur et déchiffrés uniquement sur l'appareil du destinataire.
- **Communication P2P** - Communication directe entre utilisateurs sans serveur central.
- **Interface utilisateur moderne** - Interface utilisateur responsive et intuitive.
- **Progressive Web App (PWA)** - Fonctionne hors ligne et peut être installée sur mobile et desktop.
- **Zero backend** - Pas de serveur, pas de base de données, pas de tracking. Vos données restent sur votre appareil.
- **Partage de fichiers** - Envoi et réception de fichiers et images.
- **Open Source** - Le code est entièrement ouvert et disponible pour examen.

## Technologies utilisées

- **React** - Bibliothèque d'UI
- **TypeScript** - Typage statique
- **Vite** - Build tool
- **TailwindCSS** - Framework CSS utilitaire
- **Web Crypto API** - Cryptographie côté client
- **IndexedDB / LocalStorage** - Stockage local
- **WebRTC** - Communication P2P

## Architecture technique

### Cryptographie

Ultimate Secure Chat utilise un modèle de cryptographie hybride:

1. **Asymétrique (RSA)**: Chaque utilisateur génère une paire de clés RSA-4096 au premier démarrage.
2. **Symétrique (AES)**: Pour chaque message, une clé AES-256 temporaire est générée.
3. **Processus de chiffrement**:
   - Le message est chiffré avec la clé AES temporaire.
   - La clé AES est chiffrée avec la clé publique RSA du destinataire.
   - Le message chiffré et la clé chiffrée sont envoyés ensemble.
4. **Processus de déchiffrement**:
   - Le destinataire déchiffre la clé AES avec sa clé privée RSA.
   - Le message est déchiffré avec la clé AES déchiffrée.

Aucune clé privée ne quitte jamais l'appareil de l'utilisateur. Les messages ne peuvent être lus que par l'expéditeur et le destinataire prévu.

### Communication P2P

La communication entre pairs est établie en utilisant WebRTC via PeerJS:

1. Chaque utilisateur a un ID unique généré à la connexion.
2. L'ID peut être partagé avec d'autres utilisateurs pour établir la connexion.
3. Les données échangées via le canal de données WebRTC sont déjà chiffrées par E2EE.

## Installation et exécution

### Prérequis

- Node.js 16+ et npm

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/yourusername/ultimate-secure-chat.git
cd ultimate-secure-chat

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build pour production
npm run build
```

## Déploiement

L'application peut être déployée sur n'importe quel hébergement statique:

```bash
# Build pour production
npm run build

# Les fichiers se trouvent dans le dossier dist/
```

## Sécurité

- **Pas de serveur central**: Aucun serveur qui pourrait être compromis.
- **Chiffrement local**: Toutes les opérations cryptographiques sont effectuées localement.
- **Clés générées localement**: Les clés ne quittent jamais votre appareil.
- **Code open source**: Le code est disponible pour inspection.

## Limitations

- **Disponibilité**: Les deux utilisateurs doivent être en ligne en même temps pour échanger des messages.
- **Pérennité des messages**: Les messages ne sont stockés que localement et peuvent être perdus si le stockage local est effacé.
- **Compatibilité navigateur**: Nécessite un navigateur moderne supportant WebRTC et les API Web Crypto.

## Licence

Ce projet est distribué sous la licence MIT. Voir le fichier `LICENSE` pour plus d'informations.
