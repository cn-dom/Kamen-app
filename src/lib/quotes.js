export function calculateQuote(items = [], discountPercent = 0) {
  const discount = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const normalized = (Array.isArray(items) ? items : []).map(item => {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const vatRate = Math.min(100, Math.max(0, Number(item.vatRate) || 0));
    const net = Math.round(quantity * unitPrice * 100) / 100;
    return { ...item, quantity, unitPrice, vatRate, net };
  });
  const subtotal = Math.round(normalized.reduce((sum, item) => sum + item.net, 0) * 100) / 100;
  const discountAmount = Math.round(subtotal * discount) / 100;
  const ratio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 0;
  const lines = normalized.map(item => {
    const discountedNet = Math.round(item.net * ratio * 100) / 100;
    const vat = Math.round(discountedNet * item.vatRate) / 100;
    return { ...item, discountAmount: Math.round((item.net - discountedNet) * 100) / 100, netAfterDiscount: discountedNet, vat, gross: Math.round((discountedNet + vat) * 100) / 100 };
  });
  const net = Math.round(lines.reduce((sum, item) => sum + item.netAfterDiscount, 0) * 100) / 100;
  const vat = Math.round(lines.reduce((sum, item) => sum + item.vat, 0) * 100) / 100;
  return { lines, subtotal, discountAmount, discountPercent: discount, net, vat, gross: Math.round((net + vat) * 100) / 100 };
}

export function validateQuote(form = {}) {
  if (!String(form.customerName || '').trim()) return 'Unesi kupca.';
  if (!String(form.validUntil || '').trim()) return 'Unesi rok valjanosti ponude.';
  if (!Array.isArray(form.items) || !form.items.length) return 'Dodaj barem jednu stavku ponude.';
  for (const [index, item] of form.items.entries()) {
    if (!String(item.description || '').trim()) return 'Unesi opis stavke ' + (index + 1) + '.';
    if (!(Number(item.quantity) > 0) || !(Number(item.unitPrice) >= 0) || !(Number(item.vatRate) >= 0 && Number(item.vatRate) <= 100)) return 'Provjeri količinu, cijenu i PDV stavke ' + (index + 1) + '.';
  }
  if (!(Number(form.discountPercent || 0) >= 0 && Number(form.discountPercent || 0) <= 100)) return 'Popust mora biti između 0 i 100 %.';
  return '';
}
