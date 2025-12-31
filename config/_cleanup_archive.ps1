# SafeScoring - Archive Obsolete SQL Files
# Run: powershell -ExecutionPolicy Bypass -File _cleanup_archive.ps1

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "SafeScoring Database Cleanup Script" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Create archive folder
if (!(Test-Path "_archive")) {
    New-Item -ItemType Directory -Name "_archive" | Out-Null
    Write-Host "[OK] Created _archive folder" -ForegroundColor Green
} else {
    Write-Host "[OK] _archive folder already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "Moving obsolete files to _archive..." -ForegroundColor Yellow
Write-Host ""

# List of files to archive
$filesToArchive = @(
    # Merged into _MASTER_MIGRATION.sql
    "create_tables.sql",
    "create_product_tables.sql",
    "add_users_table.sql",
    "add_consumer_column.sql",
    "add_product_type_columns.sql",
    "add_product_enrichment_columns.sql",
    "add_updated_at_column.sql",
    "add_why_this_result_column.sql",
    "add_applicability_reason.sql",
    "add_multi_type_support.sql",
    "safe_scoring_tables.sql",
    "safe_methodology_tables.sql",
    "moat_features_v2.sql",
    "consumer_type_definitions.sql",
    "norm_definition_matrix.sql",
    "enable_realtime.sql",
    # Duplicates
    "fix_missing_brands.sql",
    "update_product_brands.sql",
    # Historical/Migration
    "step1_add_columns.sql",
    "step2_update_definitions.sql",
    "migrate_to_english.sql",
    "translate_all_data_to_english.sql",
    "translate_norms_to_english.sql",
    "update_evaluations_result.sql",
    "product_type_definitions.sql"
)

$movedCount = 0

foreach ($file in $filesToArchive) {
    if (Test-Path $file) {
        Move-Item $file "_archive\" -Force
        Write-Host "[MOVED] $file" -ForegroundColor Gray
        $movedCount++
    }
}

# Handle web folder file
if (Test-Path "..\web\supabase_nextauth_tables.sql") {
    Move-Item "..\web\supabase_nextauth_tables.sql" "_archive\" -Force
    Write-Host "[MOVED] web/supabase_nextauth_tables.sql (conflict resolved)" -ForegroundColor Gray
    $movedCount++
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Cleanup complete! Moved $movedCount files." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "REMAINING ACTIVE FILES:" -ForegroundColor White
Write-Host ""
Write-Host "  [MASTER]  _MASTER_MIGRATION.sql      - Complete schema" -ForegroundColor Green
Write-Host "  [DATA]    cleanup_product_types.sql  - 79 product types" -ForegroundColor Green
Write-Host "  [DATA]    safe_pillar_definitions.sql - SAFE pillars" -ForegroundColor Green
Write-Host "  [DOCS]    _README_DATABASE.md        - Documentation" -ForegroundColor Green
Write-Host ""
Write-Host "ARCHIVED FILES: Check _archive folder" -ForegroundColor Yellow
Write-Host ""

# List remaining SQL files
Write-Host "Current SQL files in config/:" -ForegroundColor White
Get-ChildItem -Name *.sql | ForEach-Object { Write-Host "  $_" }
Write-Host ""
