# 🇫🇷 Guide Comptabilité Crypto en SASU - Delock

Guide complet pour gérer vos paiements crypto (BTC, ETH, USDC, SOL) et le staking dans votre SASU française, en toute légalité avec votre expert-comptable Delock.

---

## 📋 Table des matières

1. [Cadre légal en France](#cadre-légal-en-france)
2. [Paiements crypto en SASU](#paiements-crypto-en-sasu)
3. [Staking et récompenses](#staking-et-récompenses)
4. [Calcul de l'impôt sur les sociétés (IS)](#calcul-de-limpôt-sur-les-sociétés-is)
5. [Comptabilisation des cryptos](#comptabilisation-des-cryptos)
6. [Exports pour votre comptable Delock](#exports-pour-votre-comptable-delock)
7. [Optimisation fiscale légale](#optimisation-fiscale-légale)

---

## 🏛️ Cadre légal en France

### Statut des cryptomonnaies en SASU

**Depuis 2019, la loi PACTE clarifie la fiscalité crypto en France :**

✅ **Les cryptos sont des actifs numériques** (Code monétaire et financier, art. L54-10-1)
✅ **Vous POUVEZ accepter des paiements en crypto** dans votre SASU
✅ **Vous POUVEZ garder vos cryptos** sans les convertir en euros
✅ **Le staking est autorisé** mais fiscalisé

### Obligations légales

1. **Déclaration des comptes crypto** : Si > 50 000€, déclaration via formulaire 3916-bis
2. **Comptabilisation** : Les cryptos doivent figurer au bilan de votre SASU
3. **Facturation** : Les factures doivent mentionner le montant en euros (même si paiement crypto)
4. **TVA** : La TVA s'applique normalement (20% sur prestations SaaS)

---

## 💰 Paiements crypto en SASU

### Comment ça marche légalement ?

Lorsque votre SASU (SafeScoring) reçoit un paiement crypto :

#### Exemple concret :
```
Client paie : 49€/mois pour le plan Pro
Vous recevez : 50 USDC (Polygon)
```

### 1. **Facturation obligatoire**
Vous devez émettre une facture en EUROS :
```
Facture n° 2025-001
SafeScoring SASU
Abonnement Pro - 1 mois
HT : 40.83€
TVA 20% : 8.17€
TTC : 49.00€
Payé en : 50 USDC (Polygon) le 15/01/2025
Taux de change : 1 USDC = 0.98€
```

### 2. **Écriture comptable**

**Au moment de la réception du paiement :**

| Compte | Libellé | Débit | Crédit |
|--------|---------|-------|--------|
| 530 | Actifs numériques (USDC) | 49.00€ | |
| 706 | Prestations de services | | 40.83€ |
| 44571 | TVA collectée | | 8.17€ |

**Valorisation** : Au cours du jour de réception (1 USDC = 0.98€)

### 3. **Conservation des cryptos**

✅ **VOUS POUVEZ garder vos cryptos !**

**Important :**
- Les cryptos restent dans votre wallet SASU (pas personnel)
- Pas de conversion obligatoire en euros
- Valorisation au bilan : **valeur d'acquisition** (cours du jour de réception)

---

## 🔐 Staking et récompenses

### Le staking est-il autorisé en SASU ?

✅ **OUI**, mais avec des règles fiscales spécifiques.

### Comment comptabiliser le staking ?

#### Scénario :
```
Vous recevez : 100 SOL (paiement client)
Valeur : 10 000€ au moment de la réception
Vous stakez ces 100 SOL
Récompenses : +5 SOL/an
```

### 1. **Réception du paiement initial**

| Compte | Libellé | Débit | Crédit |
|--------|---------|-------|--------|
| 530 | Actifs numériques (SOL) | 10 000€ | |
| 706 | Prestations de services | | 8 333€ |
| 44571 | TVA collectée | | 1 667€ |

### 2. **Récompenses de staking**

**Traitement fiscal :** Les récompenses de staking sont considérées comme **produits financiers**

**À chaque récompense (ex: +0.42 SOL/mois) :**

| Compte | Libellé | Débit | Crédit |
|--------|---------|-------|--------|
| 530 | Actifs numériques (SOL) | 42€ | |
| 764 | Revenus de staking | | 42€ |

**Valorisation** : Au cours du jour de réception de la récompense

### 3. **Impact fiscal**

⚠️ **Les récompenses de staking sont imposables à l'IS** (25% ou 15% selon le CA)

**Exemple :**
- Récompenses staking annuelles : +5 SOL
- Valeur au jour de réception : 500€
- Impôt sur société (IS à 25%) : **125€**

**💡 Astuce légale :**
- Vous ne payez l'IS que sur les **récompenses** (500€)
- Pas d'impôt sur les 100 SOL initiaux tant que vous ne les vendez pas
- Si vous revendez à perte, vous pouvez déduire la moins-value

---

## 🧮 Calcul de l'impôt sur les sociétés (IS)

### Taux d'IS en France (2025)

| Bénéfice | Taux IS |
|----------|---------|
| 0 - 42 500€ | **15%** ✅ (PME) |
| > 42 500€ | **25%** |

### Exemple de calcul complet

**Année 2025 - SafeScoring SASU**

#### Revenus
```
Abonnements payés en crypto : 60 000€ (valeur en €)
- USDC : 30 000€
- BTC : 15 000€
- ETH : 15 000€

Récompenses staking :
- SOL : 2 000€
- ETH : 1 000€

TOTAL REVENUS : 63 000€
```

#### Charges déductibles
```
Serveurs (Vercel, Supabase) : 2 000€
APIs (NOWPayments 0.5%) : 300€
Outils SaaS : 1 000€
Expert-comptable Delock : 1 200€
Autres charges : 3 500€

TOTAL CHARGES : 8 000€
```

#### Calcul de l'IS

```
Bénéfice imposable : 63 000€ - 8 000€ = 55 000€

Tranche 1 (0-42 500€) : 42 500€ × 15% = 6 375€
Tranche 2 (42 500-55 000€) : 12 500€ × 25% = 3 125€

IMPÔT SUR SOCIÉTÉ (IS) : 9 500€
```

**Bénéfice NET après IS : 45 500€**

### Option : Se verser un salaire

Si vous vous versez un salaire de gérant :

```
Salaire brut annuel : 30 000€
Charges sociales (~45%) : 13 500€

Déduction SASU : 43 500€
Nouveau bénéfice imposable : 19 500€

IS (19 500€ × 15%) : 2 925€
```

**💡 Résultat :**
- Salaire net : ~23 000€
- IS réduit : 2 925€
- Total prélevé : 25 925€ (vs 9 500€ sans salaire)

**Mais vous cotisez pour la retraite !**

---

## 📊 Comptabilisation des cryptos

### Principes comptables français (PCG)

**Compte 530 : Actifs numériques**

Les cryptos sont enregistrées comme **actifs circulants** (comme de la trésorerie)

### Valorisation au bilan

**Règle française :**
- **À l'acquisition** : Valeur en € au cours du jour
- **Au bilan (31/12)** : Valeur la plus faible entre :
  - Valeur d'acquisition
  - Valeur de marché au 31/12

⚠️ **Principe de prudence :**
- Si perte latente (cours baisse) : Dépréciation à provisionner
- Si gain latent (cours monte) : Non comptabilisé (prudence)

### Exemple concret

**Achat crypto :**
```
15/01/2025 : Réception de 1 BTC
Cours : 90 000€
Écriture : Débit 530 (90 000€)
```

**Bilan au 31/12/2025 :**

**Scénario A - BTC monte à 120 000€**
- Valeur au bilan : **90 000€** (pas de réévaluation)
- Plus-value latente : +30 000€ (non imposée)

**Scénario B - BTC baisse à 70 000€**
- Valeur au bilan : **70 000€** (dépréciation)
- Moins-value latente : -20 000€
- Écriture de dépréciation :

| Compte | Libellé | Débit | Crédit |
|--------|---------|-------|--------|
| 6817 | Dotation dépréciation actifs | 20 000€ | |
| 5309 | Dépréciation actifs numériques | | 20 000€ |

**Déduction fiscale :** Oui, les 20 000€ réduisent votre IS

### Plus-value lors de la vente

**Si vous vendez vos cryptos :**

```
Achat : 1 BTC = 90 000€
Vente : 1 BTC = 120 000€
Plus-value : 30 000€
```

**Imposition :**
- Plus-value imposable à l'IS (15% ou 25%)
- IS sur 30 000€ = 4 500€ à 7 500€

**💡 Optimisation :** Ne vendez que si nécessaire !

---

## 📄 Exports pour votre comptable Delock

### Documents obligatoires mensuels

#### 1. **Relevé des transactions crypto**

Créez un CSV mensuel avec :

| Date | Type | Crypto | Quantité | Valeur EUR | Tx Hash | Client |
|------|------|--------|----------|------------|---------|--------|
| 15/01 | Paiement | USDC | 50 | 49.00€ | 0x123... | client@example.com |
| 16/01 | Paiement | BTC | 0.001 | 98.00€ | bc1q... | client2@example.com |
| 20/01 | Staking | SOL | 0.42 | 42.00€ | - | Récompense Phantom |

#### 2. **Factures conformes**

Pour chaque paiement crypto, générer une facture avec :
- Numéro de facture
- Montant HT/TTC en EUROS
- Mention "Payé en [crypto] le [date]"
- Taux de change appliqué
- Adresse de réception

#### 3. **Export FEC (Fichier des Écritures Comptables)**

Format requis par l'administration fiscale :

```
JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise
VE|Ventes|VE202501|20250115|530|Actifs USDC|||FAC001|20250115|Paiement Plan Pro|49.00||||||
VE|Ventes|VE202501|20250115|706|Prestations||||FAC001|20250115|Paiement Plan Pro||40.83||||
VE|Ventes|VE202501|20250115|44571|TVA collectée||||FAC001|20250115|Paiement Plan Pro||8.17||||
```

#### 4. **Tableau de valorisation crypto**

Au 31/12 de chaque année :

| Crypto | Quantité | Prix achat moyen | Valeur acquisition | Cours 31/12 | Valeur bilan | +/- value |
|--------|----------|------------------|-------------------|-------------|--------------|-----------|
| BTC | 0.5 | 90 000€ | 45 000€ | 95 000€ | 45 000€ | +2 500€ (latent) |
| ETH | 15 | 3 000€ | 45 000€ | 3 200€ | 45 000€ | +3 000€ (latent) |
| USDC | 30 000 | 0.98€ | 29 400€ | 1.00€ | 29 400€ | +600€ (latent) |
| SOL | 105 | 95€ | 9 975€ | 110€ | 9 975€ | +1 575€ (latent) |

**Total au bilan : 129 375€**

---

## 💡 Optimisation fiscale légale

### 1. **Ne vendez pas vos cryptos**

✅ **Avantage :** Pas d'imposition tant que vous ne vendez pas
- Les plus-values latentes ne sont pas imposées
- Vous gardez vos BTC/ETH/SOL
- Vous payez uniquement l'IS sur vos revenus et récompenses de staking

### 2. **Payez vos charges en crypto**

✅ **Si possible, payez vos fournisseurs en crypto :**
- Serveurs, outils SaaS, freelances
- Pas de conversion = pas de plus-value imposable
- Les dépenses restent déductibles

### 3. **Timing des récompenses de staking**

📅 **Stratégie :**
- Claimez vos récompenses de staking en **janvier** de l'année suivante
- Report de l'imposition d'un an
- Vous différez le paiement de l'IS

### 4. **Provisions pour dépréciation**

✅ **Si le marché baisse au 31/12 :**
- Provisionnez la moins-value latente
- Déduction fiscale immédiate
- Si le marché remonte ensuite, reprise de provision (imposable)

### 5. **Réinvestissement dans la SASU**

💰 **Utilisez le bénéfice pour :**
- Acheter du matériel (déductible)
- Développer SafeScoring (R&D)
- Embaucher (salaires déductibles)
- Se verser un salaire (cotisations retraite)

### 6. **Crédit Impôt Recherche (CIR)**

🔬 **Si SafeScoring fait de la R&D :**
- Crédit d'impôt de 30% sur dépenses R&D
- Jusqu'à 100 000€ de crédit/an
- Remboursable pour les PME

---

## 🤝 Travailler avec Delock

### Ce que Delock doit savoir

**Delock est spécialisé en crypto, ils connaissent déjà :**
✅ La comptabilisation des cryptos (compte 530)
✅ Les écritures pour le staking
✅ Les exports FEC avec actifs numériques
✅ L'optimisation fiscale crypto en SASU

### Documents à fournir chaque mois

1. **Export CSV des transactions** (depuis SafeScoring)
2. **Factures PDF** (générées automatiquement)
3. **Preuves de transactions** (Etherscan, Polygonscan, etc.)
4. **Relevé staking** (Phantom, MetaMask, Ledger)

### Fréquence des rendez-vous

**Recommandé :**
- **Mensuel** : Point rapide (30min) sur les transactions du mois
- **Trimestriel** : Déclarations TVA + ajustements
- **Annuel** : Bilan, liasse fiscale, déclaration IS

---

## 🛠️ Outils à mettre en place

### 1. **Dashboard crypto comptable**

Créer un outil dans SafeScoring pour :
- Suivre tous les paiements crypto en temps réel
- Convertir automatiquement en EUR au cours du jour
- Générer les factures conformes
- Calculer l'IS estimé en temps réel
- Exporter au format FEC

### 2. **Suivi du staking**

Automatiser :
- Récupération des récompenses de staking (API Phantom, Etherscan)
- Valorisation en EUR au cours du jour
- Calcul de l'IS sur récompenses
- Export pour Delock

### 3. **Alertes fiscales**

Notifications automatiques :
- Seuil de 42 500€ de bénéfice (passage à IS 25%)
- Déclaration crypto > 50 000€
- Échéances TVA trimestrielles
- Provisions à créer au 31/12

---

## 📞 Questions fréquentes

### Q1 : Puis-je garder mes cryptos indéfiniment sans les vendre ?

✅ **OUI !**
- Aucune obligation de convertir en euros
- Les plus-values latentes ne sont pas imposées
- Vous payez uniquement l'IS sur les revenus reçus

### Q2 : Le staking est-il vraiment légal en SASU ?

✅ **OUI !**
- Autorisé en France
- Les récompenses sont imposables à l'IS
- Traitement comme produits financiers

### Q3 : Dois-je déclarer tous mes wallets ?

✅ **OUI** si > 50 000€
- Formulaire 3916-bis
- Déclaration annuelle
- Adresses des wallets à fournir

### Q4 : Puis-je utiliser un wallet personnel pour ma SASU ?

❌ **NON !**
- Créer un wallet dédié SASU
- Séparation stricte patrimoine personnel/professionnel
- Risque de redressement fiscal sinon

### Q5 : Comment prouver la valeur en EUR des cryptos ?

✅ **Sources acceptées :**
- CoinGecko / CoinMarketCap
- Binance / Coinbase (cours du jour)
- NOWPayments (taux appliqué)
- Conserver des screenshots

### Q6 : Et si je me trompe dans ma comptabilité ?

⚠️ **Risques :**
- Redressement fiscal
- Pénalités (40% à 80%)
- Intérêts de retard

**Solution :** Travailler avec Delock dès le début !

---

## ✅ Checklist de conformité

### Mise en place initiale

- [ ] Créer wallet crypto dédié SASU (MetaMask/Ledger)
- [ ] Séparer wallets perso / SASU
- [ ] Ouvrir compte Delock expert-comptable
- [ ] Configurer NOWPayments avec infos SASU
- [ ] Créer modèles factures conformes
- [ ] Mettre en place suivi transactions

### Chaque mois

- [ ] Exporter transactions crypto (CSV)
- [ ] Générer factures pour tous les paiements
- [ ] Valoriser en EUR au cours du jour
- [ ] Envoyer exports à Delock
- [ ] Vérifier récompenses staking

### Chaque trimestre

- [ ] Déclaration TVA (CA3)
- [ ] Point comptable avec Delock
- [ ] Ajuster provisions si besoin

### Chaque année (31/12)

- [ ] Valorisation bilan cryptos
- [ ] Provisions pour dépréciations
- [ ] Export FEC complet
- [ ] Déclaration wallets si > 50k€
- [ ] Liasse fiscale avec Delock
- [ ] Paiement IS

---

## 🚀 Prochaines étapes

1. **Créer dashboard comptable crypto** dans SafeScoring
2. **Automatiser les exports** pour Delock
3. **Configurer alertes fiscales**
4. **Mettre en place suivi staking**

**Vous êtes maintenant prêt à gérer votre SASU en crypto en toute légalité ! 🎉**

---

**Besoin d'aide ? Contactez Delock : hello@delock.io**
