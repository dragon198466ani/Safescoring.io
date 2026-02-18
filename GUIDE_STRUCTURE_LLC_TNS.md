# Guide Complet : Structure LLC Wyoming + TNS France

## SafeScoring - Configuration Juridique et Fiscale

---

## 1. Vue d'ensemble de la structure

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  CLIENTS (monde entier)                                         │
│         │                                                       │
│         ▼                                                       │
│  LEMON SQUEEZY LLC (Merchant of Record - USA)                  │
│  - Encaisse les paiements CB/PayPal                            │
│  - Gère la TVA internationale                                  │
│  - Émet les factures aux clients                               │
│         │                                                       │
│         ▼                                                       │
│  SAFESCORING LLC (Wyoming, USA)                                │
│  - Propriétaire du service                                     │
│  - Reçoit les revenus de Lemon Squeezy                        │
│  - Compte bancaire : Mercury                                   │
│         │                                                       │
│         ├──────────────────────────────────────┐               │
│         ▼                                      ▼               │
│  MANAGEMENT FEES (20%)              DISTRIBUTIONS (80%)        │
│         │                                      │               │
│         ▼                                      ▼               │
│  [TON NOM] - TNS France            [TON NOM] - Dividendes     │
│  SIRET : xxx xxx xxx xxxxx         Flat tax 30%               │
│  Charges sociales ~22%                                         │
│         │                                      │               │
│         └──────────────────┬───────────────────┘               │
│                            ▼                                    │
│                    TON COMPTE BANCAIRE FR                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Entités impliquées

### 2.1 SafeScoring LLC (Wyoming)

| Élément | Valeur |
|---------|--------|
| Type | Limited Liability Company (LLC) |
| État | Wyoming, USA |
| Membres | Single-member (toi) |
| Fiscalité US | Transparente (pass-through) |
| Registered Agent | [À REMPLIR] |
| Adresse | [AGENT], Cheyenne, WY 82001 |
| EIN | [À OBTENIR] |

### 2.2 Toi - Travailleur Non Salarié (TNS)

| Élément | Valeur |
|---------|--------|
| Statut | Auto-entrepreneur ou TNS classique |
| Activité | Conseil en systèmes informatiques |
| Code APE | 6202A |
| SIRET | [À OBTENIR] |
| Régime | Micro-BNC (si AE) |

---

## 3. Création de la LLC - Étapes

### Étape 1 : Choisir un service de formation

| Service | Prix | Inclus | Délai |
|---------|------|--------|-------|
| **Doola** | $297 | Agent 1 an, EIN | 2-5 jours |
| **Northwest** | $225 | Agent 1 an, EIN | 1-3 jours |
| **Firstbase** | $399 | Agent 1 an, EIN, compte | 3-7 jours |

**Recommandé** : Northwest ou Doola

### Étape 2 : Informations à fournir

- Nom de la LLC : SafeScoring LLC
- État : Wyoming
- Registered Agent : Fourni par le service
- Member : Ton nom complet + adresse FR

### Étape 3 : Documents reçus

1. **Articles of Organization** - Certificat de formation
2. **EIN Letter** - Numéro fiscal US (IRS)
3. **Operating Agreement** - Règles de fonctionnement

---

## 4. Inscription TNS en France

### Option A : Auto-entrepreneur (recommandé pour débuter)

1. Aller sur https://autoentrepreneur.urssaf.fr
2. Créer un compte
3. Déclarer l'activité :
   - Nature : Libérale
   - Activité : "Conseil en systèmes et logiciels informatiques"
   - Date de début : [DATE]

### Option B : TNS classique (si CA > 77k€)

1. Aller sur https://formalites.entreprises.gouv.fr
2. Créer une Entreprise Individuelle
3. Choisir régime réel simplifié

---

## 5. Comptes bancaires

### 5.1 Mercury (compte LLC - USA)

