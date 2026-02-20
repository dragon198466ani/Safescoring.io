#!/usr/bin/env python3
"""
Script pour générer des exports comptables pour Delock
Formats supportés: FEC, CSV, Excel

Usage:
  python scripts/export_for_delock.py --year 2025 --format fec
  python scripts/export_for_delock.py --year 2025 --format csv
  python scripts/export_for_delock.py --year 2025 --format all
"""

import os
import sys
import argparse
import csv
from datetime import datetime
from decimal import Decimal
from supabase import create_client, Client

# Configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Informations SASU (à configurer)
SASU_INFO = {
    "siren": "123456789",
    "name": "SafeScoring SASU",
    "year_end": "1231",  # 31/12 (fin d'exercice)
}


class DelockExporter:
    def __init__(self, year: int):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis")

        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.year = year

        # Données chargées
        self.crypto_payments = []
        self.staking_rewards = []
        self.expenses = []

    def load_data(self):
        """Charge toutes les données de l'année"""
        print(f"📥 Chargement des données {self.year}...")

        # Paiements crypto
        result = self.supabase.table("crypto_payments")\
            .select("*")\
            .gte("created_at", f"{self.year}-01-01")\
            .lte("created_at", f"{self.year}-12-31")\
            .eq("status", "confirmed")\
            .execute()
        self.crypto_payments = result.data or []

        # Récompenses staking
        result = self.supabase.table("staking_rewards")\
            .select("*")\
            .gte("date", f"{self.year}-01-01")\
            .lte("date", f"{self.year}-12-31")\
            .execute()
        self.staking_rewards = result.data or []

        # Dépenses
        result = self.supabase.table("expenses")\
            .select("*")\
            .gte("date", f"{self.year}-01-01")\
            .lte("date", f"{self.year}-12-31")\
            .execute()
        self.expenses = result.data or []

        print(f"  ✅ {len(self.crypto_payments)} paiements crypto")
        print(f"  ✅ {len(self.staking_rewards)} récompenses staking")
        print(f"  ✅ {len(self.expenses)} dépenses")

    def export_fec(self, output_file: str):
        """
        Exporte au format FEC (Fichier des Écritures Comptables)
        Format requis par l'administration fiscale française
        """
        print(f"\n📄 Génération du fichier FEC: {output_file}")

        with open(output_file, "w", encoding="utf-8", newline="") as f:
            # En-tête FEC
            headers = [
                "JournalCode",
                "JournalLib",
                "EcritureNum",
                "EcritureDate",
                "CompteNum",
                "CompteLib",
                "CompAuxNum",
                "CompAuxLib",
                "PieceRef",
                "PieceDate",
                "EcritureLib",
                "Debit",
                "Credit",
                "EcritureLet",
                "DateLet",
                "ValidDate",
                "Montantdevise",
                "Idevise",
            ]

            writer = csv.DictWriter(f, fieldnames=headers, delimiter="|")
            writer.writeheader()

            ecriture_num = 1

            # 1. Paiements crypto (Ventes)
            for payment in self.crypto_payments:
                date = payment["created_at"][:10].replace("-", "")
                amount = float(payment.get("amount_usdc", 0))
                amount_ht = amount / 1.20  # Enlever TVA 20%
                amount_tva = amount - amount_ht

                ref = f"FAC{ecriture_num:06d}"

                # Ligne 1: Débit compte actifs numériques (530)
                writer.writerow({
                    "JournalCode": "VE",
                    "JournalLib": "Ventes",
                    "EcritureNum": f"VE{self.year}{ecriture_num:06d}",
                    "EcritureDate": date,
                    "CompteNum": "530",
                    "CompteLib": "Actifs numériques",
                    "CompAuxNum": "",
                    "CompAuxLib": "",
                    "PieceRef": ref,
                    "PieceDate": date,
                    "EcritureLib": f"Paiement crypto {payment.get('tier', '')}",
                    "Debit": f"{amount:.2f}",
                    "Credit": "",
                    "EcritureLet": "",
                    "DateLet": "",
                    "ValidDate": date,
                    "Montantdevise": "",
                    "Idevise": "",
                })

                # Ligne 2: Crédit ventes (706)
                writer.writerow({
                    "JournalCode": "VE",
                    "JournalLib": "Ventes",
                    "EcritureNum": f"VE{self.year}{ecriture_num:06d}",
                    "EcritureDate": date,
                    "CompteNum": "706",
                    "CompteLib": "Prestations de services",
                    "CompAuxNum": "",
                    "CompAuxLib": "",
                    "PieceRef": ref,
                    "PieceDate": date,
                    "EcritureLib": f"Paiement crypto {payment.get('tier', '')}",
                    "Debit": "",
                    "Credit": f"{amount_ht:.2f}",
                    "EcritureLet": "",
                    "DateLet": "",
                    "ValidDate": date,
                    "Montantdevise": "",
                    "Idevise": "",
                })

                # Ligne 3: Crédit TVA collectée (44571)
                writer.writerow({
                    "JournalCode": "VE",
                    "JournalLib": "Ventes",
                    "EcritureNum": f"VE{self.year}{ecriture_num:06d}",
                    "EcritureDate": date,
                    "CompteNum": "44571",
                    "CompteLib": "TVA collectée",
                    "CompAuxNum": "",
                    "CompAuxLib": "",
                    "PieceRef": ref,
                    "PieceDate": date,
                    "EcritureLib": f"TVA paiement crypto",
                    "Debit": "",
                    "Credit": f"{amount_tva:.2f}",
                    "EcritureLet": "",
                    "DateLet": "",
                    "ValidDate": date,
                    "Montantdevise": "",
                    "Idevise": "",
                })

                ecriture_num += 1

            # 2. Récompenses staking (Produits financiers)
            for reward in self.staking_rewards:
                date = reward["date"].replace("-", "")
                amount = float(reward.get("value_eur", 0))

                ref = f"STK{ecriture_num:06d}"

                # Ligne 1: Débit actifs numériques
                writer.writerow({
                    "JournalCode": "OD",
                    "JournalLib": "Opérations diverses",
                    "EcritureNum": f"OD{self.year}{ecriture_num:06d}",
                    "EcritureDate": date,
                    "CompteNum": "530",
                    "CompteLib": f"Actifs numériques {reward['crypto']}",
                    "CompAuxNum": "",
                    "CompAuxLib": "",
                    "PieceRef": ref,
                    "PieceDate": date,
                    "EcritureLib": f"Récompense staking {reward['crypto']}",
                    "Debit": f"{amount:.2f}",
                    "Credit": "",
                    "EcritureLet": "",
                    "DateLet": "",
                    "ValidDate": date,
                    "Montantdevise": "",
                    "Idevise": "",
                })

                # Ligne 2: Crédit produits financiers (764)
                writer.writerow({
                    "JournalCode": "OD",
                    "JournalLib": "Opérations diverses",
                    "EcritureNum": f"OD{self.year}{ecriture_num:06d}",
                    "EcritureDate": date,
                    "CompteNum": "764",
                    "CompteLib": "Revenus de staking",
                    "CompAuxNum": "",
                    "CompAuxLib": "",
                    "PieceRef": ref,
                    "PieceDate": date,
                    "EcritureLib": f"Récompense staking {reward['crypto']}",
                    "Debit": "",
                    "Credit": f"{amount:.2f}",
                    "EcritureLet": "",
                    "DateLet": "",
                    "ValidDate": date,
                    "Montantdevise": "",
                    "Idevise": "",
                })

                ecriture_num += 1

            # 3. Dépenses
            for expense in self.expenses:
                date = expense["date"].replace("-", "")
                amount = float(expense.get("amount", 0))

                ref = f"ACH{ecriture_num:06d}"

                # Ligne 1: Débit charges (6xx)
                compte_charge = "606"  # À adapter selon la catégorie
                writer.writerow({
                    "JournalCode": "AC",
                    "JournalLib": "Achats",
                    "EcritureNum": f"AC{self.year}{ecriture_num:06d}",
                    "EcritureDate": date,
                    "CompteNum": compte_charge,
                    "CompteLib": expense.get("description", "Charge"),
                    "CompAuxNum": "",
                    "CompAuxLib": "",
                    "PieceRef": ref,
                    "PieceDate": date,
                    "EcritureLib": expense.get("description", "Dépense"),
                    "Debit": f"{amount:.2f}",
                    "Credit": "",
                    "EcritureLet": "",
                    "DateLet": "",
                    "ValidDate": date,
                    "Montantdevise": "",
                    "Idevise": "",
                })

                # Ligne 2: Crédit banque ou actifs numériques (530 si payé en crypto)
                writer.writerow({
                    "JournalCode": "AC",
                    "JournalLib": "Achats",
                    "EcritureNum": f"AC{self.year}{ecriture_num:06d}",
                    "EcritureDate": date,
                    "CompteNum": "530",  # ou "512" si banque
                    "CompteLib": "Actifs numériques",
                    "CompAuxNum": "",
                    "CompAuxLib": "",
                    "PieceRef": ref,
                    "PieceDate": date,
                    "EcritureLib": expense.get("description", "Dépense"),
                    "Debit": "",
                    "Credit": f"{amount:.2f}",
                    "EcritureLet": "",
                    "DateLet": "",
                    "ValidDate": date,
                    "Montantdevise": "",
                    "Idevise": "",
                })

                ecriture_num += 1

        print(f"  ✅ Fichier FEC généré: {output_file}")
        print(f"  📊 {ecriture_num - 1} écritures comptables")

    def export_csv(self, output_file: str):
        """Exporte au format CSV simple pour Delock"""
        print(f"\n📄 Génération du fichier CSV: {output_file}")

        with open(output_file, "w", encoding="utf-8", newline="") as f:
            headers = [
                "Date",
                "Type",
                "Description",
                "Crypto",
                "Quantité",
                "Valeur EUR",
                "TxHash",
                "Référence",
            ]

            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()

            # Paiements crypto
            for payment in self.crypto_payments:
                writer.writerow({
                    "Date": payment["created_at"][:10],
                    "Type": "Paiement client",
                    "Description": f"Abonnement {payment.get('tier', '')}",
                    "Crypto": "USDC",
                    "Quantité": payment.get("amount_usdc", 0),
                    "Valeur EUR": payment.get("amount_usdc", 0),
                    "TxHash": payment.get("tx_hash", ""),
                    "Référence": f"FAC-{payment['id'][:8]}",
                })

            # Staking
            for reward in self.staking_rewards:
                writer.writerow({
                    "Date": reward["date"],
                    "Type": "Récompense staking",
                    "Description": f"Staking {reward['crypto']}",
                    "Crypto": reward["crypto"],
                    "Quantité": reward.get("amount", 0),
                    "Valeur EUR": reward.get("value_eur", 0),
                    "TxHash": reward.get("tx_hash", "-"),
                    "Référence": f"STK-{reward['id'][:8]}",
                })

            # Dépenses
            for expense in self.expenses:
                writer.writerow({
                    "Date": expense["date"],
                    "Type": "Dépense",
                    "Description": expense.get("description", ""),
                    "Crypto": "-",
                    "Quantité": "-",
                    "Valeur EUR": expense.get("amount", 0),
                    "TxHash": "-",
                    "Référence": f"DEP-{expense['id'][:8]}",
                })

        print(f"  ✅ Fichier CSV généré: {output_file}")

    def export_summary(self, output_file: str):
        """Génère un résumé fiscal pour Delock"""
        print(f"\n📄 Génération du résumé fiscal: {output_file}")

        total_revenue = sum(float(p.get("amount_usdc", 0)) for p in self.crypto_payments)
        total_staking = sum(float(r.get("value_eur", 0)) for r in self.staking_rewards)
        total_expenses = sum(float(e.get("amount", 0)) for e in self.expenses)
        total_income = total_revenue + total_staking
        taxable_profit = total_income - total_expenses

        # Calcul IS
        if taxable_profit <= 0:
            corporate_tax = 0
        elif taxable_profit <= 42500:
            corporate_tax = taxable_profit * 0.15
        else:
            corporate_tax = 42500 * 0.15 + (taxable_profit - 42500) * 0.25

        net_profit = taxable_profit - corporate_tax

        with open(output_file, "w", encoding="utf-8") as f:
            f.write(f"═══════════════════════════════════════════════════\n")
            f.write(f"  RÉSUMÉ FISCAL {self.year} - {SASU_INFO['name']}\n")
            f.write(f"  SIREN: {SASU_INFO['siren']}\n")
            f.write(f"═══════════════════════════════════════════════════\n\n")

            f.write(f"📊 REVENUS\n")
            f.write(f"  Paiements crypto:        {total_revenue:>12.2f} €\n")
            f.write(f"  Récompenses staking:     {total_staking:>12.2f} €\n")
            f.write(f"  ─────────────────────────────────────\n")
            f.write(f"  TOTAL REVENUS:           {total_income:>12.2f} €\n\n")

            f.write(f"💰 CHARGES DÉDUCTIBLES\n")
            f.write(f"  Total dépenses:          {total_expenses:>12.2f} €\n\n")

            f.write(f"📈 BÉNÉFICE\n")
            f.write(f"  Bénéfice imposable:      {taxable_profit:>12.2f} €\n\n")

            f.write(f"🏛️  IMPÔT SUR LES SOCIÉTÉS (IS)\n")
            if taxable_profit <= 0:
                f.write(f"  Pas d'impôt (bénéfice négatif)\n")
            elif taxable_profit <= 42500:
                f.write(f"  Tranche 1 (15%):         {corporate_tax:>12.2f} €\n")
            else:
                t1 = 42500 * 0.15
                t2 = (taxable_profit - 42500) * 0.25
                f.write(f"  Tranche 1 (15%):         {t1:>12.2f} €\n")
                f.write(f"  Tranche 2 (25%):         {t2:>12.2f} €\n")

            f.write(f"  ─────────────────────────────────────\n")
            f.write(f"  TOTAL IS:                {corporate_tax:>12.2f} €\n\n")

            f.write(f"✅ BÉNÉFICE NET\n")
            f.write(f"  Après IS:                {net_profit:>12.2f} €\n\n")

            f.write(f"═══════════════════════════════════════════════════\n")
            f.write(f"  Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}\n")
            f.write(f"═══════════════════════════════════════════════════\n")

        print(f"  ✅ Résumé fiscal généré: {output_file}")
        print(f"\n📊 Aperçu:")
        print(f"  Revenus totaux:      {total_income:>10.2f} €")
        print(f"  Charges:             {total_expenses:>10.2f} €")
        print(f"  Bénéfice imposable:  {taxable_profit:>10.2f} €")
        print(f"  IS à payer:          {corporate_tax:>10.2f} €")
        print(f"  Bénéfice NET:        {net_profit:>10.2f} €")


