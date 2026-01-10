import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeSecurityValidation, isProductionEnvironment } from "./lib/deployment-validation";

// Run security validation on app startup
const securityCheck = initializeSecurityValidation();

// In production, block app startup if critical security issues detected
if (isProductionEnvironment() && !securityCheck.passed) {
  console.error("🚨 Critical security configuration errors detected. Check deployment settings.");
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
