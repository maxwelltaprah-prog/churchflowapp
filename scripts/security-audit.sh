#!/bin/bash
# ChurchFlow Dependency Security Audit Script
# Run this regularly to check for vulnerabilities

set -e

echo "🔒 ChurchFlow Security Audit"
echo "============================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo "📦 Step 1: Checking for vulnerabilities..."
echo "-------------------------------------------"

# Run npm audit and capture output
AUDIT_OUTPUT=$(npm audit --json 2>/dev/null || true)

# Parse vulnerability counts using node (more portable than jq)
VULN_COUNTS=$(echo "$AUDIT_OUTPUT" | node -e "
const data = require('fs').readFileSync('/dev/stdin', 'utf8');
try {
    const json = JSON.parse(data);
    const v = json.metadata?.vulnerabilities || {};
    console.log('CRITICAL=' + (v.critical || 0));
    console.log('HIGH=' + (v.high || 0));
    console.log('MODERATE=' + (v.moderate || 0));
    console.log('LOW=' + (v.low || 0));
} catch(e) {
    console.log('CRITICAL=0');
    console.log('HIGH=0');
    console.log('MODERATE=0');
    console.log('LOW=0');
}
" 2>/dev/null || echo "CRITICAL=0
HIGH=0
MODERATE=0
LOW=0")

eval "$VULN_COUNTS"

echo ""
echo "Vulnerability Summary:"
echo "  Critical: $CRITICAL"
echo "  High:     $HIGH"
echo "  Moderate: $MODERATE"
echo "  Low:      $LOW"
echo ""

# Determine overall status
if [ "$CRITICAL" -gt 0 ]; then
    echo -e "${RED}❌ CRITICAL vulnerabilities found! Immediate action required.${NC}"
    AUDIT_STATUS="critical"
elif [ "$HIGH" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  HIGH vulnerabilities found. Please address soon.${NC}"
    AUDIT_STATUS="high"
elif [ "$MODERATE" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Moderate vulnerabilities found. Plan to address.${NC}"
    AUDIT_STATUS="moderate"
else
    echo -e "${GREEN}✅ No critical or high vulnerabilities found.${NC}"
    AUDIT_STATUS="ok"
fi

echo ""
echo "📋 Step 2: Checking for outdated packages..."
echo "---------------------------------------------"
npm outdated 2>/dev/null || echo "All packages are up to date!"

echo ""
echo "🔍 Step 3: Checking lockfile integrity..."
echo "------------------------------------------"

if [ -f "package-lock.json" ]; then
    echo -e "${GREEN}✅ package-lock.json exists${NC}"
else
    echo -e "${RED}❌ package-lock.json missing!${NC}"
fi

if [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
    echo -e "${GREEN}✅ Bun lockfile exists${NC}"
else
    echo -e "${YELLOW}⚠️  Bun lockfile not found (optional)${NC}"
fi

if [ -f "deno.lock" ]; then
    echo -e "${GREEN}✅ deno.lock exists (for Edge Functions)${NC}"
else
    echo -e "${YELLOW}⚠️  deno.lock not found (Edge Functions may have unpinned deps)${NC}"
fi

echo ""
echo "📊 Step 4: Production dependency check..."
echo "-----------------------------------------"
echo "Production vulnerabilities only:"
npm audit --omit=dev 2>/dev/null || echo "Unable to run production-only audit"

echo ""
echo "============================"
echo "🔒 Security Audit Complete"
echo "============================"

# Exit with appropriate code
case $AUDIT_STATUS in
    "critical")
        echo ""
        echo "Action Required: Fix critical vulnerabilities immediately!"
        echo "Run 'npm audit' for details and 'npm audit fix' to attempt auto-fix."
        exit 1
        ;;
    "high")
        echo ""
        echo "Recommendation: Address high vulnerabilities within 1 week."
        exit 0
        ;;
    *)
        exit 0
        ;;
esac
