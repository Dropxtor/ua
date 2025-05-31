# Guide d'utilisation du Babylon-Xion Bridge Bot

## Introduction

Ce guide explique comment utiliser le Babylon-Xion Bridge Bot, un outil simplifié pour automatiser les transferts de tokens entre les réseaux Babylon Testnet et Xion Testnet via Union V2.5. Ce bot a été adapté spécifiquement pour cette paire de réseaux à partir du Union-Auto-Bot original créé par dropxtor.

## Prérequis

- Node.js v16 ou supérieur
- npm (Node Package Manager)
- Un fichier `wallet.json` contenant vos clés privées
- Des tokens de test sur Babylon Testnet

## Installation

1. **Cloner le dépôt ou créer un nouveau dossier**

2. **Installer les dépendances**
   ```bash
   npm install ethers@6.8.1 axios@1.6.0 blessed@0.1.81 blessed-contrib@4.10.3 moment-timezone@0.5.44
   ```

3. **Créer le fichier wallet.json**
   Créez un fichier nommé `wallet.json` dans le même répertoire que le script avec la structure suivante :
   ```json
   {
     "wallets": [
       {
         "name": "Wallet1",
         "privatekey": "0xVotreCléPrivéeIci"
       },
       {
         "name": "Wallet2",
         "privatekey": "0xAutreCléPrivéeIci"
       }
     ]
   }
   ```

## Configuration

Le script est préconfiguré avec les adresses des contrats pour Babylon et Xion Testnet. Si nécessaire, vous pouvez modifier les adresses suivantes dans le code :

- `BABYLON_BRIDGE_ADDRESS` : Adresse du contrat bridge sur Babylon Testnet
- `XION_BRIDGE_ADDRESS` : Adresse du contrat bridge sur Xion Testnet
- `BABYLON_TOKEN_ADDRESS` : Adresse du token sur Babylon Testnet
- `XION_TOKEN_ADDRESS` : Adresse du token sur Xion Testnet

## Utilisation

1. **Lancer le bot**
   ```bash
   node babylon-xion-bridge.js
   ```

2. **Entrer le nombre de transactions**
   Lorsque le bot démarre, il vous demandera combien de transactions vous souhaitez effectuer par portefeuille. Entrez un nombre et appuyez sur Entrée.

3. **Suivre les transactions**
   Le bot affichera un tableau de bord en temps réel avec :
   - Logs de transactions
   - Informations sur les portefeuilles
   - Graphique de performance des transactions
   - Statut des transactions (réussies, échouées, en attente)
   - Informations système

4. **Quitter le bot**
   Appuyez sur Q, ESC ou Ctrl+C pour quitter l'application.

## Fonctionnalités

- **Bridge automatisé** : Transfert automatique de tokens de Babylon vers Xion
- **Interface utilisateur en terminal** : Tableau de bord en temps réel
- **Support multi-portefeuilles** : Traitement séquentiel de plusieurs portefeuilles
- **Approbation automatique** : Vérification et approbation automatique des tokens
- **Suivi des transactions** : Polling des hash de packets sur Union V2.5
- **Gestion des erreurs** : Logs détaillés pour le débogage

## Dépannage

- **Erreur de chargement des portefeuilles** : Vérifiez que le fichier wallet.json est correctement formaté et contient des clés privées valides.
- **Erreur d'approbation** : Assurez-vous d'avoir suffisamment de tokens sur Babylon Testnet.
- **Erreur de bridge** : Vérifiez que les adresses des contrats sont correctes et que le réseau Union V2.5 est opérationnel.

## Notes importantes

- Ce bot est conçu uniquement pour les testnets, ne l'utilisez pas avec des tokens de valeur réelle.
- Les transactions sont espacées aléatoirement pour éviter la détection de bot.
- Gardez vos clés privées en sécurité et ne partagez jamais le fichier wallet.json.

## Crédits

Bot original créé par dropxtor, adapté pour le bridge Babylon-Xion sur Union V2.5.
