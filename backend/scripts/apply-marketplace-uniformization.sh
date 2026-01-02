#!/bin/bash

###############################################################################
# Script d'application de l'uniformisation Marketplace
# Applique la migration 063 et vérifie l'intégrité des données
#
# Usage: ./apply-marketplace-uniformization.sh [environment]
#   environment: dev (défaut), staging, production
#
# Auteur: Équipe Backend
# Date: 2026-01-02
# Version: 1.0.0
###############################################################################

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher un message coloré
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction pour afficher le titre
print_header() {
    echo ""
    echo "=========================================="
    echo "  Uniformisation Marketplace - Migration 063"
    echo "=========================================="
    echo ""
}

# Fonction pour vérifier les prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Vérifier que psql est installé
    if ! command -v psql &> /dev/null; then
        log_error "psql n'est pas installé. Veuillez installer PostgreSQL client."
        exit 1
    fi
    
    # Vérifier que le fichier de migration existe
    if [ ! -f "../database/migrations/063_uniformize_marketplace_batch_support.sql" ]; then
        log_error "Fichier de migration introuvable: ../database/migrations/063_uniformize_marketplace_batch_support.sql"
        exit 1
    fi
    
    log_success "Prérequis OK"
}

# Fonction pour charger les variables d'environnement
load_environment() {
    local env=${1:-dev}
    
    log_info "Chargement de l'environnement: $env"
    
    case $env in
        dev)
            export DB_HOST=${DB_HOST:-localhost}
            export DB_PORT=${DB_PORT:-5432}
            export DB_NAME=${DB_NAME:-farm_db_dev}
            export DB_USER=${DB_USER:-postgres}
            ;;
        staging)
            export DB_HOST=${DB_HOST:-staging-db.example.com}
            export DB_PORT=${DB_PORT:-5432}
            export DB_NAME=${DB_NAME:-farm_db_staging}
            export DB_USER=${DB_USER:-postgres}
            ;;
        production)
            export DB_HOST=${DB_HOST:-prod-db.example.com}
            export DB_PORT=${DB_PORT:-5432}
            export DB_NAME=${DB_NAME:-farm_db}
            export DB_USER=${DB_USER:-postgres}
            
            log_warning "⚠️  ATTENTION: Vous êtes sur PRODUCTION!"
            read -p "Êtes-vous sûr de vouloir continuer? (tapez 'YES' pour confirmer): " confirm
            if [ "$confirm" != "YES" ]; then
                log_error "Opération annulée par l'utilisateur"
                exit 1
            fi
            ;;
        *)
            log_error "Environnement invalide: $env (utilisez dev, staging ou production)"
            exit 1
            ;;
    esac
    
    log_info "Configuration DB:"
    log_info "  Host: $DB_HOST"
    log_info "  Port: $DB_PORT"
    log_info "  Database: $DB_NAME"
    log_info "  User: $DB_USER"
}

# Fonction pour créer un backup
create_backup() {
    log_info "Création d'un backup de la base de données..."
    
    local backup_file="backup_marketplace_$(date +%Y%m%d_%H%M%S).sql"
    
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d $DB_NAME \
        --table=marketplace_listings \
        --table=production_animaux \
        --table=batch_pigs \
        --table=batches \
        -f "../backups/$backup_file" 2>/dev/null || {
        log_warning "Impossible de créer le backup (le dossier backups n'existe peut-être pas)"
        log_warning "Continuons sans backup..."
    }
    
    if [ -f "../backups/$backup_file" ]; then
        log_success "Backup créé: ../backups/$backup_file"
    fi
}

# Fonction pour appliquer la migration
apply_migration() {
    log_info "Application de la migration 063..."
    
    PGPASSWORD=$DB_PASSWORD psql \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d $DB_NAME \
        -f "../database/migrations/063_uniformize_marketplace_batch_support.sql" \
        -v ON_ERROR_STOP=1 \
        --quiet
    
    if [ $? -eq 0 ]; then
        log_success "Migration appliquée avec succès"
    else
        log_error "Erreur lors de l'application de la migration"
        exit 1
    fi
}

