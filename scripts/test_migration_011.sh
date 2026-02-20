#!/bin/bash
# ============================================================
# Test script for migration 011 - Geographic Scope for Norms
# ============================================================

set -e  # Exit on error

echo "============================================================"
echo "TESTING MIGRATION 011: Geographic Scope for Norms"
echo "============================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Supabase connection (use environment variables or defaults)
DB_HOST="${SUPABASE_DB_HOST:-db.xusznpwzhiuzhqvhddxj.supabase.co}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql not found. Please install PostgreSQL client.${NC}"
    exit 1
fi

echo -e "${YELLOW}📊 PRE-MIGRATION STATS${NC}"
echo "------------------------------------------------------------"

# Count norms before migration
NORMS_BEFORE=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM norms;" 2>/dev/null || echo "0")
echo "Total norms before: $NORMS_BEFORE"

# Check if columns already exist
HAS_GEO_SCOPE=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'norms' AND column_name = 'geographic_scope';" 2>/dev/null || echo "0")

if [ "$HAS_GEO_SCOPE" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  geographic_scope column already exists${NC}"
else
    echo -e "${GREEN}✓ geographic_scope column does not exist (will be created)${NC}"
fi

echo ""
echo -e "${YELLOW}🚀 EXECUTING MIGRATION${NC}"
echo "------------------------------------------------------------"

# Execute migration
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f ../../config/migrations/011_norms_geographic_scope.sql; then
    echo -e "${GREEN}✓ Migration executed successfully${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📊 POST-MIGRATION STATS${NC}"
echo "------------------------------------------------------------"

# Count norms after migration
NORMS_AFTER=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM norms;" 2>/dev/null || echo "0")
echo "Total norms after: $NORMS_AFTER"
echo "New norms added: $((NORMS_AFTER - NORMS_BEFORE))"

# Geographic distribution
echo ""
echo "Geographic distribution:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT
    geographic_scope,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM norms), 1) as percentage
FROM norms
GROUP BY geographic_scope
ORDER BY count DESC;
"

# Standards coverage
echo ""
echo "Standards coverage:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT
    issuing_authority,
    COUNT(*) as norm_count
FROM norms
WHERE issuing_authority IS NOT NULL
GROUP BY issuing_authority
ORDER BY norm_count DESC
LIMIT 15;
"

# New norms by standard
echo ""
echo "New norms added by standard:"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT
    SUBSTRING(code FROM 1 FOR POSITION('-' IN SUBSTRING(code FROM 3)) + 1) as standard_prefix,
    COUNT(*) as count
FROM norms
WHERE code LIKE '%-CCSS-%' OR code LIKE '%-NIST-%' OR code LIKE '%-CC-%'
   OR code LIKE '%-ISO-%' OR code LIKE '%-GDPR-%' OR code LIKE '%-MICA-%'
   OR code LIKE '%-PCI-%' OR code LIKE '%-OWASP-%' OR code LIKE '%-SOC2-%'
   OR code LIKE '%-ETSI-%' OR code LIKE '%-EIP-%' OR code LIKE '%-SLIP-%'
GROUP BY SUBSTRING(code FROM 1 FOR POSITION('-' IN SUBSTRING(code FROM 3)) + 1)
ORDER BY count DESC;
"

# Test new views
echo ""
echo "Testing new views:"
echo "1. v_norms_by_geography"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT * FROM v_norms_by_geography LIMIT 10;"

echo ""
echo "2. v_standards_coverage"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT * FROM v_standards_coverage LIMIT 10;"

echo ""
echo "3. v_regional_requirements"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT * FROM v_regional_requirements;"

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}✅ MIGRATION 011 TEST COMPLETED SUCCESSFULLY${NC}"
echo -e "${GREEN}============================================================${NC}"