| Élément | Détail |
|---------|--------|
| Site | mercury.com |
| Devise | USD |
| Frais | Gratuit |
| Requis | Documents LLC + EIN + Passeport |
| Délai | 1-3 jours |

### 5.2 Wise Business (conversion USD → EUR)

| Élément | Détail |
|---------|--------|
| Site | wise.com/business |
| Frais conversion | ~0.5% |
| IBAN | Multi-devises |

### 5.3 Compte pro FR (pour TNS)

Options recommandées :
- **Qonto** (9€/mois) - Pro, complet
- **Shine** (7.90€/mois) - Simple
- **Finom** (gratuit) - Basique

---

## 6. Flux financier mensuel

```
1. Clients paient via Lemon Squeezy
         ↓
2. Lemon Squeezy verse sur Mercury (- ses frais ~5%)
         ↓
3. Tu fais un virement Mercury → Wise (~mensuel)
         ↓
4. Wise convertit USD → EUR
         ↓
5. Tu verses :
   ├── Management fees → Ton compte pro FR (facture)
   └── Distributions → Ton compte perso FR (dividendes)
```

---

## 7. Facturation LLC ← TNS

### Modèle de facture mensuelle

```
═══════════════════════════════════════════════════════════════
                         FACTURE
═══════════════════════════════════════════════════════════════

ÉMETTEUR :
[TON NOM COMPLET]
[TON ADRESSE]
SIRET : [XXX XXX XXX XXXXX]
Email : [TON EMAIL]

DESTINATAIRE :
SafeScoring LLC
[ADRESSE REGISTERED AGENT]
Cheyenne, WY 82001, USA

───────────────────────────────────────────────────────────────
Facture N° : 2025-01
Date : [DATE]
───────────────────────────────────────────────────────────────

DÉSIGNATION                                          MONTANT HT
───────────────────────────────────────────────────────────────
Prestation de services informatiques
- Développement et maintenance plateforme
- Gestion opérationnelle
- Conseil stratégique
Période : Janvier 2025                                1 666,67 €
───────────────────────────────────────────────────────────────

TOTAL HT :                                            1 666,67 €

TVA non applicable - Article 293 B du CGI

TOTAL TTC :                                           1 666,67 €

───────────────────────────────────────────────────────────────
RÈGLEMENT :
Virement bancaire
IBAN : [TON IBAN]
BIC : [TON BIC]

Échéance : À réception
═══════════════════════════════════════════════════════════════
```

---

## 8. Contrat de prestation

```
═══════════════════════════════════════════════════════════════
         CONTRAT DE PRESTATION DE SERVICES
═══════════════════════════════════════════════════════════════

ENTRE LES SOUSSIGNÉS :

SafeScoring LLC
Société de droit américain (Wyoming)
Adresse : [REGISTERED AGENT ADDRESS], Cheyenne, WY 82001, USA
Représentée par [TON NOM], en qualité de Member
Ci-après dénommée "le Client"

ET

[TON NOM COMPLET]
Travailleur indépendant
Adresse : [TON ADRESSE]
SIRET : [TON SIRET]
Ci-après dénommé "le Prestataire"

───────────────────────────────────────────────────────────────

ARTICLE 1 - OBJET

Le Prestataire s'engage à fournir au Client les services
suivants :
- Développement et maintenance de la plateforme SafeScoring
- Gestion opérationnelle du service
- Conseil en stratégie produit et technique
- Support technique de niveau 2 et 3

ARTICLE 2 - DURÉE

Le présent contrat est conclu pour une durée indéterminée
à compter du [DATE].
Chaque partie peut y mettre fin avec un préavis de 30 jours.

ARTICLE 3 - RÉMUNÉRATION

Le Client versera au Prestataire une rémunération mensuelle
de [MONTANT] € HT, payable à réception de facture.

ARTICLE 4 - MODALITÉS D'EXÉCUTION

Le Prestataire exécute sa mission en toute indépendance.
Il organise librement son temps de travail et ses méthodes.
Il n'existe aucun lien de subordination entre les parties.

ARTICLE 5 - PROPRIÉTÉ INTELLECTUELLE

Les développements réalisés par le Prestataire dans le cadre
de cette mission sont la propriété exclusive du Client.

ARTICLE 6 - CONFIDENTIALITÉ

Le Prestataire s'engage à maintenir confidentielles toutes
les informations auxquelles il aura accès dans le cadre
de sa mission.

ARTICLE 7 - DROIT APPLICABLE

Le présent contrat est régi par le droit de l'État du Wyoming.

───────────────────────────────────────────────────────────────

Fait à [VILLE], le [DATE]
En deux exemplaires originaux.

Pour SafeScoring LLC          Pour le Prestataire
(Le Member)


_____________________         _____________________
[TON NOM]                     [TON NOM]
═══════════════════════════════════════════════════════════════
```

