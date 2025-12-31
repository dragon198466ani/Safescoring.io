-- ============================================================
-- SAFESCORING - Translate ALL Norms to English
-- ============================================================
-- Run this script in Supabase SQL Editor to translate
-- all French norm descriptions to English
-- ============================================================

BEGIN;

-- ============================================================
-- Replace common French words/phrases with English
-- ============================================================

-- Security terms
UPDATE norms SET description = REPLACE(description, 'sécurité', 'security') WHERE description LIKE '%sécurité%';
UPDATE norms SET description = REPLACE(description, 'Sécurité', 'Security') WHERE description LIKE '%Sécurité%';
UPDATE norms SET description = REPLACE(description, 'clé privée', 'private key') WHERE description LIKE '%clé privée%';
UPDATE norms SET description = REPLACE(description, 'clés privées', 'private keys') WHERE description LIKE '%clés privées%';
UPDATE norms SET description = REPLACE(description, 'chiffrement', 'encryption') WHERE description LIKE '%chiffrement%';
UPDATE norms SET description = REPLACE(description, 'cryptographique', 'cryptographic') WHERE description LIKE '%cryptographique%';
UPDATE norms SET description = REPLACE(description, 'authentification', 'authentication') WHERE description LIKE '%authentification%';
UPDATE norms SET description = REPLACE(description, 'vérification', 'verification') WHERE description LIKE '%vérification%';
UPDATE norms SET description = REPLACE(description, 'sauvegarde', 'backup') WHERE description LIKE '%sauvegarde%';
UPDATE norms SET description = REPLACE(description, 'récupération', 'recovery') WHERE description LIKE '%récupération%';
UPDATE norms SET description = REPLACE(description, 'portefeuille', 'wallet') WHERE description LIKE '%portefeuille%';
UPDATE norms SET description = REPLACE(description, 'Portefeuille', 'Wallet') WHERE description LIKE '%Portefeuille%';

-- Transaction terms
UPDATE norms SET description = REPLACE(description, 'transaction', 'transaction') WHERE description LIKE '%transaction%';
UPDATE norms SET description = REPLACE(description, 'transactions', 'transactions') WHERE description LIKE '%transactions%';
UPDATE norms SET description = REPLACE(description, 'adresse', 'address') WHERE description LIKE '%adresse%';
UPDATE norms SET description = REPLACE(description, 'adresses', 'addresses') WHERE description LIKE '%adresses%';
UPDATE norms SET description = REPLACE(description, 'solde', 'balance') WHERE description LIKE '%solde%';
UPDATE norms SET description = REPLACE(description, 'frais', 'fees') WHERE description LIKE '%frais%';
UPDATE norms SET description = REPLACE(description, 'montant', 'amount') WHERE description LIKE '%montant%';
UPDATE norms SET description = REPLACE(description, 'montants', 'amounts') WHERE description LIKE '%montants%';

-- User terms
UPDATE norms SET description = REPLACE(description, 'utilisateur', 'user') WHERE description LIKE '%utilisateur%';
UPDATE norms SET description = REPLACE(description, 'utilisateurs', 'users') WHERE description LIKE '%utilisateurs%';
UPDATE norms SET description = REPLACE(description, 'Utilisateur', 'User') WHERE description LIKE '%Utilisateur%';

-- Action verbs
UPDATE norms SET description = REPLACE(description, 'permet de', 'allows to') WHERE description LIKE '%permet de%';
UPDATE norms SET description = REPLACE(description, 'permet', 'allows') WHERE description LIKE '%permet%';
UPDATE norms SET description = REPLACE(description, 'assure', 'ensures') WHERE description LIKE '%assure%';
UPDATE norms SET description = REPLACE(description, 'protège', 'protects') WHERE description LIKE '%protège%';
UPDATE norms SET description = REPLACE(description, 'garantit', 'guarantees') WHERE description LIKE '%garantit%';
UPDATE norms SET description = REPLACE(description, 'vérifie', 'verifies') WHERE description LIKE '%vérifie%';
UPDATE norms SET description = REPLACE(description, 'affiche', 'displays') WHERE description LIKE '%affiche%';
UPDATE norms SET description = REPLACE(description, 'Affichage', 'Display') WHERE description LIKE '%Affichage%';
UPDATE norms SET description = REPLACE(description, 'calcul', 'calculation') WHERE description LIKE '%calcul%';
UPDATE norms SET description = REPLACE(description, 'Calcul', 'Calculation') WHERE description LIKE '%Calcul%';

