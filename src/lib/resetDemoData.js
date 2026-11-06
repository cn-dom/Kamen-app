const RESET_KEY = 'kamen-app-real-data-reset-v1';
const DEMO_KEYS = [
  'kamen-app-materials-v1',
  'kamen-app-movements-v1',
  'kamen-app-work-orders-v1',
  'kamen-app-field-work-v1',
  'kamen-app-customers-v1',
  'kamen-app-cost-records-v1',
  'kamen-app-finished-products-v1',
  'kamen-app-production-stages-v1'
];

export function resetDemoDataOnce() {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(RESET_KEY) === 'done') return;
    DEMO_KEYS.forEach(key => window.localStorage.removeItem(key));
    window.localStorage.setItem(RESET_KEY, 'done');
  } catch {
    // Storage may be unavailable; modules still start with empty state.
  }
}