---

## 9. Fiscalité détaillée

### 9.1 Répartition optimale des revenus

| CA annuel LLC | Management fees (TNS) | Distributions | Ratio |
|---------------|----------------------|---------------|-------|
| 50 000 € | 10 000 € | 40 000 € | 20/80 |
| 100 000 € | 20 000 € | 80 000 € | 20/80 |
| 150 000 € | 25 000 € | 125 000 € | 17/83 |
| 200 000 € | 30 000 € | 170 000 € | 15/85 |

### 9.2 Calcul des charges

**Partie TNS (Auto-entrepreneur BNC) :**
- Cotisations URSSAF : 21.1% du CA
- Versement libératoire IR : 2.2% du CA (optionnel)
- **Total : 23.3%**

**Partie Distributions (Dividendes étrangers) :**
- Flat tax (PFU) : 30%
  - 12.8% IR
  - 17.2% prélèvements sociaux

### 9.3 Exemple sur 100 000 € de CA LLC

```
MANAGEMENT FEES (20 000 €) :
- Cotisations sociales (21.1%) :     -4 220 €
- Versement libératoire (2.2%) :       -440 €
- Net :                              15 340 €

DISTRIBUTIONS (80 000 €) :
- Flat tax (30%) :                  -24 000 €
- Net :                              56 000 €

══════════════════════════════════════════════
TOTAL NET :                          71 340 €
TAUX EFFECTIF :                       28.7%
══════════════════════════════════════════════
```

---

## 10. Déclarations fiscales annuelles

### 10.1 Déclarations URSSAF (TNS)

- **Fréquence** : Mensuelle ou trimestrielle
- **Site** : autoentrepreneur.urssaf.fr
- **Contenu** : CA encaissé du mois/trimestre

### 10.2 Déclaration IR (Mai-Juin)

| Formulaire | Contenu |
|------------|---------|
| **2042** | Revenus globaux |
| **2042-C-PRO** | Revenus TNS (si pas versement libératoire) |
| **2047** | Revenus de source étrangère (dividendes LLC) |
| **3916** | Comptes bancaires à l'étranger |

### 10.3 Formulaire 3916 - Comptes étrangers

À déclarer chaque année :

```
COMPTE 1 :
Établissement : Mercury Technologies, Inc.
Pays : États-Unis
Type : Compte courant
Numéro : [NUMÉRO MERCURY]

COMPTE 2 :
Établissement : Wise Payments Limited
Pays : Belgique
Type : Compte multi-devises
Numéro : [NUMÉRO WISE]
```

---

## 11. Procès-verbal de distribution

À rédiger lors de chaque distribution de dividendes :

