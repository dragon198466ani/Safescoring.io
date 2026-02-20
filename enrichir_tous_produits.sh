#!/bin/bash
# ============================================================
# SAFESCORING - Enrichir TOUS les produits automatiquement
# ============================================================

echo ""
echo "============================================================"
echo "   SAFESCORING - Enrichissement TOUS les produits"
echo "============================================================"
echo ""

# Vérifier si Python est installé
if ! command -v python3 &> /dev/null; then
    echo "[ERREUR] Python 3 n'est pas installé"
    echo "Installez Python depuis https://python.org"
    exit 1
fi

echo "[OK] Python installé"
echo ""

# Vérifier si le fichier de config existe
if [ ! -f "config/env.txt" ]; then
    if [ ! -f "config/env_template_free.txt" ]; then
        echo "[ERREUR] Fichier de configuration non trouvé"
        echo "Créez config/env.txt avec vos clés API"
        exit 1
    else
        echo "[INFO] Copie du template de configuration..."
        cp config/env_template_free.txt config/env.txt
        echo ""
        echo "[ACTION REQUISE] Éditez config/env.txt et ajoutez vos clés API:"
        echo "  - NEXT_PUBLIC_SUPABASE_URL"
        echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
        echo "  - GOOGLE_API_KEY ou MISTRAL_API_KEY"
        echo ""
        ${EDITOR:-nano} config/env.txt
        echo ""
        read -p "Appuyez sur Entrée une fois la configuration terminée..."
    fi
fi

echo "[OK] Configuration trouvée"
echo ""

# Fonction pour afficher le menu
show_menu() {
    echo "============================================================"
    echo "   Choisissez une option:"
    echo "============================================================"
    echo ""
    echo " 1. Test (DRY RUN) - Seulement produits manquants"
    echo " 2. Test (DRY RUN) - TOUS les produits"
    echo " 3. PRODUCTION - Enrichir produits manquants"
    echo " 4. PRODUCTION - Enrichir TOUS les produits"
    echo " 5. Quitter"
    echo ""
}

# Boucle du menu
while true; do
    show_menu
    read -p "Votre choix (1-5): " choice

    case $choice in
        1)
            echo ""
            echo "[TEST] Simulation - Produits manquants seulement"
            echo "============================================================"
            python3 src/automation/enrich_all_products_geography.py --dry-run --missing-only
            echo ""
            echo "============================================================"
            echo "Test terminé. Aucune modification apportée."
            echo ""
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        2)
            echo ""
            echo "[TEST] Simulation - TOUS les produits"
            echo "============================================================"
            python3 src/automation/enrich_all_products_geography.py --dry-run
            echo ""
            echo "============================================================"
            echo "Test terminé. Aucune modification apportée."
            echo ""
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        3)
            echo ""
            echo "[PRODUCTION] Enrichissement des produits manquants"
            echo "============================================================"
            echo "ATTENTION: Ceci va modifier la base de données Supabase!"
            echo ""
            read -p "Êtes-vous sûr? (oui/non): " confirm
            if [ "$confirm" = "oui" ]; then
                echo ""
                echo "Lancement de l'enrichissement..."
                echo ""
                python3 src/automation/enrich_all_products_geography.py --missing-only
                echo ""
                echo "============================================================"
                echo "Enrichissement terminé!"
                echo ""
            fi
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        4)
            echo ""
            echo "[PRODUCTION] Enrichissement de TOUS les produits"
            echo "============================================================"
            echo "ATTENTION: Ceci va modifier TOUS les produits dans Supabase!"
            echo "Même ceux déjà enrichis seront mis à jour."
            echo ""
            read -p "Êtes-vous VRAIMENT sûr? (oui/non): " confirm
            if [ "$confirm" = "oui" ]; then
                echo ""
                echo "Lancement de l'enrichissement complet..."
                echo ""
                python3 src/automation/enrich_all_products_geography.py
                echo ""
                echo "============================================================"
                echo "Enrichissement complet terminé!"
                echo ""
            fi
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        5)
            echo ""
            echo "Au revoir!"
            echo ""
            exit 0
            ;;
        *)
            echo "Choix invalide. Veuillez choisir entre 1 et 5."
            ;;
    esac
done
