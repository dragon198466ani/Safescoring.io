@echo off
REM ============================================================
REM SafeScoring - Archive Obsolete SQL Files
REM ============================================================
REM Run this script from the config folder to clean up old files
REM ============================================================

echo.
echo ============================================================
echo SafeScoring Database Cleanup Script
echo ============================================================
echo.

REM Create archive folder
if not exist "_archive" (
    mkdir "_archive"
    echo [OK] Created _archive folder
) else (
    echo [OK] _archive folder already exists
)

echo.
echo Moving obsolete files to _archive...
echo.

REM Move merged files (now in _MASTER_MIGRATION.sql)
if exist "create_tables.sql" (
    move "create_tables.sql" "_archive\" >nul 2>&1
    echo [MOVED] create_tables.sql
)

if exist "create_product_tables.sql" (
    move "create_product_tables.sql" "_archive\" >nul 2>&1
    echo [MOVED] create_product_tables.sql
)

if exist "add_users_table.sql" (
    move "add_users_table.sql" "_archive\" >nul 2>&1
    echo [MOVED] add_users_table.sql
)

if exist "add_consumer_column.sql" (
    move "add_consumer_column.sql" "_archive\" >nul 2>&1
    echo [MOVED] add_consumer_column.sql
)

if exist "add_product_type_columns.sql" (
    move "add_product_type_columns.sql" "_archive\" >nul 2>&1
    echo [MOVED] add_product_type_columns.sql
)

if exist "add_product_enrichment_columns.sql" (
    move "add_product_enrichment_columns.sql" "_archive\" >nul 2>&1
    echo [MOVED] add_product_enrichment_columns.sql
)

if exist "add_updated_at_column.sql" (
    move "add_updated_at_column.sql" "_archive\" >nul 2>&1
    echo [MOVED] add_updated_at_column.sql
)

if exist "add_why_this_result_column.sql" (
    move "add_why_this_result_column.sql" "_archive\" >nul 2>&1
    echo [MOVED] add_why_this_result_column.sql
)

if exist "add_applicability_reason.sql" (
    move "add_applicability_reason.sql" "_archive\" >nul 2>&1
    echo [MOVED] add_applicability_reason.sql
)

if exist "add_multi_type_support.sql" (
    move "add_multi_type_support.sql" "_archive\" >nul 2>&1
    echo [MOVED] add_multi_type_support.sql
)

if exist "safe_scoring_tables.sql" (
    move "safe_scoring_tables.sql" "_archive\" >nul 2>&1
    echo [MOVED] safe_scoring_tables.sql
)

if exist "safe_methodology_tables.sql" (
    move "safe_methodology_tables.sql" "_archive\" >nul 2>&1
    echo [MOVED] safe_methodology_tables.sql
)

if exist "moat_features_v2.sql" (
    move "moat_features_v2.sql" "_archive\" >nul 2>&1
    echo [MOVED] moat_features_v2.sql
)

if exist "consumer_type_definitions.sql" (
    move "consumer_type_definitions.sql" "_archive\" >nul 2>&1
    echo [MOVED] consumer_type_definitions.sql
)

if exist "norm_definition_matrix.sql" (
    move "norm_definition_matrix.sql" "_archive\" >nul 2>&1
    echo [MOVED] norm_definition_matrix.sql
)

if exist "enable_realtime.sql" (
    move "enable_realtime.sql" "_archive\" >nul 2>&1
    echo [MOVED] enable_realtime.sql
)

REM Move duplicate files
if exist "fix_missing_brands.sql" (
    move "fix_missing_brands.sql" "_archive\" >nul 2>&1
    echo [MOVED] fix_missing_brands.sql (duplicate)
)

if exist "update_product_brands.sql" (
    move "update_product_brands.sql" "_archive\" >nul 2>&1
    echo [MOVED] update_product_brands.sql (duplicate)
)

REM Move conflicting file from web folder
if exist "..\web\supabase_nextauth_tables.sql" (
    move "..\web\supabase_nextauth_tables.sql" "_archive\" >nul 2>&1
    echo [MOVED] web/supabase_nextauth_tables.sql (conflict resolved)
)

REM Move migration/historical files
if exist "step1_add_columns.sql" (
    move "step1_add_columns.sql" "_archive\" >nul 2>&1
    echo [MOVED] step1_add_columns.sql (historical)
)

if exist "step2_update_definitions.sql" (
    move "step2_update_definitions.sql" "_archive\" >nul 2>&1
    echo [MOVED] step2_update_definitions.sql (historical)
)

if exist "migrate_to_english.sql" (
    move "migrate_to_english.sql" "_archive\" >nul 2>&1
    echo [MOVED] migrate_to_english.sql (historical)
)

if exist "translate_all_data_to_english.sql" (
    move "translate_all_data_to_english.sql" "_archive\" >nul 2>&1
    echo [MOVED] translate_all_data_to_english.sql (historical)
)

if exist "translate_norms_to_english.sql" (
    move "translate_norms_to_english.sql" "_archive\" >nul 2>&1
    echo [MOVED] translate_norms_to_english.sql (historical)
)

if exist "update_evaluations_result.sql" (
    move "update_evaluations_result.sql" "_archive\" >nul 2>&1
    echo [MOVED] update_evaluations_result.sql (historical)
)

if exist "product_type_definitions.sql" (
    move "product_type_definitions.sql" "_archive\" >nul 2>&1
    echo [MOVED] product_type_definitions.sql (historical)
)

echo.
echo ============================================================
echo Cleanup complete!
echo ============================================================
echo.
echo REMAINING ACTIVE FILES:
echo.
echo   [MASTER]  _MASTER_MIGRATION.sql    - Complete schema
echo   [DATA]    cleanup_product_types.sql - 79 product types
echo   [DATA]    safe_pillar_definitions.sql - SAFE pillars
echo   [DOCS]    _README_DATABASE.md      - Documentation
echo.
echo ARCHIVED FILES: Check _archive folder
echo.
echo ============================================================
echo.

pause
