export const DEFAULT_COMPANY_SETTINGS = {
  locations: ['Stalak A1', 'Stalak A2', 'Stalak B1', 'Stalak C1', 'Polica O1', 'Vanjsko skladište'],
  materialTypes: ['Granit', 'Mramor', 'Kamen', 'Umjetni granit', 'Otpad'],
  units: ['ploča', 'kom', 'm²', 'm³'],
  workRules: { workStart: '07:00', workEnd: '15:00', breakMinutes: '30', travelCostPerKm: '0', hourlyCostRate: '0', overtimeMultiplier: '1.5', requireWriteoffReason: true, requireStocktakeApproval: true }
};

export function normalizeCompanySettings(value = {}) {
  return {
    ...DEFAULT_COMPANY_SETTINGS,
    ...(value || {}),
    locations: Array.isArray(value?.locations) ? [...new Set(value.locations.filter(item => typeof item === 'string' && item.trim()))] : [...DEFAULT_COMPANY_SETTINGS.locations],
    materialTypes: Array.isArray(value?.materialTypes) ? [...new Set(value.materialTypes.filter(item => typeof item === 'string' && item.trim()))] : [...DEFAULT_COMPANY_SETTINGS.materialTypes],
    units: Array.isArray(value?.units) ? [...new Set(value.units.filter(item => typeof item === 'string' && item.trim()))] : [...DEFAULT_COMPANY_SETTINGS.units],
    workRules: { ...DEFAULT_COMPANY_SETTINGS.workRules, ...(value?.workRules || {}) }
  };
}

export function validateCompanyProfile(profile = {}) {
  const oib = String(profile.oib || '').replace(/\s/g, '');
  if (oib && !/^\d{11}$/.test(oib)) return 'OIB mora sadržavati točno 11 znamenki.';
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return 'Unesi valjanu e-mail adresu.';
  return '';
}

export function validateCompanyWorkRules(rules = {}) {
  const parseTime = value => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''))) return null;
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const start = parseTime(rules.workStart), end = parseTime(rules.workEnd);
  if (start === null || end === null || end <= start) return 'Završetak smjene mora biti nakon početka smjene.';
  const breakMinutes = Number(rules.breakMinutes);
  const hourly = Number(rules.hourlyCostRate), travel = Number(rules.travelCostPerKm), overtime = Number(rules.overtimeMultiplier);
  if (!Number.isFinite(breakMinutes) || breakMinutes < 0 || breakMinutes >= end - start) return 'Trajanje pauze mora biti manje od ukupnog trajanja smjene.';
  if (![hourly, travel].every(value => Number.isFinite(value) && value >= 0)) return 'Troškovne stope ne mogu biti negativne.';
  if (!Number.isFinite(overtime) || overtime < 1 || overtime > 3) return 'Koeficijent prekovremenog rada mora biti između 1 i 3.';
  return '';
}

export function calculateNetShiftMinutes(rules = {}) {
  const [startHour, startMinute] = String(rules.workStart || '07:00').split(':').map(Number);
  const [endHour, endMinute] = String(rules.workEnd || '15:00').split(':').map(Number);
  const total = endHour * 60 + endMinute - startHour * 60 - startMinute;
  return Math.max(0, total - Math.max(0, Number(rules.breakMinutes) || 0));
}