-- Common phrases
UPDATE norms SET description = REPLACE(description, 'contre les', 'against') WHERE description LIKE '%contre les%';
UPDATE norms SET description = REPLACE(description, 'contre', 'against') WHERE description LIKE '%contre%';
UPDATE norms SET description = REPLACE(description, 'attaques', 'attacks') WHERE description LIKE '%attaques%';
UPDATE norms SET description = REPLACE(description, 'données', 'data') WHERE description LIKE '%données%';
UPDATE norms SET description = REPLACE(description, 'système', 'system') WHERE description LIKE '%système%';
UPDATE norms SET description = REPLACE(description, 'réseau', 'network') WHERE description LIKE '%réseau%';
UPDATE norms SET description = REPLACE(description, 'protocole', 'protocol') WHERE description LIKE '%protocole%';
UPDATE norms SET description = REPLACE(description, 'appareil', 'device') WHERE description LIKE '%appareil%';
UPDATE norms SET description = REPLACE(description, 'application', 'application') WHERE description LIKE '%application%';

-- Articles and prepositions
UPDATE norms SET description = REPLACE(description, ' les ', ' the ') WHERE description LIKE '% les %';
UPDATE norms SET description = REPLACE(description, ' des ', ' of ') WHERE description LIKE '% des %';
UPDATE norms SET description = REPLACE(description, ' une ', ' a ') WHERE description LIKE '% une %';
UPDATE norms SET description = REPLACE(description, ' un ', ' a ') WHERE description LIKE '% un %';
UPDATE norms SET description = REPLACE(description, ' la ', ' the ') WHERE description LIKE '% la %';
UPDATE norms SET description = REPLACE(description, ' le ', ' the ') WHERE description LIKE '% le %';
UPDATE norms SET description = REPLACE(description, ' du ', ' of the ') WHERE description LIKE '% du %';
UPDATE norms SET description = REPLACE(description, ' de ', ' of ') WHERE description LIKE '% de %';
UPDATE norms SET description = REPLACE(description, ' dans ', ' in ') WHERE description LIKE '% dans %';
UPDATE norms SET description = REPLACE(description, ' avec ', ' with ') WHERE description LIKE '% avec %';
UPDATE norms SET description = REPLACE(description, ' pour ', ' for ') WHERE description LIKE '% pour %';
UPDATE norms SET description = REPLACE(description, ' sur ', ' on ') WHERE description LIKE '% sur %';
UPDATE norms SET description = REPLACE(description, ' par ', ' by ') WHERE description LIKE '% par %';
UPDATE norms SET description = REPLACE(description, ' et ', ' and ') WHERE description LIKE '% et %';
UPDATE norms SET description = REPLACE(description, ' ou ', ' or ') WHERE description LIKE '% ou %';

-- Adjectives
UPDATE norms SET description = REPLACE(description, 'sécurisé', 'secure') WHERE description LIKE '%sécurisé%';
UPDATE norms SET description = REPLACE(description, 'sécurisée', 'secure') WHERE description LIKE '%sécurisée%';
UPDATE norms SET description = REPLACE(description, 'privé', 'private') WHERE description LIKE '%privé%';
UPDATE norms SET description = REPLACE(description, 'privée', 'private') WHERE description LIKE '%privée%';
UPDATE norms SET description = REPLACE(description, 'public', 'public') WHERE description LIKE '%public%';
UPDATE norms SET description = REPLACE(description, 'actif', 'active') WHERE description LIKE '%actif%';
UPDATE norms SET description = REPLACE(description, 'actifs', 'assets') WHERE description LIKE '%actifs%';

