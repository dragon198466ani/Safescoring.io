# SafeScoring Database - Migration Guide

## Overview

This document explains the database structure consolidation performed on 2025-12-26.

**Before:** 28 SQL files with duplicates and conflicts
**After:** 1 master file + 1 data file

---

## Quick Start (New Installation)

1. Run `_MASTER_MIGRATION.sql` on a fresh Supabase project
2. Run `cleanup_product_types.sql` to populate the 79 product types
3. Import your norms data

---

## File Status

### ACTIVE FILES (Keep & Use)

| File | Purpose | When to Run |
|------|---------|-------------|
| `_MASTER_MIGRATION.sql` | Complete schema (tables, indexes, functions, views, RLS) | Once on new DB |
| `cleanup_product_types.sql` | 79 product types with full definitions | After master migration |
| `safe_pillar_definitions.sql` | SAFE pillar definitions (S, A, F, E) data | After master if needed |

### ARCHIVED FILES (Can be deleted or moved to `/config/_archive/`)

These files are now **obsolete** - their contents are consolidated in `_MASTER_MIGRATION.sql`:

| File | Reason |
|------|--------|
| `create_tables.sql` | Merged into master |
| `create_product_tables.sql` | Merged into master |
| `add_users_table.sql` | Merged (unified users table) |
| `add_consumer_column.sql` | Merged |
| `add_product_type_columns.sql` | Merged |
| `add_product_enrichment_columns.sql` | Merged |
| `add_updated_at_column.sql` | Merged |
| `add_why_this_result_column.sql` | Merged |
| `add_applicability_reason.sql` | Merged |
| `add_multi_type_support.sql` | Merged |
| `safe_scoring_tables.sql` | Merged |
| `safe_methodology_tables.sql` | Merged |
| `moat_features_v2.sql` | Merged |
| `enable_realtime.sql` | Run manually if needed |
| `consumer_type_definitions.sql` | Duplicate of safe_scoring_tables |
| `norm_definition_matrix.sql` | Merged |

### DUPLICATE FILES (Delete)

| File | Duplicate Of |
|------|--------------|
| `fix_missing_brands.sql` | brands table already in master |
| `update_product_brands.sql` | brands table already in master |
| `supabase_nextauth_tables.sql` | Conflict with add_users_table, now unified |

### MIGRATION/DATA FILES (Keep for reference)

| File | Purpose |
|------|---------|
| `product_type_definitions.sql` | Product type UPDATE statements |
| `step1_add_columns.sql` | Historical migration |
| `step2_update_definitions.sql` | Historical migration |
| `translate_all_data_to_english.sql` | Translation migration |
| `translate_norms_to_english.sql` | Translation migration |
| `migrate_to_english.sql` | Translation migration |
| `update_evaluations_result.sql` | Data fix |

---

## Resolved Conflicts

### 1. Users Table Conflict (CRITICAL)

**Problem:** Two different implementations
- `add_users_table.sql` = Lemon Squeezy
- `supabase_nextauth_tables.sql` = Stripe

**Solution:** Unified table supporting BOTH:
```sql
CREATE TABLE users (
    ...
    lemon_squeezy_customer_id VARCHAR(100),  -- Lemon Squeezy
    stripe_customer_id VARCHAR(100),          -- Stripe
    ...
);
```

### 2. Brands Table Duplication

**Problem:** Created 3 times in different files

**Solution:** Single definition in master migration

### 3. consumer_type_definitions Duplication

**Problem:** Defined in both `safe_scoring_tables.sql` and `consumer_type_definitions.sql`

**Solution:** Single definition in master migration

---

## Database Architecture

### Tables by Category

**Core (5 tables)**
- `product_types` - 79 types with definitions
- `brands` - Product manufacturers
- `products` - Central product table
- `product_type_mapping` - Multi-type support (M:N)
- `norms` - 2159 SAFE norms

**Scoring (5 tables)**
- `safe_methodology` - SAFE framework config
- `safe_pillar_definitions` - S, A, F, E definitions
- `consumer_type_definitions` - Essential/Consumer/Full
- `safe_scoring_definitions` - Norm classifications
- `safe_scoring_results` - Per-product scores

**Evaluations (2 tables)**
- `evaluations` - AI evaluation results
- `norm_applicability` - Type-norm mapping

**Auth & Users (5 tables)**
- `users` - NextAuth + Payments
- `accounts` - OAuth providers
- `sessions` - User sessions
- `verification_tokens` - Email verification
- `leads` - Landing page signups

**Business (3 tables)**
- `subscription_plans` - Free/Basic/Pro
- `subscriptions` - User subscriptions
- `user_setups` - Multi-product configs

**Security (5 tables)**
- `security_alerts` - CVE alerts
- `alert_user_matches` - User notifications
- `score_history` - Score snapshots
- `security_incidents` - Hacks/exploits
- `incident_product_impact` - Impact mapping

**Automation (3 tables)**
- `automation_logs` - Execution logs
- `scrape_cache` - URL cache
- `ai_usage_stats` - AI usage tracking

**Total: 28 tables**

---

## Recommended Cleanup Script

Run this to create an archive folder and move obsolete files:

```bash
# Create archive folder
mkdir -p config/_archive

# Move obsolete files
mv config/create_tables.sql config/_archive/
mv config/create_product_tables.sql config/_archive/
mv config/add_users_table.sql config/_archive/
mv config/add_consumer_column.sql config/_archive/
mv config/add_product_type_columns.sql config/_archive/
mv config/add_product_enrichment_columns.sql config/_archive/
mv config/add_updated_at_column.sql config/_archive/
mv config/add_why_this_result_column.sql config/_archive/
mv config/add_applicability_reason.sql config/_archive/
mv config/add_multi_type_support.sql config/_archive/
mv config/safe_scoring_tables.sql config/_archive/
mv config/safe_methodology_tables.sql config/_archive/
mv config/moat_features_v2.sql config/_archive/
mv config/consumer_type_definitions.sql config/_archive/
mv config/norm_definition_matrix.sql config/_archive/
mv config/fix_missing_brands.sql config/_archive/
mv config/update_product_brands.sql config/_archive/

# Move conflicting file
mv web/supabase_nextauth_tables.sql config/_archive/
```

---

## Notes

- The `_MASTER_MIGRATION.sql` file is ~1200 lines
- It includes ALL: extensions, tables, indexes, functions, triggers, views, RLS, and initial data
- Uses `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT` for idempotency
- Payment integration supports both Lemon Squeezy AND Stripe
- Product types support multi-type assignment via `product_type_mapping`
