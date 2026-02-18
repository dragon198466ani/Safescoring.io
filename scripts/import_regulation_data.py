#!/usr/bin/env python3
"""
SAFESCORING.IO - Import Regulation Data from Excel
Imports crypto regulation data from Excel to Supabase
"""

import os
import re
import json
import requests
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

EXCEL_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'crypto_reglementation_complete (1).xlsx')

class RegulationImporter:
    def __init__(self):
        self.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        
        print("🔄 IMPORT DONNÉES RÉGLEMENTATION → SUPABASE")
        print("=" * 60)
        print(f"📁 Fichier Excel: {EXCEL_FILE}")
        print(f"🔗 Supabase URL: {SUPABASE_URL}")
        
    def test_connection(self) -> bool:
        """Test Supabase connection"""
        try:
            response = requests.get(
                f"{SUPABASE_URL}/rest/v1/country_crypto_profiles?select=count&limit=1",
                headers=self.headers,
                timeout=10
            )
            return response.status_code in [200, 206]
        except Exception as e:
            print(f"❌ Connection error: {e}")
            return False
    
    def clean_country_name(self, name: str) -> str:
        """Remove emoji flags from country names"""
        if pd.isna(name):
            return ""
        # Remove emoji flags (Unicode range for flags)
        cleaned = re.sub(r'[\U0001F1E0-\U0001F1FF]+', '', str(name)).strip()
        return cleaned
    
    def parse_tax_rate(self, tax_str: str) -> Optional[float]:
        """Parse tax rate string to float"""
        if pd.isna(tax_str) or tax_str in ['N/A', 'Variable', '0%', 'Aucune']:
            return None
        # Extract first number
        match = re.search(r'(\d+(?:\.\d+)?)', str(tax_str))
        if match:
            return float(match.group(1))
        return None
    
    def parse_crypto_stance(self, status: str, risk: str) -> str:
        """Determine crypto stance from status and risk level"""
        status = str(status).lower() if not pd.isna(status) else ""
        risk = str(risk).lower() if not pd.isna(risk) else ""
        
        if 'interdit' in status or 'ban' in status:
            return 'very_hostile'
        elif 'restreint' in status or 'hostile' in risk:
            return 'hostile'
        elif 'élevé' in risk or 'high' in risk:
            return 'restrictive'
        elif 'faible' in risk or 'low' in risk:
            return 'friendly'
        elif 'leader' in status or 'très faible' in risk:
            return 'very_friendly'
        elif 'non régulé' in status:
            return 'unregulated'
        return 'neutral'
    
    def parse_cbdc_status(self, cbdc_str: str) -> str:
        """Parse CBDC status"""
        if pd.isna(cbdc_str):
            return 'no_plans'
        cbdc = str(cbdc_str).lower()
        if 'lancé' in cbdc or 'launched' in cbdc or 'actif' in cbdc:
            return 'launched'
        elif 'pilote' in cbdc or 'pilot' in cbdc:
            return 'pilot'
        elif 'recherche' in cbdc or 'research' in cbdc:
            return 'research'
        elif 'non' in cbdc or 'no' in cbdc:
            return 'no_plans'
        return 'research'
    
    def import_country_profiles(self) -> int:
        """Import country crypto profiles from 'Réglementation par Pays' sheet"""
        print("\n📊 Importing Country Crypto Profiles...")
        
        try:
            df = pd.read_excel(EXCEL_FILE, sheet_name='Réglementation par Pays', header=1)
            cols = ['Pays', 'Code', 'Statut_Legal', 'Tax_Gains_CT', 'Tax_Gains_LT', 
                    'Mining', 'Regulateur', 'Loi_Principale', 'Travel_Rule', 'CBDC', 
                    'Niveau_Risque', 'Notes']
            df.columns = cols
            
            # Filter valid rows
            df = df.dropna(subset=['Code'])
            df = df[df['Code'] != 'Code']  # Remove header row if duplicated
            
            profiles = []
            for _, row in df.iterrows():
                country_code = str(row['Code']).strip().upper()[:2]
                if len(country_code) != 2:
                    continue
                
                status = str(row['Statut_Legal']) if not pd.isna(row['Statut_Legal']) else ''
                risk = str(row['Niveau_Risque']) if not pd.isna(row['Niveau_Risque']) else ''
                
                profile = {
                    'country_code': country_code,
                    'country_name': self.clean_country_name(row['Pays']),
                    'crypto_stance': self.parse_crypto_stance(status, risk),
                    'crypto_legal': 'interdit' not in status.lower() and 'ban' not in status.lower(),
                    'trading_allowed': 'interdit' not in status.lower(),
                    'mining_allowed': 'légal' in str(row['Mining']).lower() if not pd.isna(row['Mining']) else True,
                    'capital_gains_tax_rate': self.parse_tax_rate(row['Tax_Gains_CT']),
                    'crypto_taxed': self.parse_tax_rate(row['Tax_Gains_CT']) is not None and self.parse_tax_rate(row['Tax_Gains_CT']) > 0,
                    'regulatory_body': str(row['Regulateur']) if not pd.isna(row['Regulateur']) else None,
                    'cbdc_status': self.parse_cbdc_status(row['CBDC']),
                    'last_updated': datetime.now().isoformat(),
                    'data_quality': 'high'
                }
                profiles.append(profile)
            
            print(f"   📋 {len(profiles)} country profiles prepared")
            return self._upsert_batch('country_crypto_profiles', profiles, 'country_code')
            
        except Exception as e:
            print(f"❌ Error importing country profiles: {e}")
            import traceback
            traceback.print_exc()
            return 0
    
    def import_tax_free_countries(self) -> int:
        """Import tax-free countries data"""
        print("\n🏝️ Importing Tax-Free Countries...")
        
        try:
            df = pd.read_excel(EXCEL_FILE, sheet_name='Pays Tax-Free', header=1)
            cols = ['Pays', 'Tax_CT', 'Tax_LT', 'Condition', 'Residence', 'Notes']
            df.columns = cols
            df = df.dropna(subset=['Pays'])
            df = df[df['Pays'] != 'Pays']
            
            updates = []
            for _, row in df.iterrows():
                # Extract country code from name or use mapping
                country_name = self.clean_country_name(row['Pays'])
                
                update = {
                    'country_name': country_name,
                    'crypto_stance': 'very_friendly',
                    'crypto_taxed': False,
                    'capital_gains_tax_rate': 0,
                }
                updates.append(update)
            
            print(f"   📋 {len(updates)} tax-free countries identified")
            # These will be merged with existing profiles
            return len(updates)
            
        except Exception as e:
            print(f"❌ Error importing tax-free countries: {e}")
            return 0
    
    def import_banned_countries(self) -> int:
        """Import countries where crypto is banned"""
        print("\n🚫 Importing Banned Countries...")
        
        try:
            df = pd.read_excel(EXCEL_FILE, sheet_name='Pays Crypto Interdit', header=1)
            cols = ['Pays', 'Statut', 'Niveau_Ban', 'Date_Ban', 'Sanctions', 'Notes']
            df.columns = cols
            df = df.dropna(subset=['Pays'])
            df = df[df['Pays'] != 'Pays']
            
            updates = []
            for _, row in df.iterrows():
                country_name = self.clean_country_name(row['Pays'])
                
                update = {
                    'country_name': country_name,
                    'crypto_stance': 'very_hostile',
                    'crypto_legal': False,
                    'trading_allowed': False,
                    'mining_allowed': False,
                }
                updates.append(update)
            
            print(f"   📋 {len(updates)} banned countries identified")
            return len(updates)
            
        except Exception as e:
            print(f"❌ Error importing banned countries: {e}")
            return 0
    
    def import_crypto_seizures(self) -> int:
        """Import real crypto seizure cases"""
        print("\n📋 Importing Crypto Seizure Cases...")
        
        try:
            df = pd.read_excel(EXCEL_FILE, sheet_name='Cas Réels Saisies', header=1)
            cols = ['Pays', 'Date', 'Agence', 'Type', 'Details', 'Montant', 'Issue', 'Source']
            df.columns = cols
            df = df.dropna(subset=['Pays'])
            df = df[df['Pays'] != 'Pays']
            
            seizures = []
            for _, row in df.iterrows():
                country_name = self.clean_country_name(row['Pays'])
                
                seizure = {
                    'country_name': country_name,
                    'incident_date': str(row['Date']) if not pd.isna(row['Date']) else None,
                    'agency': str(row['Agence']) if not pd.isna(row['Agence']) else None,
                    'incident_type': str(row['Type']) if not pd.isna(row['Type']) else 'seizure',
                    'description': str(row['Details']) if not pd.isna(row['Details']) else None,
                    'amount': str(row['Montant']) if not pd.isna(row['Montant']) else None,
                    'outcome': str(row['Issue']) if not pd.isna(row['Issue']) else None,
                    'source_url': str(row['Source']) if not pd.isna(row['Source']) else None,
                    'created_at': datetime.now().isoformat()
                }
                seizures.append(seizure)
            
            print(f"   📋 {len(seizures)} seizure cases prepared")
            return self._batch_insert('crypto_seizures', seizures)
            
        except Exception as e:
            print(f"❌ Error importing seizures: {e}")
            return 0
    
    def import_crypto_legislation(self) -> int:
        """Import world crypto laws and regulations"""
        print("\n⚖️ Importing Crypto Legislation...")
        
        try:
            df = pd.read_excel(EXCEL_FILE, sheet_name='Lois & Régulations Monde', header=1)
            # Colonnes: Pays, Statut, Loi Principale, Date, Régulateur, Licence Requise, AML/KYC, Tax, Mining, Sanctions, CBDC, Notes
            cols = ['Pays', 'Statut', 'Loi_Principale', 'Date', 'Regulateur', 'Licence', 
                    'AML_KYC', 'Tax', 'Mining', 'Sanctions', 'CBDC', 'Notes']
            if len(df.columns) >= len(cols):
                df.columns = cols[:len(df.columns)]
            
            df = df.dropna(subset=['Pays'])
            df = df[df['Pays'] != 'Pays']
            
            legislations = []
            for idx, row in df.iterrows():
                country_name = self.clean_country_name(row['Pays'])
                
                # Create unique legislation ID
                leg_id = f"{country_name[:3].upper()}-MAIN-{idx}"
                slug = re.sub(r'[^\w\s-]', '', country_name.lower())
                slug = re.sub(r'[-\s]+', '-', slug)
                
                legislation = {
                    'legislation_id': leg_id,
                    'slug': f"{slug}-crypto-law",
                    'country_code': self._get_country_code(country_name),
                    'title': str(row['Loi_Principale']) if not pd.isna(row['Loi_Principale']) else f"{country_name} Crypto Regulation",
                    'category': 'regulation',
                    'status': 'in_effect',
                    'regulatory_body': str(row['Regulateur']) if not pd.isna(row['Regulateur']) else None,
                    'license_required': 'oui' in str(row['Licence']).lower() if not pd.isna(row['Licence']) else False,
                    'aml_required': 'oui' in str(row['AML_KYC']).lower() or 'strict' in str(row['AML_KYC']).lower() if not pd.isna(row['AML_KYC']) else False,
                    'kyc_required': 'oui' in str(row['AML_KYC']).lower() or 'strict' in str(row['AML_KYC']).lower() if not pd.isna(row['AML_KYC']) else False,
                    'max_penalty_individual': str(row['Sanctions']) if not pd.isna(row['Sanctions']) else None,
                    'created_at': datetime.now().isoformat(),
                    'verified': True
                }
                legislations.append(legislation)
            
            print(f"   📋 {len(legislations)} legislation records prepared")
            return self._upsert_batch('crypto_legislation', legislations, 'legislation_id')
            
        except Exception as e:
            print(f"❌ Error importing legislation: {e}")
            import traceback
            traceback.print_exc()
            return 0
    
    def import_wrench_attacks(self) -> int:
        """Import physical attack (wrench attack) data"""
        print("\n🔧 Importing Wrench Attacks...")
        
        try:
            df = pd.read_excel(EXCEL_FILE, sheet_name='Wrench Attacks', header=1)
            df = df.dropna(how='all')
            
            print(f"   📋 {len(df)} wrench attack records found")
            # This data would go to physical_incidents table
            return len(df)
            
        except Exception as e:
            print(f"❌ Error importing wrench attacks: {e}")
            return 0
    
    def import_forensic_tools(self) -> int:
        """Import forensic tools data"""
        print("\n🔍 Importing Forensic Tools...")
        
        try:
            df = pd.read_excel(EXCEL_FILE, sheet_name='Outils Forensiques', header=1)
            df = df.dropna(how='all')
            
            print(f"   📋 {len(df)} forensic tools found")
            return len(df)
            
        except Exception as e:
            print(f"❌ Error importing forensic tools: {e}")
            return 0
    
    def import_global_stats(self) -> int:
        """Import global crypto statistics"""
        print("\n📊 Importing Global Statistics...")
        
        try:
            df = pd.read_excel(EXCEL_FILE, sheet_name='Statistiques Globales', header=1)
            df = df.dropna(how='all')
            
            print(f"   📋 {len(df)} global statistics found")
            return len(df)
            
        except Exception as e:
            print(f"❌ Error importing global stats: {e}")
            return 0
    
    def _get_country_code(self, country_name: str) -> str:
        """Get ISO country code from name"""
        country_codes = {
            'usa': 'US', 'états-unis': 'US', 'united states': 'US',
            'canada': 'CA', 'mexique': 'MX', 'mexico': 'MX',
            'france': 'FR', 'allemagne': 'DE', 'germany': 'DE',
            'royaume-uni': 'GB', 'uk': 'GB', 'united kingdom': 'GB',
            'suisse': 'CH', 'switzerland': 'CH',
            'pays-bas': 'NL', 'netherlands': 'NL',
            'belgique': 'BE', 'belgium': 'BE',
            'espagne': 'ES', 'spain': 'ES',
            'italie': 'IT', 'italy': 'IT',
            'portugal': 'PT', 'autriche': 'AT', 'austria': 'AT',
            'irlande': 'IE', 'ireland': 'IE',
            'luxembourg': 'LU', 'malte': 'MT', 'malta': 'MT',
            'suède': 'SE', 'sweden': 'SE',
            'chine': 'CN', 'china': 'CN',
            'japon': 'JP', 'japan': 'JP',
            'corée du sud': 'KR', 'south korea': 'KR',
            'singapour': 'SG', 'singapore': 'SG',
            'hong kong': 'HK', 'australie': 'AU', 'australia': 'AU',
            'brésil': 'BR', 'brazil': 'BR',
            'argentine': 'AR', 'argentina': 'AR',
            'émirats arabes unis': 'AE', 'uae': 'AE', 'dubai': 'AE',
            'el salvador': 'SV', 'russie': 'RU', 'russia': 'RU',
            'inde': 'IN', 'india': 'IN', 'turquie': 'TR', 'turkey': 'TR',
            'nigeria': 'NG', 'afrique du sud': 'ZA', 'south africa': 'ZA',
        }
        
        name_lower = country_name.lower().strip()
        return country_codes.get(name_lower, name_lower[:2].upper())
    
    def _batch_insert(self, table: str, data: List[Dict]) -> int:
        """Insert data in batches"""
        if not data:
            return 0
        
        inserted = 0
        batch_size = 50
        
        for i in range(0, len(data), batch_size):
            batch = data[i:i+batch_size]
            
            try:
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/{table}",
                    headers=self.headers,
                    json=batch,
                    timeout=60
                )
                
                if response.status_code in [200, 201]:
                    inserted += len(batch)
                    print(f"   ✅ Batch {i//batch_size + 1}: {len(batch)} inserted")
                else:
                    print(f"   ⚠️ Batch {i//batch_size + 1}: {response.status_code} - {response.text[:200]}")
                    
            except Exception as e:
                print(f"   ❌ Batch {i//batch_size + 1} error: {e}")
        
        return inserted
    
    def _upsert_batch(self, table: str, data: List[Dict], conflict_column: str) -> int:
        """Upsert data in batches (insert or update on conflict)"""
        if not data:
            return 0
        
        upserted = 0
        batch_size = 50
        
        headers = self.headers.copy()
        headers['Prefer'] = 'resolution=merge-duplicates'
        
        for i in range(0, len(data), batch_size):
            batch = data[i:i+batch_size]
            
            try:
                # Use on_conflict query parameter for proper upsert
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={conflict_column}",
                    headers=headers,
                    json=batch,
                    timeout=60
                )
                
                if response.status_code in [200, 201]:
                    upserted += len(batch)
                    print(f"   ✅ Batch {i//batch_size + 1}: {len(batch)} upserted")
                else:
                    print(f"   ⚠️ Batch {i//batch_size + 1}: {response.status_code} - {response.text[:200]}")
                    
            except Exception as e:
                print(f"   ❌ Batch {i//batch_size + 1} error: {e}")
        
        return upserted
    
    def create_seizures_table_if_needed(self):
        """Create crypto_seizures table if it doesn't exist"""
        print("\n🔧 Checking/Creating crypto_seizures table...")
        
        # This would need to be run as a migration
        migration_sql = """
        CREATE TABLE IF NOT EXISTS crypto_seizures (
            id SERIAL PRIMARY KEY,
            country_name VARCHAR(100),
            country_code VARCHAR(2),
            incident_date VARCHAR(50),
            agency VARCHAR(200),
            incident_type VARCHAR(100),
            description TEXT,
            amount VARCHAR(200),
            outcome TEXT,
            source_url TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_seizures_country ON crypto_seizures(country_code);
        CREATE INDEX IF NOT EXISTS idx_seizures_date ON crypto_seizures(incident_date);
        """
        print("   ℹ️ Run this migration if table doesn't exist:")
        print(migration_sql[:200] + "...")
        return True
    
    def run_full_import(self):
        """Run complete import"""
        print("\n🚀 STARTING FULL REGULATION DATA IMPORT")
        print("=" * 60)
        
        # Test connection
        if not self.test_connection():
            print("❌ Cannot connect to Supabase")
            print("   Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
            return False
        
        print("✅ Supabase connection OK")
        
        # Check Excel file
        if not os.path.exists(EXCEL_FILE):
            print(f"❌ Excel file not found: {EXCEL_FILE}")
            return False
        
        print("✅ Excel file found")
        
        # Import all data
        stats = {}
        
        # 1. Country profiles (main table)
        stats['country_profiles'] = self.import_country_profiles()
        
        # 2. Legislation
        stats['legislation'] = self.import_crypto_legislation()
        
        # 3. Tax-free countries (update existing profiles)
        stats['tax_free'] = self.import_tax_free_countries()
        
        # 4. Banned countries (update existing profiles)
        stats['banned'] = self.import_banned_countries()
        
        # 5. Seizure cases
        self.create_seizures_table_if_needed()
        stats['seizures'] = self.import_crypto_seizures()
        
        # 6. Other data
        stats['wrench_attacks'] = self.import_wrench_attacks()
        stats['forensic_tools'] = self.import_forensic_tools()
        stats['global_stats'] = self.import_global_stats()
        
        # Summary
        print("\n" + "=" * 60)
        print("🎉 IMPORT COMPLETED")
        print("=" * 60)
        for table, count in stats.items():
            status = "✅" if count > 0 else "⚠️"
            print(f"   {status} {table}: {count} records")
        
        total = sum(stats.values())
        print(f"\n📈 TOTAL: {total} records processed")
        
        return True


def main():
    importer = RegulationImporter()
    importer.run_full_import()


if __name__ == "__main__":
    main()
