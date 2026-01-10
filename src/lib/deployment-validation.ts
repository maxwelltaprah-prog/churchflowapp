/**
 * Client-side Deployment Validation
 * 
 * Runtime checks to ensure the client application is properly configured
 * for production deployment.
 */

export interface ClientSecurityCheck {
  passed: boolean;
  warnings: string[];
  errors: string[];
  environment: "development" | "production" | "unknown";
}

/**
 * Check if we're in a production environment
 */
export function isProductionEnvironment(): boolean {
  // Check for production indicators
  const hostname = window.location.hostname;
  
  // Known production domains
  const productionDomains = [
    "easychurchflow.com",
    "www.easychurchflow.com",
  ];
  
  if (productionDomains.some(d => hostname.includes(d))) {
    return true;
  }
  
  // Lovable production domains
  if (hostname.endsWith(".lovable.app") && !hostname.includes("preview")) {
    return true;
  }
  
  // Not localhost
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return false;
  }
  
  // HTTPS in non-local environment suggests production
  return window.location.protocol === "https:";
}

/**
 * Get current environment
 */
export function getClientEnvironment(): "development" | "production" | "unknown" {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "development";
  }
  
  if (isProductionEnvironment()) {
    return "production";
  }
  
  return "unknown";
}

/**
 * Validate client-side security configuration
 */
export function validateClientSecurity(): ClientSecurityCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const environment = getClientEnvironment();
  const isProd = isProductionEnvironment();
  
  // Check HTTPS in production
  if (isProd && window.location.protocol !== "https:") {
    errors.push("Production site is not using HTTPS");
  }
  
  // Check for exposed secrets in window/global scope
  const dangerousGlobals = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "PAYSTACK_SECRET_KEY",
    "RESEND_API_KEY",
    "DATABASE_URL",
  ];
  
  for (const globalName of dangerousGlobals) {
    if ((window as unknown as Record<string, unknown>)[globalName]) {
      errors.push(`Dangerous secret exposed in window.${globalName}`);
    }
  }
  
  // Check Supabase configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    errors.push("Supabase configuration is missing");
  }
  
  // Warn if using localhost Supabase in production
  if (isProd && supabaseUrl?.includes("localhost")) {
    errors.push("Production client is configured to use localhost Supabase");
  }
  
  // Check CSP is present
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!cspMeta) {
    warnings.push("Content-Security-Policy meta tag not found");
  }
  
  // Check for console access in production (not an error, just a warning)
  if (isProd && typeof console.log === "function") {
    // Can't actually disable console, but we can warn about logging
    warnings.push("Console logging available in production - ensure no secrets are logged");
  }
  
  // Check localStorage for sensitive data patterns
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes("secret") || lowerKey.includes("password") || lowerKey.includes("private_key")) {
          warnings.push(`Potentially sensitive data in localStorage: ${key}`);
        }
      }
    }
  } catch {
    // localStorage access might be restricted
  }
  
  return {
    passed: errors.length === 0,
    warnings,
    errors,
    environment,
  };
}

/**
 * Log security status (call this on app initialization for debugging)
 */
export function logSecurityStatus(): void {
  const check = validateClientSecurity();
  
  if (!check.passed) {
    console.error("🚨 Security Check Failed:", check.errors);
  }
  
  if (check.warnings.length > 0) {
    console.warn("⚠️ Security Warnings:", check.warnings);
  }
  
  if (check.passed && check.warnings.length === 0) {
    console.info("✅ Security check passed", { environment: check.environment });
  }
}

/**
 * Initialize security validation
 * Call this early in app bootstrap
 */
export function initializeSecurityValidation(): ClientSecurityCheck {
  const result = validateClientSecurity();
  
  // In production with errors, we might want to report this
  if (isProductionEnvironment() && !result.passed) {
    // Could send to error reporting service
    console.error("[Security] Production deployment has security issues:", result.errors);
  }
  
  return result;
}