```
═══════════════════════════════════════════════════════════════
    PROCÈS-VERBAL DE DÉCISION DU MEMBRE UNIQUE
                 SAFESCORING LLC
═══════════════════════════════════════════════════════════════

L'an [ANNÉE], le [DATE],

Le soussigné, [TON NOM COMPLET], unique Member de SafeScoring
LLC, société de droit américain immatriculée dans l'État du
Wyoming,

Après avoir constaté que la société dispose d'une trésorerie
de [MONTANT] USD,

DÉCIDE :

1. De procéder à une distribution au profit du Member unique
   d'un montant de [MONTANT] USD.

2. Cette distribution sera virée sur le compte Wise Business
   n° [NUMÉRO] pour conversion en EUR.

3. Le Member déclare être informé de ses obligations fiscales
   en France concernant cette distribution.

Fait à [VILLE], le [DATE]

Le Member unique,


_____________________
[TON NOM]
═══════════════════════════════════════════════════════════════
```

---

## 12. Checklist de lancement

### Semaine 1 : Création LLC

- [ ] Choisir service (Doola/Northwest)
- [ ] Payer la formation (~$250)
- [ ] Recevoir Articles of Organization
- [ ] Recevoir EIN (numéro fiscal US)
- [ ] Recevoir Operating Agreement

### Semaine 2 : Comptes bancaires

- [ ] Ouvrir compte Mercury
- [ ] Ouvrir compte Wise Business
- [ ] Lier Mercury ↔ Wise

### Semaine 2 : Inscription TNS France

- [ ] S'inscrire sur autoentrepreneur.urssaf.fr
- [ ] Recevoir SIRET
- [ ] Ouvrir compte pro FR (Qonto/Finom)

### Semaine 3 : Configuration paiements

- [ ] Créer compte Lemon Squeezy
- [ ] Lier LLC à Lemon Squeezy
- [ ] Configurer Mercury comme compte de réception

### Semaine 3 : Documents

- [ ] Rédiger contrat de prestation LLC ↔ TNS
- [ ] Préparer modèle de facture
- [ ] Préparer modèle PV de distribution

### Lancement

- [ ] Mettre à jour mentions légales du site
- [ ] Activer les paiements
- [ ] **GO LIVE !**

---

## 13. Récapitulatif annuel des obligations

| Mois | Action |
|------|--------|
| Chaque mois | Déclarer CA TNS à l'URSSAF |
| Chaque mois | Facturer la LLC |
| Trimestriel | PV de distribution (si distribution) |
| Janvier | Renouvellement LLC Wyoming (~$52) |
| Avril-Mai | Déclaration IR (2042, 2047, 3916) |
| Avril-Mai | Déclaration revenus TNS |

---

## 14. Contacts et ressources

### Services LLC

- **Doola** : doola.com
- **Northwest** : northwestregisteredagent.com
- **Firstbase** : firstbase.io

### Banques

- **Mercury** : mercury.com
- **Wise** : wise.com
- **Qonto** : qonto.com

### Paiements

- **Lemon Squeezy** : lemonsqueezy.com

### Ressources fiscales FR

- **URSSAF** : autoentrepreneur.urssaf.fr
- **Impôts** : impots.gouv.fr
- **CFE** : cfe.urssaf.fr

---

## 15. Paiements en cryptomonnaies

### 15.1 Configuration du wallet LLC

La LLC doit avoir son propre wallet crypto, séparé de tes wallets personnels.

**Wallet recommandé :**
- Hardware wallet dédié (Ledger/Trezor)
- Seed phrase stockée séparément
- Adresses publiques affichées sur le site

**Adresses de réception (exemple) :**
```
BTC  : bc1q[ADRESSE_LLC_BTC]
ETH  : 0x[ADRESSE_LLC_ETH]
SOL  : [ADRESSE_LLC_SOL]
USDC : 0x[ADRESSE_LLC_USDC] (ERC-20)
```

### 15.2 Comptabilisation des paiements crypto

Chaque paiement crypto reçu doit être enregistré :

| Date | Crypto | Montant | Prix USD | Valeur USD | Tx Hash |
|------|--------|---------|----------|------------|---------|
| 2025-01-15 | BTC | 0.05 | $62,000 | $3,100 | abc123... |
| 2025-01-20 | ETH | 2.0 | $3,200 | $6,400 | def456... |