def main():
    parser = argparse.ArgumentParser(description="Export comptable pour Delock")
    parser.add_argument("--year", type=int, default=datetime.now().year, help="Année fiscale")
    parser.add_argument(
        "--format",
        choices=["fec", "csv", "summary", "all"],
        default="all",
        help="Format d'export",
    )
    parser.add_argument("--output-dir", default="./exports", help="Dossier de sortie")

    args = parser.parse_args()

    # Créer dossier de sortie
    os.makedirs(args.output_dir, exist_ok=True)

    try:
        exporter = DelockExporter(args.year)
        exporter.load_data()

        if args.format in ["fec", "all"]:
            output = os.path.join(args.output_dir, f"{SASU_INFO['siren']}FEC{args.year}.txt")
            exporter.export_fec(output)

        if args.format in ["csv", "all"]:
            output = os.path.join(args.output_dir, f"SafeScoring_Transactions_{args.year}.csv")
            exporter.export_csv(output)

        if args.format in ["summary", "all"]:
            output = os.path.join(args.output_dir, f"SafeScoring_Resume_Fiscal_{args.year}.txt")
            exporter.export_summary(output)

        print(f"\n✅ Export terminé! Fichiers dans: {args.output_dir}")

    except Exception as e:
        print(f"❌ Erreur: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
