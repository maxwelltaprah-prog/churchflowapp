# Dependency Security Management

This document outlines the dependency security strategy for ChurchFlow, including vulnerability scanning, safe upgrade procedures, and lockfile policies.

## Lockfile Policy

### ✅ Current Status

| Package Manager | Lockfile | Committed | Status |
|-----------------|----------|-----------|--------|
| npm | `package-lock.json` | ✅ Yes | Enforced |
| bun | `bun.lockb` / `bun.lock` | ✅ Yes | Enforced |
| deno | `deno.lock` | ✅ Yes | For Edge Functions |

### Rules

1. **Always commit lockfiles** - Never add lockfiles to `.gitignore`
2. **Use `npm ci` in CI/CD** - Uses exact versions from lockfile
3. **Review lockfile changes** - Inspect diffs in pull requests
4. **No floating versions in production** - All production deps use `^` semver (patch/minor updates only)

---

## Vulnerability Scanning

### Local Commands

```bash
# npm audit (standard)
npm audit

# npm audit with fix suggestions
npm audit --fix --dry-run

# Production dependencies only (recommended)
npm audit --omit=dev

# JSON output for CI/scripts
npm audit --json > audit-report.json
```

### Bun Alternative

```bash
# Bun doesn't have built-in audit, use npm
npm audit
```

### Edge Functions (Deno)

```bash
# Check for outdated Deno std library usage
# Deno dependencies are URL-based; review imports manually
# or use deno check for type validation
deno check supabase/functions/**/*.ts
```

---

## Dependency Report

### Last Security Audit: 2026-01-10

#### Production Dependencies Analysis

| Package | Version | Risk Level | Notes |
|---------|---------|------------|-------|
| `@supabase/supabase-js` | ^2.89.0 | ✅ Low | Core dependency, well-maintained |
| `react` | ^18.3.1 | ✅ Low | Stable, widely audited |
| `react-dom` | ^18.3.1 | ✅ Low | Matches React version |
| `react-router-dom` | ^6.30.1 | ✅ Low | Actively maintained |
| `@tanstack/react-query` | ^5.83.0 | ✅ Low | Popular, well-audited |
| `zod` | ^3.25.76 | ✅ Low | Validation library, no known issues |
| `date-fns` | ^3.6.0 | ✅ Low | Pure functions, no vulnerabilities |
| `framer-motion` | ^12.23.26 | ✅ Low | Animation library |
| `recharts` | ^2.15.4 | ⚠️ Medium | Has transitive deps, monitor |
| `html2canvas` | ^1.4.1 | ⚠️ Medium | DOM manipulation, use cautiously |
| `html5-qrcode` | ^2.3.8 | ⚠️ Medium | Camera access, isolate usage |
| `jsdom` | ^27.4.0 | ⚠️ Medium | Should be devDep only |

#### Dev Dependencies Analysis

| Package | Version | Risk Level | Notes |
|---------|---------|------------|-------|
| `vite` | ^5.4.19 | ✅ Low | Build tool, not in production bundle |
| `typescript` | ^5.8.3 | ✅ Low | Compile-time only |
| `eslint` | ^9.32.0 | ✅ Low | Dev tool only |
| `tailwindcss` | ^3.4.17 | ✅ Low | CSS generation, compile-time |

### Recommendations

1. **Move `jsdom` to devDependencies** - Only needed for testing
2. **Move `@testing-library/*` to devDependencies** - Testing utilities
3. **Monitor `html2canvas`** - Has had XSS issues historically
4. **Keep Radix UI updated** - Accessibility/security patches

---

## Safe Upgrade Procedure

### Before Upgrading

```bash
# 1. Check current vulnerabilities
npm audit

# 2. Check outdated packages
npm outdated

# 3. Review changelogs for breaking changes
# Visit package GitHub/npm page
```

### Upgrade Process

```bash
# 1. Create a branch
git checkout -b security/dep-upgrade-YYYY-MM-DD

# 2. For patch/minor updates (safe)
npm update

# 3. For specific package upgrade
npm install package-name@latest

# 4. For major version upgrade (careful!)
npm install package-name@X.0.0

# 5. Run tests
npm run lint
npm run build
npm run test  # if tests exist

# 6. Manual smoke test
npm run dev
# Test critical flows: login, check-in, payments
```

### Major Version Upgrades

When upgrading major versions:

1. **Read the migration guide** completely
2. **Check for peer dependency conflicts**
3. **Test all affected features**
4. **Document breaking changes** in PR description

### Packages Requiring Extra Care

| Package | Why | Test Requirements |
|---------|-----|-------------------|
| `react` | Core framework | Full app smoke test |
| `react-router-dom` | All routing | Test all routes |
| `@supabase/supabase-js` | Backend integration | Test auth, queries |
| `zod` | Validation | Test all forms |
| `@tanstack/react-query` | Data fetching | Test data loading |

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/security-audit.yml
name: Security Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    # Run weekly on Monday at 9am UTC
    - cron: '0 9 * * 1'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run security audit
        run: npm audit --audit-level=high
        continue-on-error: true
      
      - name: Check for critical vulnerabilities
        run: |
          CRITICAL=$(npm audit --json | jq '.metadata.vulnerabilities.critical')
          if [ "$CRITICAL" -gt 0 ]; then
            echo "::error::Critical vulnerabilities found!"
            exit 1
          fi
```

### Local Script

Create a script for regular checks:

```bash
#!/bin/bash
# scripts/security-check.sh

echo "🔒 Running Security Checks..."

echo "\n📦 Checking for vulnerabilities..."
npm audit

echo "\n📋 Checking for outdated packages..."
npm outdated

echo "\n✅ Security check complete!"
```

---

## Vulnerability Response Plan

### Severity Levels

| Level | Action | Timeline |
|-------|--------|----------|
| **Critical** | Immediate upgrade/patch | < 24 hours |
| **High** | Prioritize fix | < 1 week |
| **Medium** | Plan upgrade | < 1 month |
| **Low** | Include in regular maintenance | Next cycle |

### Response Steps

1. **Assess impact** - Is the vulnerable code path used?
2. **Check for patches** - Is there a fixed version?
3. **Test upgrade** - Does the fix break anything?
4. **Deploy** - Push to production
5. **Document** - Record in security log

---

## Package Removal Candidates

Packages to consider removing or replacing:

| Package | Reason | Alternative |
|---------|--------|-------------|
| `canvas-confetti` | Nice-to-have, adds bundle size | CSS animations |
| `html2canvas` | Large, security history | Server-side rendering |
| `jsdom` | In prod deps | Move to devDeps |

---

## Version Pinning Strategy

### Why We Use `^` (Caret)

- Allows patch and minor updates automatically
- Lockfile pins exact versions for reproducibility
- Balance between security updates and stability

### When to Pin Exact Versions

Pin exact versions (`1.2.3` instead of `^1.2.3`) when:

1. Package has history of breaking minor releases
2. Package is critical infrastructure
3. After a major upgrade, before thorough testing

---

## Monthly Maintenance Checklist

- [ ] Run `npm audit` and review results
- [ ] Run `npm outdated` and review updates
- [ ] Check for new major versions of critical deps
- [ ] Review GitHub security advisories
- [ ] Update this document with findings