-- Technical terms
UPDATE norms SET description = REPLACE(description, 'Engagement cryptographique', 'Cryptographic commitment') WHERE description LIKE '%Engagement cryptographique%';
UPDATE norms SET description = REPLACE(description, 'Intégration', 'Integration') WHERE description LIKE '%Intégration%';
UPDATE norms SET description = REPLACE(description, 'Résistance', 'Resistance') WHERE description LIKE '%Résistance%';
UPDATE norms SET description = REPLACE(description, 'résistance', 'resistance') WHERE description LIKE '%résistance%';
UPDATE norms SET description = REPLACE(description, 'censure', 'censorship') WHERE description LIKE '%censure%';
UPDATE norms SET description = REPLACE(description, 'Étiquetage', 'Labeling') WHERE description LIKE '%Étiquetage%';
UPDATE norms SET description = REPLACE(description, 'étiquetage', 'labeling') WHERE description LIKE '%étiquetage%';
UPDATE norms SET description = REPLACE(description, 'Contournement', 'Bypass') WHERE description LIKE '%Contournement%';
UPDATE norms SET description = REPLACE(description, 'restrictions', 'restrictions') WHERE description LIKE '%restrictions%';
UPDATE norms SET description = REPLACE(description, 'géographiques', 'geographic') WHERE description LIKE '%géographiques%';
UPDATE norms SET description = REPLACE(description, 'Coffre', 'Vault') WHERE description LIKE '%Coffre%';
UPDATE norms SET description = REPLACE(description, 'période', 'period') WHERE description LIKE '%période%';
UPDATE norms SET description = REPLACE(description, 'contestation', 'contestation') WHERE description LIKE '%contestation%';
UPDATE norms SET description = REPLACE(description, 'délais', 'delays') WHERE description LIKE '%délais%';
UPDATE norms SET description = REPLACE(description, 'Dérivation', 'Derivation') WHERE description LIKE '%Dérivation%';
UPDATE norms SET description = REPLACE(description, 'mot de passe', 'password') WHERE description LIKE '%mot de passe%';
UPDATE norms SET description = REPLACE(description, 'Catalogue', 'Catalog') WHERE description LIKE '%Catalogue%';
UPDATE norms SET description = REPLACE(description, 'mesures', 'measures') WHERE description LIKE '%mesures%';
UPDATE norms SET description = REPLACE(description, 'gains', 'gains') WHERE description LIKE '%gains%';
UPDATE norms SET description = REPLACE(description, 'pertes', 'losses') WHERE description LIKE '%pertes%';
UPDATE norms SET description = REPLACE(description, 'avis', 'advice') WHERE description LIKE '%avis%';
UPDATE norms SET description = REPLACE(description, 'voyage', 'travel') WHERE description LIKE '%voyage%';
UPDATE norms SET description = REPLACE(description, 'clair', 'clear') WHERE description LIKE '%clair%';

-- Also update title column
UPDATE norms SET title = REPLACE(title, 'Engagement cryptographique', 'Cryptographic commitment') WHERE title LIKE '%Engagement cryptographique%';
UPDATE norms SET title = REPLACE(title, 'Intégration', 'Integration') WHERE title LIKE '%Intégration%';
UPDATE norms SET title = REPLACE(title, 'Résistance', 'Resistance') WHERE title LIKE '%Résistance%';
UPDATE norms SET title = REPLACE(title, 'Étiquetage', 'Labeling') WHERE title LIKE '%Étiquetage%';
UPDATE norms SET title = REPLACE(title, 'Contournement', 'Bypass') WHERE title LIKE '%Contournement%';
UPDATE norms SET title = REPLACE(title, 'Coffre', 'Vault') WHERE title LIKE '%Coffre%';
UPDATE norms SET title = REPLACE(title, 'Dérivation', 'Derivation') WHERE title LIKE '%Dérivation%';
UPDATE norms SET title = REPLACE(title, 'Catalogue', 'Catalog') WHERE title LIKE '%Catalogue%';
UPDATE norms SET title = REPLACE(title, 'Calcul', 'Calculation') WHERE title LIKE '%Calcul%';
UPDATE norms SET title = REPLACE(title, 'Affichage', 'Display') WHERE title LIKE '%Affichage%';
UPDATE norms SET title = REPLACE(title, 'Vérification', 'Verification') WHERE title LIKE '%Vérification%';
UPDATE norms SET title = REPLACE(title, 'sécurité', 'security') WHERE title LIKE '%sécurité%';
UPDATE norms SET title = REPLACE(title, 'Sécurité', 'Security') WHERE title LIKE '%Sécurité%';

COMMIT;

-- Verify results
SELECT 'Translation complete!' as status;
SELECT COUNT(*) as remaining_french FROM norms 
WHERE description LIKE '% est %' 
   OR description LIKE '% une %' 
   OR description LIKE '% pour %'
   OR description LIKE '% les %'
   OR description LIKE '%sécurité%';
