export function paymentSummary(total, payments = []) {
  const paid = Math.round(payments.reduce((sum, payment) => sum + Math.max(0, Number(payment.amount) || 0), 0) * 100) / 100;
  const due = Math.max(0, Math.round((Number(total || 0) - paid) * 100) / 100);
  return { total: Math.round(Number(total || 0) * 100) / 100, paid, due, status: due <= 0 ? 'Plaćeno' : paid > 0 ? 'Djelomično plaćeno' : 'Neplaćeno' };
}

export function validatePayment(payment, outstanding) {
  if (!payment.quoteId) return 'Odaberi ponudu za koju evidentiraš uplatu.';
  if (!payment.date) return 'Unesi datum uplate.';
  const amount = Number(payment.amount);
  if (!(amount > 0)) return 'Iznos uplate mora biti veći od nule.';
  if (amount - Number(outstanding || 0) > 0.005) return 'Uplata je veća od preostalog duga.';
  return '';
}

export function validateDelivery(delivery) {
  if (!delivery.quoteId) return 'Odaberi prihvaćenu ponudu.';
  if (!delivery.date) return 'Unesi datum isporuke.';
  if (!Array.isArray(delivery.items) || !delivery.items.length) return 'Dodaj barem jednu stavku.';
  const selected = delivery.items.filter(item => Number(item.quantity) > 0);
  if (!selected.length) return 'Unesi barem jednu isporučenu stavku.';
  if (selected.some(item => !String(item.description || '').trim() || Number(item.quantity) > Number(item.remaining) + 0.0005)) return 'Količina isporuke ne može biti veća od preostale količine.';
  return '';
}

export function deliveryQuantityRemaining(quotedQuantity, previousDeliveries = []) {
  const delivered = previousDeliveries.reduce((sum, note) => sum + (note.items || []).reduce((lineSum, item) => lineSum + (item.quoteLineId === quotedQuantity.id ? Number(item.quantity || 0) : 0), 0), 0);
  return Math.max(0, Math.round((Number(quotedQuantity.quantity || 0) - delivered) * 1000) / 1000);
}