### 15.3 Options de gestion

**Option A : Garder en crypto (HODL)**
```
Crypto reçus → Reste dans wallet LLC
Pas de conversion = Pas d'événement fiscal supplémentaire
Distribution future possible en crypto
```

**Option B : Conversion immédiate**
```
Crypto reçus → Exchange (Kraken/Coinbase)
             → Vente en USD
             → Virement Mercury
Avantage : Simplifie la compta
```

**Option C : Mix (Recommandé)**
```
- USDC/Stablecoins → Conversion immédiate
- BTC/ETH → HODL (potentiel de plus-value)
```

### 15.4 Distribution crypto vers toi (perso)

Si tu te distribues des crypto de la LLC :

```
Étape 1 : PV de distribution mentionnant les crypto
Étape 2 : Transfert wallet LLC → wallet perso
Étape 3 : Valorisation au cours du jour
Étape 4 : Déclaration en France

Fiscalité FR :
- Si tu gardes en crypto perso : pas d'impôt immédiat
- Si tu vends en EUR : flat tax 30% sur plus-value
```

### 15.5 Déclaration des wallets (France)

**Formulaire 3916-bis** : Déclaration des comptes d'actifs numériques

```
À déclarer chaque année si tu détiens des crypto :

WALLET 1 (LLC) :
- Type : Portefeuille d'actifs numériques
- Gestionnaire : Self-custody (Ledger)
- Pays : Non applicable (décentralisé)
- Clé publique principale : [ADRESSE]

WALLET 2 (Perso) :
- [Même format]

EXCHANGE :
- Plateforme : Kraken
- Pays : États-Unis
- Numéro de compte : [ID]
```

### 15.6 Exemple complet avec crypto

```
ANNÉE 2025 :

Revenus fiat (via Lemon Squeezy) :     80 000 €
Revenus crypto (valorisés) :            20 000 €
────────────────────────────────────────────────
CA TOTAL LLC :                         100 000 €

Répartition :
- Management fees TNS (20%) :           20 000 €
- Distributions :                       80 000 €
  └─ En USD :                          60 000 €
  └─ En crypto (gardés) :              20 000 € (pas de vente = pas d'impôt FR)

Impôts :
- TNS (22% sur 20k) :                   4 400 €
- Flat tax (30% sur 60k distribués) :  18 000 €
- Sur crypto gardés :                       0 €
────────────────────────────────────────────────
TOTAL IMPÔTS :                         22 400 €
NET :                                  77 600 €
TAUX EFFECTIF :                        22.4%
```

---

## 16. Déclaration fiscale annuelle (France)

