/**
 * Legacy compatibility shim.
 *
 * Earlier versions automatically removed local business records during startup
 * to clear demo data. That behavior is unsafe: localStorage may contain real
 * customer, stock, production and financial records. Startup must never delete
 * or rewrite business data. Any future data migration must be explicit,
 * versioned, backed up and independently verified before it is applied.
 *
 * Kept as a no-op so an older import/call cannot destroy user data.
 */
export function resetDemoDataOnce() {
  return { status: 'disabled', reason: 'Automatic destructive demo-data cleanup is disabled.' };
}