# Fonction pour vérifier l'intégrité des données
verify_data_integrity() {
    log_info "Vérification de l'intégrité des données..."
    
    # Vérifier que toutes les colonnes ont été ajoutées
    local columns_check=$(PGPASSWORD=$DB_PASSWORD psql \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d $DB_NAME \
        -t -c "SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_name = 'batch_pigs' 
               AND column_name IN ('marketplace_status', 'marketplace_listing_id', 'listed_at', 'sold_at')")
    
    if [ "$columns_check" -eq 4 ]; then
        log_success "Colonnes batch_pigs OK"
    else
        log_error "Colonnes manquantes dans batch_pigs"
        exit 1
    fi
    
    # Vérifier que le trigger a été créé
    local trigger_check=$(PGPASSWORD=$DB_PASSWORD psql \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d $DB_NAME \
        -t -c "SELECT COUNT(*) FROM pg_trigger 
               WHERE tgname = 'trigger_sync_batch_marketplace_status'")
    
    if [ "$trigger_check" -ge 1 ]; then
        log_success "Trigger de synchronisation OK"
    else
        log_error "Trigger de synchronisation manquant"
        exit 1
    fi
    
    # Vérifier que la vue a été créée
    local view_check=$(PGPASSWORD=$DB_PASSWORD psql \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d $DB_NAME \
        -t -c "SELECT COUNT(*) FROM information_schema.views 
               WHERE table_name = 'v_marketplace_listings_enriched'")
    
    if [ "$view_check" -eq 1 ]; then
        log_success "Vue enrichie OK"
    else
        log_error "Vue enrichie manquante"
        exit 1
    fi
    
    log_success "Intégrité des données vérifiée"
}

# Fonction pour afficher les statistiques
show_statistics() {
    log_info "Statistiques du marketplace..."
    
    PGPASSWORD=$DB_PASSWORD psql \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d $DB_NAME \
        -c "SELECT 
            COUNT(*) FILTER (WHERE listing_type = 'individual') as listings_individuels,
            COUNT(*) FILTER (WHERE listing_type = 'batch') as listings_bandes,
            COUNT(*) FILTER (WHERE status = 'available') as listings_disponibles,
            COUNT(*) FILTER (WHERE status = 'sold') as listings_vendus
        FROM marketplace_listings
        WHERE status != 'removed';"
    
    PGPASSWORD=$DB_PASSWORD psql \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d $DB_NAME \
        -c "SELECT 
            COUNT(*) FILTER (WHERE marketplace_status = 'available') as porcs_en_vente,
            COUNT(*) FILTER (WHERE marketplace_status = 'sold') as porcs_vendus,
            COUNT(*) FILTER (WHERE marketplace_status IS NULL OR marketplace_status = 'not_listed') as porcs_non_listes
        FROM batch_pigs;"
    
    PGPASSWORD=$DB_PASSWORD psql \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d $DB_NAME \
        -c "SELECT 
            COUNT(*) FILTER (WHERE marketplace_status = 'fully_listed') as bandes_completement_listees,
            COUNT(*) FILTER (WHERE marketplace_status = 'partially_listed') as bandes_partiellement_listees,
            COUNT(*) FILTER (WHERE marketplace_status IS NULL OR marketplace_status = 'not_listed') as bandes_non_listees
        FROM batches;"
}

# Fonction principale
main() {
    print_header
    
    local environment=${1:-dev}
    
    check_prerequisites
    load_environment $environment
    
    # Demander le mot de passe DB
    read -sp "Mot de passe DB: " DB_PASSWORD
    echo ""
    export DB_PASSWORD
    
    create_backup
    apply_migration
    verify_data_integrity
    show_statistics
    
    echo ""
    log_success "✅ Uniformisation Marketplace appliquée avec succès!"
    echo ""
    log_info "Prochaines étapes:"
    log_info "  1. Consulter la documentation: docs/MARKETPLACE_UNIFIED_USAGE.md"
    log_info "  2. Suivre la checklist de validation: docs/MARKETPLACE_VALIDATION_CHECKLIST.md"
    log_info "  3. Tester les nouveaux composants frontend"
    echo ""
}

# Exécuter le script principal
main "$@"

