# SAFE Scoring Norm Summary Template

All norm summaries must follow this standardized structure in English.

## Required Structure

```
## IDENTIFICATION
- **Code**: [Norm code]
- **Title**: [Official title]
- **Version**: [Version/Date]
- **Status**: [Draft/Final/Deployed/Obsolete]
- **Author(s)**: [List of authors]
- **Organization**: [Issuing organization]
- **License**: [License type]

## EXECUTIVE SUMMARY
[2-3 sentences describing the main objective of the norm]

## BACKGROUND AND MOTIVATION
[Why this norm exists, what problem it solves]

## TECHNICAL SPECIFICATIONS
### Core Principles
[Key concepts of the norm]

### Implementation
[How to implement the norm - algorithms, interfaces, protocols]

### Parameters and Values
[Specific values, constants, limits]

## SECURITY
### Security Guarantees
[What the norm guarantees in terms of security]

### Risks and Limitations
[Known vulnerabilities, edge cases, precautions]

### Best Practices
[Recommendations for secure usage]

## COMPATIBILITY
### Dependencies
[Other required norms]

### Interoperability
[Compatibility with other systems/norms]

## ADOPTION
### Reference Implementations
[Links to official implementations]

### Industry Adoption
[Who uses this norm]

## SAFE SCORING RELEVANCE
### Pillar
[S/A/F/E and justification]

### Criticality
[Essential/Important/Optional]

### Evaluation Criteria
[How to evaluate product compliance]

## SOURCES
- **Official Document**: [URL]
- **Last Accessed**: [Date]
```

## Exemple Appliqué: BIP-39

```
## IDENTIFICATION
- **Code**: BIP-39
- **Titre**: Mnemonic code for generating deterministic keys
- **Version**: 2013-09-10
- **Statut**: Deployed
- **Auteur(s)**: Marek Palatinus, Pavol Rusnak, Aaron Voisine, Sean Bowe
- **Organisation**: Bitcoin Community
- **Licence**: MIT

## RÉSUMÉ EXÉCUTIF
BIP-39 définit un standard pour convertir une entropie cryptographique en une phrase mnémonique de 12 à 24 mots. Cette phrase permet de sauvegarder et restaurer un portefeuille de cryptomonnaies de manière humainement lisible.

## CONTEXTE ET MOTIVATION
Les clés privées cryptographiques sont des séquences binaires difficiles à mémoriser et transcrire. BIP-39 résout ce problème en convertissant l'entropie en mots du dictionnaire, facilitant la sauvegarde sur papier ou la transmission orale.

## SPÉCIFICATIONS TECHNIQUES
### Principes Fondamentaux
- Entropie de 128-256 bits convertie en 12-24 mots
- Checksum SHA-256 intégré pour détection d'erreurs
- Liste de 2048 mots soigneusement sélectionnés
- Dérivation de seed via PBKDF2-HMAC-SHA512

### Implémentation
1. Générer ENT bits d'entropie (128, 160, 192, 224, ou 256)
2. Calculer checksum = premiers ENT/32 bits de SHA256(entropie)
3. Concaténer entropie + checksum
4. Diviser en segments de 11 bits
5. Mapper chaque segment vers un mot (index 0-2047)

### Paramètres et Valeurs
| Entropie | Checksum | Total | Mots |
|----------|----------|-------|------|
| 128 bits | 4 bits   | 132   | 12   |
| 160 bits | 5 bits   | 165   | 15   |
| 192 bits | 6 bits   | 198   | 18   |
| 224 bits | 7 bits   | 231   | 21   |
| 256 bits | 8 bits   | 264   | 24   |

Dérivation seed: PBKDF2(password=mnemonic, salt="mnemonic"+passphrase, iterations=2048, dkLen=512bits)

## SÉCURITÉ
### Garanties de Sécurité
- 128-256 bits de sécurité selon longueur
- Checksum détecte erreurs de transcription
- Passphrase optionnelle ajoute protection supplémentaire

### Risques et Limitations
- Pas de correction d'erreur (seulement détection)
- Passphrase sans checksum (toute passphrase génère un wallet valide)
- Vulnérable si stockée numériquement

### Bonnes Pratiques
- Générer sur appareil hors ligne
- Stocker sur support physique durable (métal)
- Ne jamais photographier ou stocker numériquement
- Utiliser passphrase pour fonds importants
- Vérifier backup avant d'y déposer des fonds

## COMPATIBILITÉ
### Dépendances
- BIP-32 (HD Wallets) pour dérivation des clés

### Interopérabilité
- Supporté par 99% des wallets
- Liste de mots anglaise universellement compatible
- Autres langues disponibles mais déconseillées

## ADOPTION
### Implémentations de Référence
- https://github.com/trezor/python-mnemonic

### Adoption Industrie
- Ledger, Trezor, Coldcard, BitBox, Keystone
- MetaMask, Electrum, Exodus, Trust Wallet
- Standard de facto pour tous les wallets HD

## PERTINENCE SAFE SCORING
### Pilier Concerné
**S (Security)** - Fondamental pour la sécurité des clés privées

### Criticité
**Essentiel** - Sans BIP-39, pas d'interopérabilité ni de backup standardisé

### Critères d'Évaluation
- Support BIP-39 complet: OUI/NON
- Longueur supportée: 12/15/18/21/24 mots
- Passphrase supportée: OUI/NON
- Vérification checksum: OUI/NON
- Génération hors ligne possible: OUI/NON

## SOURCES
- **Document Officiel**: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
- **Dernière Consultation**: 2026-01-19
```

## Notes d'Implémentation

1. **Longueur**: Chaque résumé doit faire entre 500 et 10000 mots selon la complexité de la norme
2. **Langue**: Français pour les sections descriptives, termes techniques en anglais
3. **Sources**: Toujours citer le document officiel
4. **Mise à jour**: Indiquer la date de dernière consultation
5. **Objectivité**: Rester factuel, basé uniquement sur les documents officiels
