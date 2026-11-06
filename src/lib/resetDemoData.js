const RESET_KEY = 'kamen-app-real-data-reset-v1';
const WAREHOUSE_CLEANUP_KEY = 'kamen-app-warehouse-demo-cleanup-v2';
const LEGACY_DEMO_IDS = new Set(['MAT-001', 'MAT-002', 'MAT-003', 'MAT-004', 'MAT-005']);
const LEGACY_DEMO_NAMES = new Set(['Brački kamen', 'Impala granit', 'Carrara mramor', 'Brački kamen — ostatak', 'Travertin — otpad']);
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
    if (window.localStorage.getItem(RESET_KEY) !== 'done') {
      DEMO_KEYS.forEach(key => window.localStorage.removeItem(key));
      window.localStorage.setItem(RESET_KEY, 'done');
    }

    // Remove only the five known seeded warehouse rows from earlier versions.
    // Any real material entries and unrelated movement history are preserved.
    if (window.localStorage.getItem(WAREHOUSE_CLEANUP_KEY) !== 'done') {
      const materials = JSON.parse(window.localStorage.getItem('kamen-app-materials-v1') || '[]');
      const removedNames = new Set(materials.filter(item => LEGACY_DEMO_IDS.has(item.id)).map(item => item.name));
      const cleanMaterials = materials.filter(item => !LEGACY_DEMO_IDS.has(item.id));
      window.localStorage.setItem('kamen-app-materials-v1', JSON.stringify(cleanMaterials));

      const movements = JSON.parse(window.localStorage.getItem('kamen-app-movements-v1') || '[]');
      const cleanMovements = movements.filter(row =>
        !LEGACY_DEMO_IDS.has(row.materialId) &&
        !removedNames.has(row.material) &&
        !LEGACY_DEMO_NAMES.has(row.material)
      );
      window.localStorage.setItem('kamen-app-movements-v1', JSON.stringify(cleanMovements));
      window.localStorage.setItem(WAREHOUSE_CLEANUP_KEY, 'done');
    }
  } catch {
    // Storage may be unavailable; modules still start with empty state.
  }
}
