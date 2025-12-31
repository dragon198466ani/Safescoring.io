#!/usr/bin/env python3
"""
Test simple de connexion à Supabase
"""

import os
from dotenv import load_dotenv
from supabase import create_client

# Charger les variables d'environnement
load_dotenv()

def test_supabase_connection():
    """Test la connexion à Supabase"""
    
    # Récupérer les clés depuis l'environnement
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    print("🔑 Test de connexion Supabase")
    print(f"URL: {supabase_url}")
    print(f"Key: {supabase_key[:20]}..." if supabase_key else "Key: None")
    
    if not supabase_url or not supabase_key:
        print("❌ Variables d'environnement manquantes")
        return False
    
    try:
        # Créer le client Supabase
        client = create_client(supabase_url, supabase_key)
        
        # Test simple: essayer de lister les tables
        response = client.table('products').select('count').execute()
        
        print("✅ Connexion Supabase réussie!")
        print(f"📊 Réponse: {response}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False

if __name__ == "__main__":
    test_supabase_connection()