### 16.1 Anonymat PUBLIC vs Déclaration FISCALE

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ANONYMAT PUBLIC ✅                DÉCLARATION FISC 📋        │
│   (ce que le monde voit)           (confidentiel)              │
│                                                                 │
│   Site web :                       Impôts FR :                 │
│   "SafeScoring LLC, Wyoming"       "Tu déclares tes revenus"   │
│   Pas de nom perso                 Le fisc sait qui tu es      │
│   Pas d'adresse perso              MAIS c'est confidentiel     │
│                                    (secret fiscal)             │
│                                                                 │
│   Clients voient :                 Personne d'autre ne sait    │
│   "Lemon Squeezy" sur relevé                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Tu ne peux PAS être anonyme vis-à-vis du fisc français** (c'est illégal).
**Tu PEUX être anonyme vis-à-vis du public** (c'est légal).

### 16.2 Calendrier fiscal

| Période | Action |
|---------|--------|
| Janvier-Mars | Rassembler tous les justificatifs |
| Avril | Déclaration URSSAF (revenus TNS) |
| Avril-Juin | Déclaration IR en ligne |
| Septembre | Réception avis d'imposition |
| Septembre-Décembre | Paiement (ou prélèvement) |

### 16.3 Formulaires à remplir

#### Formulaire 2042 - Déclaration principale

```
REVENUS DES PROFESSIONS NON SALARIÉES :
┌─────────────────────────────────────────────────────────────────┐
│ Case 5HQ (Micro-BNC) : [MONTANT] €                             │
│ → Tes management fees facturés à la LLC                        │
└─────────────────────────────────────────────────────────────────┘

REVENUS DE CAPITAUX MOBILIERS :
┌─────────────────────────────────────────────────────────────────┐
│ Case 2DC (Dividendes étrangers) : [MONTANT] €                  │
│ → Distributions reçues de la LLC (fiat + crypto valorisés)     │
└─────────────────────────────────────────────────────────────────┘
```

#### Formulaire 2047 - Revenus de source étrangère

```
PAGE 4 - REVENUS DE CAPITAUX MOBILIERS ÉTRANGERS

Pays d'origine : États-Unis
Nature des revenus : Distributions de société (LLC)
Montant brut : [MONTANT] €
Retenue à la source : 0 € (LLC = pass-through)
Crédit d'impôt : 0 €
```

#### Formulaire 3916 - Comptes bancaires étrangers

```
COMPTE 1 :
┌─────────────────────────────────────────────────────────────────┐
│ Intitulé : SafeScoring LLC                                     │
│ Établissement : Mercury Technologies Inc.                       │
│ Adresse : 1 Letterman Drive, San Francisco, CA 94129, USA      │
│ Pays : États-Unis                                               │
│ N° de compte : [NUMÉRO MERCURY]                                │
│ Date d'ouverture : [DATE]                                       │
│ Date de clôture : - (toujours ouvert)                          │
└─────────────────────────────────────────────────────────────────┘

COMPTE 2 :
┌─────────────────────────────────────────────────────────────────┐
│ Intitulé : [TON NOM] - Wise Business                           │
│ Établissement : Wise Payments Limited                           │
│ Adresse : Avenue Louise 54, 1050 Brussels, Belgium             │
│ Pays : Belgique                                                 │
│ N° de compte : [NUMÉRO WISE]                                   │
│ Date d'ouverture : [DATE]                                       │
└─────────────────────────────────────────────────────────────────┘
```

#### Formulaire 3916-bis - Comptes d'actifs numériques

```
WALLET PROFESSIONNEL (LLC) :
┌─────────────────────────────────────────────────────────────────┐
│ Type de compte : Portefeuille d'actifs numériques              │
│ Gestionnaire : Self-custody (Ledger/Trezor)                    │
│ Pays : Non applicable (décentralisé)                           │
│ Adresse publique BTC : bc1q[ADRESSE]                           │
│ Adresse publique ETH : 0x[ADRESSE]                             │
│ Usage : Professionnel (réception paiements clients)            │
└─────────────────────────────────────────────────────────────────┘

WALLET PERSONNEL :
┌─────────────────────────────────────────────────────────────────┐
│ Type de compte : Portefeuille d'actifs numériques              │
│ Gestionnaire : Self-custody (Ledger/Trezor)                    │
│ Adresse publique : [ADRESSES]                                   │
│ Usage : Personnel                                               │
└─────────────────────────────────────────────────────────────────┘

EXCHANGE (si utilisé) :
┌─────────────────────────────────────────────────────────────────┐
│ Plateforme : Kraken                                             │
│ Pays du siège : États-Unis                                      │
│ Identifiant de compte : [ID]                                    │
└─────────────────────────────────────────────────────────────────┘
```

#### Formulaire 2086 - Plus-values sur actifs numériques

À remplir UNIQUEMENT si tu as vendu des crypto contre EUR/fiat.

```
CESSION N°1 :
┌─────────────────────────────────────────────────────────────────┐
│ Date de cession : [DATE]                                        │
│ Valeur de cession : [MONTANT] €                                │
│ Prix d'acquisition global : [MONTANT] €                        │
│ Frais de cession : [MONTANT] €                                 │
│ Plus-value/Moins-value : [MONTANT] €                           │
└─────────────────────────────────────────────────────────────────┘

Total plus-values de l'année : [MONTANT] €
Flat tax 30% : [MONTANT] €
```

### 16.4 Exemple complet de déclaration

```
ANNÉE FISCALE 2025 - EXEMPLE

═══════════════════════════════════════════════════════════════════
REVENUS DE L'ANNÉE
═══════════════════════════════════════════════════════════════════

CA total LLC :                                      120 000 €
├── Via Lemon Squeezy (fiat) :                       90 000 €
└── Via crypto (valorisés) :                         30 000 €

Versements vers toi :
├── Management fees (TNS) :                          24 000 € (20%)
├── Distributions fiat :                             66 000 €
└── Distributions crypto (gardées en crypto) :       20 000 €

═══════════════════════════════════════════════════════════════════
FORMULAIRE 2042
═══════════════════════════════════════════════════════════════════

5HQ (Micro-BNC) :                                    24 000 €
2DC (Dividendes étrangers) :                         86 000 €
    (66 000 fiat + 20 000 crypto valorisés)

═══════════════════════════════════════════════════════════════════
CALCUL DES IMPÔTS
═══════════════════════════════════════════════════════════════════

PARTIE TNS (24 000 €) :
- Cotisations URSSAF (21.1%) :                        5 064 €
- Versement libératoire IR (2.2%) :                     528 €
- Sous-total TNS :                                    5 592 €

PARTIE DIVIDENDES (86 000 €) :
- Flat tax (PFU) 30% :                               25 800 €

═══════════════════════════════════════════════════════════════════
TOTAL IMPÔTS & CHARGES :                             31 392 €
REVENU NET :                                         88 608 €
TAUX EFFECTIF :                                       26.2%
═══════════════════════════════════════════════════════════════════
```

### 16.5 Secret fiscal - Confidentialité

```
Article L103 du Livre des Procédures Fiscales :

"L'obligation du secret professionnel [...] s'étend à toutes
les informations recueillies à l'occasion des opérations
d'assiette, de contrôle, de recouvrement ou de contentieux
des impôts, droits, taxes et redevances."

Sanctions pour violation : 1 an de prison + 15 000 € d'amende
```

**Le fisc français NE COMMUNIQUE PAS tes informations** sauf :
- Demande d'un juge (procédure judiciaire)
- Entraide fiscale internationale (traités entre pays)
- Lutte anti-blanchiment (Tracfin, sur suspicion)

### 16.6 Ce qui reste anonyme

| Information | Fisc FR | Public | Clients |
|-------------|---------|--------|---------|
| Ton nom | ✅ Oui | ❌ Non | ❌ Non |
| Ton adresse | ✅ Oui | ❌ Non | ❌ Non |
| Tes revenus | ✅ Oui | ❌ Non | ❌ Non |
| Propriétaire LLC | ✅ Oui | ❌ Non | ❌ Non |
| Nom sur le site | - | ❌ Non | ❌ Non |
| Relevé bancaire client | - | - | "Lemon Squeezy" |

### 16.7 Documents à conserver (6 ans)

- [ ] Relevés Mercury (mensuels)
- [ ] Relevés Wise (mensuels)
- [ ] Factures émises à la LLC (TNS)
- [ ] PV de distribution de dividendes
- [ ] Justificatifs paiements crypto (Tx hash + valorisation)
- [ ] Déclarations URSSAF
- [ ] Avis d'imposition
- [ ] Formulaires 3916 et 3916-bis

---

## 17. Avertissement

Ce guide est fourni à titre informatif uniquement et ne
constitue pas un conseil juridique ou fiscal. Il est
recommandé de consulter un expert-comptable ou un avocat
fiscaliste pour valider cette structure selon votre
situation personnelle.

---

*Document généré le : Janvier 2025*
*Version : 1.0*
