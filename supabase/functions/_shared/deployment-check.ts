/**
 * Deployment Security Self-Check
 * 
 * Runtime validation to prevent insecure deployment configurations.
 * Edge functions should call validateDeploymentSecurity() on cold start.
 */

import { safeLog, safeError } from "./safe-logging.ts";

export interface SecurityCheckResult {
  passed: boolean;
  warnings: string[];
  errors: string[];
  environment: string;
}

/**
 * Required secrets that must be present for secure operation
 */
const CORE_SECRETS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

/**
 * Secrets required for specific functionality
 */
const OPTIONAL_SECRETS: Record<string, string[]> = {
  email: ["RESEND_API_KEY"],
  sms: ["BULKSMSGH_API_KEY"],
  payments: ["PAYSTACK_SECRET_KEY"],
};

/**
 * Environment variables that indicate insecure configuration
 */
const INSECURE_SETTINGS: Record<string, string[]> = {
  DEBUG: ["true", "1", "yes"],
  VERBOSE_ERRORS: ["true", "1", "yes"],
  DISABLE_RATE_LIMITING: ["true", "1", "yes"],
  DISABLE_AUTH: ["true", "1", "yes"],
  SKIP_SIGNATURE_CHECK: ["true", "1", "yes"],
};

/**
 * Check if we're running in a production environment
 */
export function isProduction(): boolean {
  const env = Deno.env.get("ENVIRONMENT")?.toLowerCase();
  const denoEnv = Deno.env.get("DENO_ENV")?.toLowerCase();
  
  // Check for explicit production setting
  if (env === "production" || denoEnv === "production") {
    return true;
  }
  
  // Check Supabase project context
  const projectRef = Deno.env.get("SUPABASE_PROJECT_REF");
  if (projectRef && !projectRef.includes("local")) {
    // Non-local Supabase project is likely production
    return env !== "development" && denoEnv !== "development";
  }
  
  return false;
}

/**
 * Get current environment name
 */
export function getEnvironment(): string {
  return Deno.env.get("ENVIRONMENT") || 
         Deno.env.get("DENO_ENV") || 
         (isProduction() ? "production" : "development");
}

/**
 * Validate that all core secrets are present
 */
function checkCoreSecrets(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const secret of CORE_SECRETS) {
    const value = Deno.env.get(secret);
    if (!value) {
      errors.push(`Missing required secret: ${secret}`);
    } else if (value.length < 10) {
      warnings.push(`Secret ${secret} appears to be too short`);
    }
  }
  
  // Check for placeholder values
  const url = Deno.env.get("SUPABASE_URL");
  if (url && (url.includes("localhost") || url.includes("127.0.0.1"))) {
    if (isProduction()) {
      errors.push("SUPABASE_URL points to localhost in production environment");
    }
  }
  
  return { errors, warnings };
}

/**
 * Check for insecure environment settings
 */
function checkInsecureSettings(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const [setting, insecureValues] of Object.entries(INSECURE_SETTINGS)) {
    const value = Deno.env.get(setting)?.toLowerCase();
    if (value && insecureValues.includes(value)) {
      if (isProduction()) {
        errors.push(`Insecure setting in production: ${setting}=${value}`);
      } else {
        warnings.push(`Insecure setting detected (dev only): ${setting}=${value}`);
      }
    }
  }
  
  return { errors, warnings };
}

/**
 * Validate CORS configuration
 */
function checkCorsConfiguration(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS");
  
  if (isProduction()) {
    if (!allowedOrigins) {
      warnings.push("ALLOWED_ORIGINS not explicitly set - using default allowlist");
    } else if (allowedOrigins === "*") {
      errors.push("CORS allows all origins (*) in production - this is insecure");
    } else if (allowedOrigins.includes("localhost") || allowedOrigins.includes("127.0.0.1")) {
      warnings.push("ALLOWED_ORIGINS includes localhost in production");
    }
  }
  
  return { errors, warnings };
}

/**
 * Check service role key protection
 */
function checkServiceRoleProtection(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  // Check if service role key might be the same as anon key (unlikely but check)
  if (serviceKey && anonKey && serviceKey === anonKey) {
    errors.push("SERVICE_ROLE_KEY appears to be the same as ANON_KEY");
  }
  
  // Verify service key format (should be a JWT)
  if (serviceKey && !serviceKey.startsWith("eyJ")) {
    warnings.push("SERVICE_ROLE_KEY does not appear to be a valid JWT");
  }
  
  return { errors, warnings };
}

/**
 * Main validation function - call this on Edge Function cold start
 * 
 * @param functionName - Name of the function for logging
 * @param requiredFeatures - Optional features that require specific secrets
 * @param failOnError - If true, throws an error when critical checks fail (default: true in production)
 */
export function validateDeploymentSecurity(
  functionName: string,
  requiredFeatures?: ("email" | "sms" | "payments")[],
  failOnError?: boolean
): SecurityCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const environment = getEnvironment();
  
  // Should we fail on errors?
  const shouldFail = failOnError ?? isProduction();
  
  // Run all checks
  const coreCheck = checkCoreSecrets();
  const settingsCheck = checkInsecureSettings();
  const corsCheck = checkCorsConfiguration();
  const serviceRoleCheck = checkServiceRoleProtection();
  
  errors.push(...coreCheck.errors, ...settingsCheck.errors, ...corsCheck.errors, ...serviceRoleCheck.errors);
  warnings.push(...coreCheck.warnings, ...settingsCheck.warnings, ...corsCheck.warnings, ...serviceRoleCheck.warnings);
  
  // Check feature-specific secrets
  if (requiredFeatures) {
    for (const feature of requiredFeatures) {
      const featureSecrets = OPTIONAL_SECRETS[feature];
      if (featureSecrets) {
        for (const secret of featureSecrets) {
          if (!Deno.env.get(secret)) {
            errors.push(`Missing secret for ${feature} feature: ${secret}`);
          }
        }
      }
    }
  }
  
  const passed = errors.length === 0;
  const result: SecurityCheckResult = {
    passed,
    errors,
    warnings,
    environment,
  };
  
  // Log results
  if (!passed) {
    safeError(`[${functionName}] Security check FAILED in ${environment}:`, {
      errors,
      warnings,
    });
    
    if (shouldFail) {
      throw new Error(
        `Deployment security check failed: ${errors.join("; ")}. ` +
        `This function cannot run in an insecure configuration.`
      );
    }
  } else if (warnings.length > 0) {
    safeLog(`[${functionName}] Security check passed with warnings:`, {
      environment,
      warnings,
    });
  }
  
  return result;
}

/**
 * Quick check that can be used inline without throwing
 */
export function isSecureDeployment(): boolean {
  try {
    const result = validateDeploymentSecurity("inline-check", undefined, false);
    return result.passed;
  } catch {
    return false;
  }
}

/**
 * Get a security status response (useful for health checks)
 */
export function getSecurityStatus(): Record<string, unknown> {
  const environment = getEnvironment();
  const isProd = isProduction();
  
  return {
    environment,
    isProduction: isProd,
    coreSecretsPresent: CORE_SECRETS.every(s => !!Deno.env.get(s)),
    corsConfigured: !!Deno.env.get("ALLOWED_ORIGINS"),
    timestamp: new Date().toISOString(),
  };
}
