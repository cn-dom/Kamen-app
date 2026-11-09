const MOVEMENTS_KEY = 'kamen-app-movements-v1';

export function readInventoryJson(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function appendInventoryMovements(existing = [], entries = []) {
  const current = Array.isArray(existing) ? existing : [];
  const seenIds = new Set(current.map(row => String(row?.id ?? '')).filter(Boolean));
  const seenOperations = new Set(current.map(row => String(row?.operationId ?? '')).filter(Boolean));
  const additions = [];
  for (const entry of entries) {
    if (!entry || !entry.id) throw new Error('Svako skladišno kretanje mora imati jedinstvenu oznaku.');
    const id = String(entry.id);
    const operationId = entry.operationId ? String(entry.operationId) : '';
    if (seenIds.has(id) || (operationId && seenOperations.has(operationId))) continue;
    seenIds.add(id);
    if (operationId) seenOperations.add(operationId);
    additions.push({ ...entry, id, operationId: operationId || undefined });
  }
  return [...additions, ...current];
}

/**
 * Commits related localStorage records together. A synchronous operation ID
 * makes repeated clicks/retries idempotent in the same browser storage.
 * Previous values are restored if any write fails.
 */
export function commitInventoryTransaction(storage, { operationId, writes = [], movements = [] }) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new Error('Skladišna pohrana nije dostupna.');
  }
  const key = String(operationId || '').trim();
  if (!key) throw new Error('Nedostaje jedinstvena oznaka skladišne operacije.');
  if (!Array.isArray(writes) || !Array.isArray(movements) || !movements.length) {
    throw new Error('Skladišna operacija mora sadržavati zapise i barem jedno kretanje.');
  }
  const currentLedger = readInventoryJson(storage, MOVEMENTS_KEY, []);
  if (!Array.isArray(currentLedger)) throw new Error('Dnevnik skladišnih kretanja nije valjan. Podaci nisu promijenjeni.');
  if (currentLedger.some(row => row?.operationId === key)) return { duplicate: true, movements: currentLedger };

  const nextLedger = appendInventoryMovements(currentLedger, movements.map((row, index) => ({
    ...row,
    id: row.id || key + ':' + index,
    operationId: key
  })));
  const allWrites = [...writes, { key: MOVEMENTS_KEY, value: nextLedger }];
  const snapshots = new Map();
  try {
    for (const write of allWrites) {
      if (!write?.key) throw new Error('Neispravan zapis skladišne operacije.');
      if (!snapshots.has(write.key)) snapshots.set(write.key, storage.getItem(write.key));
      storage.setItem(write.key, JSON.stringify(write.value));
    }
  } catch (error) {
    for (const [writeKey, previous] of snapshots) {
      try {
        if (previous === null) storage.removeItem(writeKey);
        else storage.setItem(writeKey, previous);
      } catch { /* Preserve the original storage error. */ }
    }
    throw new Error('Skladišna promjena nije spremljena. Prethodno stanje je vraćeno: ' + (error?.message || 'pogreška pohrane'));
  }
  return { duplicate: false, movements: nextLedger };
}

export function applyFinishedProductStockAction(product, {
  operationId, kind, quantity, reason = '', date = new Date().toISOString()
}) {
  if (!product?.id) return { error: 'Gotovi proizvod nije pronađen.' };
  const operation = String(operationId || '').trim();
  if (!operation) return { error: 'Nedostaje oznaka skladišne operacije.' };
  if ((product.transactions || []).some(row => row?.operationId === operation)) {
    return { duplicate: true, product };
  }

  const amount = Number(quantity);
  const unit = product.unit || 'kom';
  const wholeUnit = ['kom', 'par', 'set'].includes(unit);
  if (!Number.isFinite(amount) || amount <= 0 || (wholeUnit && !Number.isInteger(amount))) {
    return { error: wholeUnit ? 'Unesi pozitivan cijeli broj.' : 'Unesi valjanu količinu veću od nule.' };
  }
  const available = Number(product.stockQuantity ?? (
    ['Ugrađen', 'Prodano'].includes(product.status) ? 0 : product.quantity
  ) ?? 0);
  const decrease = ['Prodaja', 'Ugradnja', 'Korekcija −'].includes(kind);
  const increase = ['Povrat', 'Korekcija +'].includes(kind);
  if (!decrease && !increase) return { error: 'Nepoznata skladišna radnja.' };
  if (decrease && amount - available > 0.000001) {
    return { error: 'Nema dovoljno zalihe. Raspoloživo: ' + available + ' ' + unit + '.' };
  }
  if (increase && !String(reason).trim()) return { error: 'Za povrat ili korekciju obavezno upiši razlog.' };

  const delta = decrease ? -amount : amount;
  const remaining = Math.max(0, Number((available + delta).toFixed(4)));
  const timestamp = date;
  const transactionKind = kind === 'Povrat' ? 'Povrat gotovog proizvoda'
    : kind === 'Korekcija +' ? 'Korekcija zalihe (+)'
      : kind === 'Korekcija −' ? 'Korekcija zalihe (−)' : kind;
  const transaction = {
    id: operation,
    operationId: operation,
    kind: transactionKind,
    quantity: kind === 'Prodaja' || kind === 'Ugradnja' ? amount : delta,
    reason: String(reason).trim(),
    date: timestamp
  };
  const wasClosed = ['Ugrađen', 'Prodano'].includes(product.status);
  const nextProduct = {
    ...product,
    stockQuantity: remaining,
    status: remaining === 0 && (kind === 'Prodaja' || kind === 'Ugradnja')
      ? (kind === 'Ugradnja' ? 'Ugrađen' : 'Prodano')
      : (wasClosed && increase && remaining > 0 ? 'Na zalihi' : product.status),
    installedQuantity: Number(product.installedQuantity || 0) + (kind === 'Ugradnja' ? amount : 0),
    soldQuantity: Number(product.soldQuantity || 0) + (kind === 'Prodaja' ? amount : 0),
    transactions: [...(product.transactions || []), transaction],
    updatedAt: timestamp
  };
  return {
    duplicate: false,
    product: nextProduct,
    movement: {
      id: operation,
      operationId: operation,
      material: product.name,
      kind: transactionKind,
      quantity: transaction.quantity,
      reason: transaction.reason,
      location: product.location || '',
      date: new Date(timestamp).toLocaleDateString('hr-HR'),
      productId: product.id,
      orderId: product.orderId || ''
    }
  };
}
