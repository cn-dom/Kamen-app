import { calculateStageElapsedMs } from './production.js';
import { normalizeFieldCrew } from './field-work.js';
const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const hoursBetween = (start, end) => {
  const a = new Date(start).getTime(), b = new Date(end).getTime();
  return Number.isFinite(a) && Number.isFinite(b) && b > a ? (b - a) / 3600000 : 0;
};
const categoryList = record => Array.isArray(record.categories) ? record.categories : String(record.category || '').split(',').map(value => value.trim());
function productionHoursForOrder(orderId, productionRecords) {
  let milliseconds = 0;
  for (const [key, piece] of Object.entries(productionRecords?.pieces || {})) {
    if (!key.startsWith(orderId + '::')) continue;
    for (const [stageName, stage] of Object.entries(piece?.stages || {})) {
      if (stageName === 'Terenski rad / montaža') continue;
      milliseconds += calculateStageElapsedMs(stage);
    }
  }
  return Math.round(milliseconds / 3600000 * 100) / 100;
}
function fieldWorkForOrder(orderId, jobs) {
  let laborHours = 0, kilometers = 0;
  for (const job of Array.isArray(jobs) ? jobs : []) {
    if (job?.orderId !== orderId) continue;
    let startedAt = null;
    for (const event of Array.isArray(job.events) ? job.events : []) {
      if (event.type === 'Montaža u tijeku') startedAt = event.at;
      if (event.type === 'Završeno' && startedAt) {
        laborHours += hoursBetween(startedAt, event.at) * Math.max(1, normalizeFieldCrew(job).length);
        startedAt = null;
      }
    }
    if (job.status === 'Vraćeno') {
      const km = Number(job.distanceKm);
      if (Number.isFinite(km) && km > 0) kilometers += km;
    }
  }
  return { laborHours: Math.round(laborHours * 100) / 100, kilometers: Math.round(kilometers * 100) / 100 };
}
export function buildOperationalCostRecords({ orders = [], productionRecords = {}, fieldJobs = [], workRules = {}, existingCosts = [], now = new Date() } = {}) {
  const hourlyRate = Number(workRules.hourlyCostRate) || 0;
  const travelRate = Number(workRules.travelCostPerKm) || 0;
  if (hourlyRate <= 0 && travelRate <= 0) return [];
  const today = (now instanceof Date ? now : new Date(now)).toISOString().slice(0, 10);
  const result = [];
  for (const order of Array.isArray(orders) ? orders : []) {
    if (!order?.id) continue;
    const manual = (Array.isArray(existingCosts) ? existingCosts : []).filter(record => record.orderId === order.id && record.kind === 'Stvarni trošak');
    const manualLabor = manual.some(record => categoryList(record).includes('Rad'));
    const manualTransport = manual.some(record => categoryList(record).includes('Prijevoz'));
    const productionHours = productionHoursForOrder(order.id, productionRecords);
    const field = fieldWorkForOrder(order.id, fieldJobs);
    const laborHours = Math.round((productionHours + field.laborHours) * 100) / 100;
    if (!manualLabor && hourlyRate > 0 && laborHours > 0) result.push({
      id: 'AUTO-RAD-' + order.id, orderId: order.id, kind: 'Stvarni trošak', categories: ['Rad'], category: 'Rad',
      description: 'Automatski obračun evidentiranih radnih sati', hours: laborHours, hourlyRate,
      amount: roundMoney(laborHours * hourlyRate), amountSource: 'Automatski obračun iz proizvodnih i terenskih sesija',
      automatic: true, date: today, note: 'Automatski izračun. Ručno unesena stavka kategorije Rad ima prednost i sprječava dvostruki obračun.'
    });
    if (!manualTransport && travelRate > 0 && field.kilometers > 0) result.push({
      id: 'AUTO-PRIJEVOZ-' + order.id, orderId: order.id, kind: 'Stvarni trošak', categories: ['Prijevoz'], category: 'Prijevoz',
      description: 'Automatski obračun evidentirane kilometraže', kilometers: field.kilometers,
      amount: roundMoney(field.kilometers * travelRate), amountSource: 'Ukupna kilometraža × cijena po kilometru',
      automatic: true, date: today, note: 'Kilometraža se obračunava nakon evidentiranog povratka. Ručna stavka kategorije Prijevoz ima prednost.'
    });
  }
  return result;
}
