import React, { useEffect, useMemo, useState } from 'react';
import FinishedProductsModule from './FinishedProductsModule.jsx';
import StocktakeModule from './StocktakeModule.jsx';
import { ArrowDownToLine, ArrowUpFromLine, Boxes, Check, ChevronDown, ClipboardCheck, Layers3, Plus, Search, Scissors, X, Pencil, Trash2 } from 'lucide-react';

const seedMaterials = [];

const MATERIALS_KEY = 'kamen-app-materials-v1';
const MOVEMENTS_KEY = 'kamen-app-movements-v1';
const WORK_ORDERS_KEY = 'kamen-app-work-orders-v1';
function readStored(key, fallback) {
  try { const saved = window.localStorage.getItem(key); return saved ? JSON.parse(saved) : fallback; }
  catch { return fallback; }
}

const emptyForm = { name: '', type: '', form: 'Ploča', thickness: '', length: '', width: '', quantity: '1', unit: 'ploča', pricePerM2: '', salePricePerM2: '', vatRate: '25', location: '', min: '0', note: '' };

export default function WarehouseModule({ onBack, mode = 'warehouse' }) {
  const productionMode = mode === 'production';
  const [materials, setMaterials] = useState(() => readStored(MATERIALS_KEY, []));
  const [warehouseTab, setWarehouseTab] = useState('materials');
  const [movements, setMovements] = useState(() => readStored(MOVEMENTS_KEY, []));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Sve');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [movement, setMovement] = useState(null);
  const [showCut, setShowCut] = useState(false);
  const sourceThicknessForCut = (items, id) => items.find(item => item.id === id)?.thickness ?? 0;
const newOutput = () => ({ id: 'OUT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), name: '', type: 'Gotov komad', orderPieceIndex: '', length: '', width: '', thickness: '', quantity: '1', location: 'Polica O1', note: '' });
  const initialCutForm = () => ({ sourceId: '', orderId: '', usedQty: '', note: '', outputs: [newOutput()] });
const parseQuantity = value => Number(String(value ?? '').trim().replace(',', '.'));
const formatQuantity = value => Number(value || 0).toLocaleString('hr-HR', { maximumFractionDigits: 2 });

function buildCuttingPlan(boardLength, boardWidth, pieces, kerf, trim, allowRotation, maxBoards) {
  const usableLength = boardLength - trim * 2;
  const usableWidth = boardWidth - trim * 2;
  if (!(usableLength > 0 && usableWidth > 0)) return { boards: [], unplaced: pieces, error: 'Rubno obrezivanje je veće od dimenzija ploče.' };
  const expanded = pieces.flatMap(piece => Array.from({ length: Math.max(0, Math.min(500, Number(piece.quantity) || 0)) }, (_, index) => ({
    id: piece.id + '-' + index, name: piece.name, length: Number(piece.length), width: Number(piece.width), sourceIndex: piece.sourceIndex
  }))).sort((a, b) => b.length * b.width - a.length * a.width);
  const boards = [];
  let remaining = [...expanded];
  const intersects = (a, b) => a.x < b.x + b.w - 1e-7 && a.x + a.w > b.x + 1e-7 && a.y < b.y + b.h - 1e-7 && a.y + a.h > b.y + 1e-7;
  const contains = (a, b) => b.x >= a.x - 1e-7 && b.y >= a.y - 1e-7 && b.x + b.w <= a.x + a.w + 1e-7 && b.y + b.h <= a.y + a.h + 1e-7;
  for (let boardIndex = 0; boardIndex < maxBoards && remaining.length; boardIndex++) {
    let free = [{ x: 0, y: 0, w: usableLength, h: usableWidth }];
    const placed = [];
    for (let p = 0; p < remaining.length;) {
      const piece = remaining[p];
      let best = null;
      for (const rect of free) {
        const orientations = [{ w: piece.length + kerf, h: piece.width + kerf, rotated: false }];
        if (allowRotation && Math.abs(piece.length - piece.width) > 1e-7) orientations.push({ w: piece.width + kerf, h: piece.length + kerf, rotated: true });
        for (const option of orientations) {
          if (option.w <= rect.w + 1e-7 && option.h <= rect.h + 1e-7) {
            const shortSide = Math.min(rect.w - option.w, rect.h - option.h);
            const longSide = Math.max(rect.w - option.w, rect.h - option.h);
            const score = shortSide * 100000 + longSide;
            if (!best || score < best.score) best = { rect, option, score };
          }
        }
      }
      if (!best) { p++; continue; }
      const placedRect = { x: best.rect.x, y: best.rect.y, w: best.option.w, h: best.option.h };
      placed.push({ ...piece, x: placedRect.x, y: placedRect.y, w: best.option.rotated ? piece.width : piece.length, h: best.option.rotated ? piece.length : piece.width, rotated: best.option.rotated });
      const nextFree = [];
      for (const rect of free) {
        if (!intersects(rect, placedRect)) { nextFree.push(rect); continue; }
        // Guillotine split: two disjoint rectangles, so leftover dimensions are safe to record.
        const rightX = placedRect.x + placedRect.w;
        const rightWidth = rect.x + rect.w - rightX;
        if (rightWidth > 1e-7) nextFree.push({ x: rightX, y: rect.y, w: rightWidth, h: rect.h });
        const bottomY = placedRect.y + placedRect.h;
        const bottomHeight = rect.y + rect.h - bottomY;
        if (bottomHeight > 1e-7) nextFree.push({ x: rect.x, y: bottomY, w: placedRect.w, h: bottomHeight });
      }
      free = nextFree.filter(rect => rect.w > 1e-7 && rect.h > 1e-7);
      remaining.splice(p, 1);
    }
    if (!placed.length) break;
    const offcuts = free
      .filter(rect => rect.w >= 20 && rect.h >= 20)
      .map((rect, index) => ({ ...rect, id: `offcut-${boardIndex + 1}-${index + 1}` }));
    boards.push({ index: boardIndex + 1, placed, offcuts, usableArea: usableLength * usableWidth, placedArea: placed.reduce((sum, item) => sum + item.length * item.width, 0) });
  }
  return { boards, unplaced: remaining, error: '' };
}

  const [cutForm, setCutForm] = useState(initialCutForm);
  const [cutKerf, setCutKerf] = useState('0.4');
  const [cutTrim, setCutTrim] = useState('1');
  const [allowRotation, setAllowRotation] = useState(true);
  const availableOrders = readStored(WORK_ORDERS_KEY, []).filter(order => !['Završen', 'Otkazan'].includes(order.status));
  const selectedCutSource = materials.find(item => item.id === cutForm.sourceId);
  const selectedCutOrder = availableOrders.find(order => order.id === cutForm.orderId);
  const cuttingPlan = useMemo(() => {
    if (!selectedCutSource || !selectedCutOrder || !Array.isArray(selectedCutOrder.pieces)) return null;
    const kerf = parseQuantity(cutKerf);
    const trim = parseQuantity(cutTrim);
    if (!Number.isFinite(kerf) || kerf < 0 || !Number.isFinite(trim) || trim < 0) return { error: 'Unesi valjanu širinu reza i rubno obrezivanje.', boards: [], unplaced: [] };
    const pieces = selectedCutOrder.pieces.map((piece, sourceIndex) => ({ ...piece, sourceIndex, id: 'piece-' + sourceIndex })).filter(piece => Number(piece.length) > 0 && Number(piece.width) > 0 && Number(piece.quantity) > Number(piece.producedQuantity || 0)).map(piece => ({ ...piece, quantity: Number(piece.quantity) - Number(piece.producedQuantity || 0) }));
    return buildCuttingPlan(Number(selectedCutSource.length), Number(selectedCutSource.width), pieces, kerf, trim, allowRotation, Math.floor(Number(selectedCutSource.quantity || 0) + Number(selectedCutOrder.reservedMaterialId === selectedCutSource.id ? selectedCutOrder.reservedMaterialQty || 0 : 0)));
  }, [selectedCutSource, selectedCutOrder, cutKerf, cutTrim, allowRotation]);
  const [movementQty, setMovementQty] = useState('1');
  const [saleLength, setSaleLength] = useState('');
  const [saleWidth, setSaleWidth] = useState('');
  const [salePieces, setSalePieces] = useState('1');
  const [toast, setToast] = useState('');

  useEffect(() => { try { window.localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials)); } catch { /* Browser storage may be disabled or full. */ } }, [materials]);
  useEffect(() => { try { window.localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements)); } catch { /* Browser storage may be disabled or full. */ } }, [movements]);

  const filtered = useMemo(() => materials.filter(item => {
    const matchesQuery = [item.id, item.name, item.location, item.type].join(' ').toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === 'Sve' || item.form === category);
  }), [materials, query, category]);

  const totalPieces = materials.reduce((sum, item) => sum + item.quantity, 0);
  const lowStock = materials.filter(item => item.form !== 'Otpad' && item.quantity <= item.min).length;
  const remnants = materials.filter(item => item.form === 'Ostatak').length;
  const updateForm = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const updateCutOutput = (id, key, value) => setCutForm(current => ({ ...current, outputs: current.outputs.map(output => output.id === id ? { ...output, [key]: value } : output) }));
  const addCutOutput = () => setCutForm(current => ({ ...current, outputs: [...current.outputs, { ...newOutput(), location: current.outputs[0]?.location || 'Polica O1' }] }));
  const removeCutOutput = id => setCutForm(current => ({ ...current, outputs: current.outputs.length > 1 ? current.outputs.filter(output => output.id !== id) : current.outputs }));
  const populateCutOutputsFromPlan = () => {
    if (!cuttingPlan?.boards?.length || !selectedCutSource) return;
    const dimension = value => String(Number(Number(value).toFixed(1)));
    const location = selectedCutSource.location || 'Polica O1';
    const plannedOutputs = cuttingPlan.boards.flatMap(board => [
      ...board.placed.map(piece => ({
        ...newOutput(),
        name: piece.name,
        type: 'Gotov komad',
        orderPieceIndex: String(piece.sourceIndex),
        length: dimension(piece.w),
        width: dimension(piece.h),
        thickness: String(selectedCutSource.thickness || ''),
        quantity: '1',
        location,
        note: `Automatski iz plana · ploča ${board.index}${piece.rotated ? ' · rotacija 90°' : ''}`
      })),
      ...board.offcuts.map((offcut, index) => ({
        ...newOutput(),
        name: `Ostatak ${selectedCutSource.name} ${board.index}-${index + 1}`,
        type: 'Ostatak',
        orderPieceIndex: '',
        length: dimension(offcut.w),
        width: dimension(offcut.h),
        thickness: String(selectedCutSource.thickness || ''),
        quantity: '1',
        location,
        note: `Pravokutni ostatak iz plana · položaj ${dimension(offcut.x + Number(cutTrim))} × ${dimension(offcut.y + Number(cutTrim))} cm`
      }))
    ]);
    setCutForm(current => ({ ...current, usedQty: String(cuttingPlan.boards.length), outputs: plannedOutputs }));
    flash(cuttingPlan.unplaced.length
      ? `Dodano ${plannedOutputs.length} izlaznih stavki. ${cuttingPlan.unplaced.length} komada još nije raspoređeno.`
      : `Dodano ${plannedOutputs.length} izlaznih stavki iz plana pilanja.`);
  };
  const flash = message => { setToast(message); window.setTimeout(() => setToast(''), 2800); };

  function addMaterial(event) {
    event.preventDefault();
    const quantity = parseQuantity(form.quantity);
    if (!form.name.trim() || !form.location.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      flash('Provjeri naziv, lokaciju i količinu.');
      return;
    }
    const timestamp = Date.now();
    const pricePerM2 = form.pricePerM2.trim() === '' ? null : parseQuantity(form.pricePerM2);
    const salePricePerM2 = form.salePricePerM2.trim() === '' ? null : parseQuantity(form.salePricePerM2);
    const vatRate = form.vatRate === '' ? 25 : parseQuantity(form.vatRate);
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) { flash('Stopa PDV-a mora biti između 0 i 100 %.'); return; }
    if (pricePerM2 !== null && (!Number.isFinite(pricePerM2) || pricePerM2 < 0)) { flash('Nabavna cijena po m² mora biti valjan iznos.'); return; }
    if (salePricePerM2 !== null && (!Number.isFinite(salePricePerM2) || salePricePerM2 < 0)) { flash('Prodajna cijena po m² mora biti valjan iznos.'); return; }
    const normalized = { ...form, salePricePerM2, vatRate, thickness: Number(form.thickness) || 0, length: Number(form.length) || 0, width: Number(form.width) || 0, quantity, pricePerM2, min: Number(form.min) || 0 };
    if (editingId) {
      const previous = materials.find(item => item.id === editingId);
      setMaterials(current => current.map(item => item.id === editingId ? { ...normalized, id: editingId } : item));
      if (previous && previous.quantity !== quantity) setMovements(current => [{ id: timestamp, material: normalized.name, kind: 'Korekcija zalihe', quantity: quantity - previous.quantity, location: normalized.location, date: new Date().toLocaleDateString('hr-HR') }, ...current].slice(0, 100));
      flash('Promjene stavke su spremljene.');
    } else {
      const next = { ...normalized, id: 'MAT-' + String(timestamp).slice(-6) };
      setMaterials(current => [next, ...current]);
      setMovements(current => [{ id: timestamp, material: next.name, kind: 'Zaprimanje', quantity, location: next.location, date: new Date().toLocaleDateString('hr-HR') }, ...current].slice(0, 100));
      flash('Materijal je dodan u skladišnu evidenciju.');
    }
    setShowForm(false); setEditingId(null); setForm(emptyForm);
  }

  function editMaterial(item) {
    setEditingId(item.id);
    setForm({ name: item.name || '', type: item.type || '', form: item.form || 'Ploča', thickness: String(item.thickness ?? ''), length: String(item.length ?? ''), width: String(item.width ?? ''), quantity: String(item.quantity ?? 1), unit: item.unit || 'ploča', pricePerM2: item.pricePerM2 == null ? '' : String(item.pricePerM2), salePricePerM2: item.salePricePerM2 == null ? '' : String(item.salePricePerM2), vatRate: String(item.vatRate ?? 25), location: item.location || '', min: String(item.min ?? 0), note: item.note || '' });
    setShowForm(true);
  }
  function deleteMaterial(item) {
    if (!window.confirm('Želiš li ukloniti stavku ' + item.name + ' iz skladišta?')) return;
    setMaterials(current => current.filter(row => row.id !== item.id));
    setMovements(current => [{ id: Date.now(), material: item.name, kind: 'Uklanjanje stavke', quantity: item.quantity, location: item.location, date: new Date().toLocaleDateString('hr-HR') }, ...current].slice(0, 100));
    flash('Stavka je uklonjena iz skladišta.');
  }

  function saveCut(event) {
    event.preventDefault();
    const source = materials.find(item => item.id === cutForm.sourceId);
    const usedQty = parseQuantity(cutForm.usedQty);
    const linkedOrder = cutForm.orderId ? readStored(WORK_ORDERS_KEY, []).find(order => order.id === cutForm.orderId && !['Završen', 'Otkazan'].includes(order.status)) : null;
    const reservedForOrder = linkedOrder && linkedOrder.reservedMaterialId === source?.id ? Number(linkedOrder.reservedMaterialQty || 0) : 0;
    const availableForCut = Number(source?.quantity || 0) + reservedForOrder;
    if (!source || !Number.isFinite(usedQty) || usedQty <= 0 || Math.round(usedQty * 100) !== usedQty * 100 || usedQty > availableForCut + 1e-9) {
      flash('Provjeri ulazni materijal i količinu. Za povezani nalog koristi se njegova prethodno rezervirana količina.');
      return;
    }
    if (cutForm.orderId && !linkedOrder) { flash('Odabrani radni nalog više nije dostupan. Osvježi prikaz i pokušaj ponovno.'); return; }
    if (!cutForm.outputs.length || cutForm.outputs.some(output =>
      !output.name.trim() || !Number.isInteger(Number(output.quantity)) || Number(output.quantity) < 1 ||
      Number(output.length) < 0 || Number(output.width) < 0 || Number(output.thickness || source.thickness) <= 0 ||
      !output.location.trim() || output.length === '' || output.width === '' ||
      (linkedOrder && output.type === 'Gotov komad' && output.orderPieceIndex === '')
    )) {
      flash(linkedOrder ? 'Za gotove komade poveži izlaznu stavku s komadom iz radnog naloga te provjeri količinu i dimenzije.' : 'Za svaki izlazni komad unesi naziv, cijelu količinu, dimenzije i lokaciju.');
      return;
    }
    if (linkedOrder) {
      const planned = {};
      for (const output of cutForm.outputs.filter(item => item.type === 'Gotov komad')) {
        const pieceIndex = Number(output.orderPieceIndex);
        planned[pieceIndex] = (planned[pieceIndex] || 0) + Number(output.quantity);
      }
      const exceedsPlan = Object.entries(planned).some(([index, qty]) => qty > Math.max(0, Number(linkedOrder.pieces[Number(index)]?.quantity || 0) - Number(linkedOrder.pieces[Number(index)]?.producedQuantity || 0)));
      if (exceedsPlan) { flash('Količina gotovih komada prelazi preostalu naručenu količinu. Provjeri povezane komade.'); return; }
    }
    const timestamp = Date.now();
    const date = new Date().toLocaleDateString('hr-HR');
    const outputMaterials = cutForm.outputs.map((output, index) => {
      const kind = output.type;
      const formType = kind === 'Ostatak' ? 'Ostatak' : kind === 'Otpad' ? 'Otpad' : 'Komad';
      const materialType = kind === 'Otpad' ? 'Otpad' : source.type;
      return {
        id: 'MAT-' + String(timestamp + index).slice(-6),
        name: output.name.trim(),
        type: materialType,
        form: formType,
        thickness: Number(output.thickness || source.thickness),
        length: Number(output.length),
        width: Number(output.width),
        quantity: Number(output.quantity),
        unit: 'kom',
        pricePerM2: source.pricePerM2 ?? null,
        location: output.location.trim(),
        min: 0,
        orderId: linkedOrder?.id || '',
        orderPieceIndex: linkedOrder && output.type === 'Gotov komad' ? Number(output.orderPieceIndex) : null,
        orderPieceName: linkedOrder && output.type === 'Gotov komad' ? linkedOrder.pieces[Number(output.orderPieceIndex)]?.name || '' : '',
        note: [cutForm.note.trim(), output.note.trim(), linkedOrder ? 'Radni nalog ' + linkedOrder.id : '', linkedOrder && output.type === 'Gotov komad' ? 'Komad: ' + (linkedOrder.pieces[Number(output.orderPieceIndex)]?.name || '') : '', 'Nastalo pilanjem materijala ' + source.id].filter(Boolean).join(' · ')
      };
    });
    const finishedOutputs = outputMaterials.filter(item => item.form === 'Komad').map(item => ({
      id: 'GP-' + item.id,
      name: item.name,
      category: item.orderPieceName || 'Ostalo',
      material: source.name,
      length: item.length,
      width: item.width,
      thickness: item.thickness,
      quantity: item.quantity,
      stockQuantity: item.quantity,
      unit: item.unit,
      status: linkedOrder ? 'Čeka ugradnju' : 'Na zalihi',
      orderId: linkedOrder?.id || '',
      customer: linkedOrder?.customer || '',
      location: item.location,
      price: null,
      processes: [],
      photo: '',
      note: item.note,
      createdAt: new Date(timestamp).toISOString()
    }));
    if (finishedOutputs.length) {
      try {
        const currentFinished = readStored('kamen-app-finished-products-v1', []);
        window.localStorage.setItem('kamen-app-finished-products-v1', JSON.stringify([...finishedOutputs, ...currentFinished]));
      } catch { /* Warehouse cutting is still recorded if the finished goods list cannot be updated. */ }
    }
    const stockDelta = reservedForOrder > 0 ? reservedForOrder - usedQty : -usedQty;
    setMaterials(current => [...current.map(item => item.id === source.id ? { ...item, quantity: Math.max(0, Number((item.quantity + stockDelta).toFixed(2))) } : item), ...outputMaterials.filter(item => item.form !== 'Komad')]);
    const outputMovements = outputMaterials.map((item, index) => ({
      id: timestamp + index + 2,
      material: item.name,
      kind: item.form === 'Otpad' ? 'Nastali otpad' : item.form === 'Ostatak' ? 'Nastali ostatak' : 'Gotov komad',
      quantity: item.quantity,
      location: item.location,
      orderId: linkedOrder?.id || '',
      date
    }));
    setMovements(current => [
      { id: timestamp + 1, material: source.name, kind: 'Potrošnja za pilanje', quantity: usedQty, location: source.location, orderId: linkedOrder?.id || '', date },
      ...(reservedForOrder > 0 && reservedForOrder > usedQty ? [{ id: timestamp + 2, material: source.name, kind: 'Povrat neiskorištene rezervacije', quantity: Number((reservedForOrder - usedQty).toFixed(2)), location: source.location, orderId: linkedOrder?.id || '', date }] : []),
      ...outputMovements,
      ...current
    ].slice(0, 100));
    if (linkedOrder) {
      try {
        const currentOrders = JSON.parse(window.localStorage.getItem(WORK_ORDERS_KEY) || '[]');
        window.localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(currentOrders.map(order => {
          if (order.id !== linkedOrder.id) return order;
          const updatedPieces = (order.pieces || []).map((piece, index) => {
            const added = outputMaterials.filter(item => item.form === 'Komad' && item.orderPieceIndex === index).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            return added ? { ...piece, producedQuantity: Number(piece.producedQuantity || 0) + added } : piece;
          });
          const allProduced = updatedPieces.every(piece => Number(piece.producedQuantity || 0) >= Number(piece.quantity || 0));
          return { ...order, reservedMaterialQty: order.id === linkedOrder.id && order.reservedMaterialId === source.id ? 0 : order.reservedMaterialQty, pieces: updatedPieces, status: allProduced ? 'Čeka kontrolu' : 'U tijeku' };
        })));
      } catch { /* The cutting record remains saved locally even if order status cannot be updated. */ }
    }
    setShowCut(false);
    setCutForm(initialCutForm());
    flash('Pilanje evidentirano: ' + outputMaterials.length + ' izlaznih stavki dodano je u skladište.');
  }

  function saveMovement(event) {
    event.preventDefault();
    const item = materials.find(row => row.id === movement?.id);
    if (!item || !movement) return;
    const timestamp = Date.now();
    let qty = parseQuantity(movementQty);
    let stockDelta;
    let movementDetails = {};
    if (movement.kind === 'Prodaja') {
      const length = parseQuantity(saleLength);
      const width = parseQuantity(saleWidth);
      const pieces = parseQuantity(salePieces);
      const stockArea = Number(item.length || 0) * Number(item.width || 0) / 10000;
      const areaM2 = length * width / 10000 * pieces;
      const price = Number(item.salePricePerM2);
      if (!(Number.isFinite(length) && length > 0 && Number.isFinite(width) && width > 0 && Number.isFinite(pieces) && pieces > 0 && Number.isInteger(pieces))) { flash('Unesi valjane dimenzije i cijeli broj prodanih komada.'); return; }
      if (!(Number.isFinite(price) && price >= 0)) { flash('Za prodaju prvo unesi prodajnu cijenu po m² u podacima materijala.'); return; }
      if (item.unit === 'm³') { flash('Prodaja po m² nije moguća za zalihu koja se vodi u m³.'); return; }
      if (item.unit !== 'm²' && !(stockArea > 0)) { flash('Za automatski obračun zalihe materijal mora imati unesene dimenzije ploče ili komada.'); return; }
      qty = Number(areaM2.toFixed(4));
      stockDelta = item.unit === 'm²' ? -areaM2 : -(areaM2 / stockArea);
      if (Math.abs(stockDelta) > Number(item.quantity || 0) + 1e-9) { flash('Nema dovoljno raspoloživog materijala za ovu prodaju.'); return; }
      movementDetails = { areaM2: qty, unit: 'm²', lengthCm: length, widthCm: width, pieces, pricePerM2: price, vatRate: Number(item.vatRate ?? 25), saleNetAmount: Number((areaM2 * price).toFixed(2)), saleVatAmount: Number((areaM2 * price * Number(item.vatRate ?? 25) / 100).toFixed(2)), saleAmount: Number((areaM2 * price * (1 + Number(item.vatRate ?? 25) / 100)).toFixed(2)), stockDeduction: Number((-stockDelta).toFixed(4)), stockUnit: item.unit };
    } else {
      qty = parseQuantity(movementQty);
      if (!Number.isFinite(qty) || qty <= 0 || Math.round(qty * 100) !== qty * 100) { flash('Količina mora biti veća od nule (najviše dvije decimale).'); return; }
      if (movement.kind === 'Izdavanje' && qty > item.quantity) { flash('Nema dovoljno zalihe za izdavanje.'); return; }
      stockDelta = movement.kind === 'Zaprimanje' ? qty : -qty;
    }
    setMaterials(current => current.map(row => row.id === movement.id ? { ...row, quantity: Number(Math.max(0, row.quantity + stockDelta).toFixed(4)) } : row));
    setMovements(current => [{ id: timestamp, material: item.name, kind: movement.kind, quantity: qty, location: item.location, date: new Date().toLocaleDateString('hr-HR'), ...movementDetails }, ...current].slice(0, 100));
    setMovement(null);
    setMovementQty('1');
    setSaleLength(''); setSaleWidth(''); setSalePieces('1');
    flash(movement.kind === 'Prodaja' ? 'Prodaja evidentirana. Zaliha je umanjena prema prodanoj površini.' : movement.kind + ' je evidentirano.');
  }

  function applyStocktake(differences) {
    const timestamp = Date.now();
    const date = new Date().toLocaleDateString('hr-HR');
    const byId = new Map(differences.map(row => [row.materialId, row]));
    setMaterials(current => current.map(item => byId.has(item.id) ? { ...item, quantity: Number(byId.get(item.id).countedQuantity) } : item));
    if (differences.length) setMovements(current => [
      ...differences.map((row, index) => ({
        id: timestamp + index,
        material: row.name,
        kind: row.difference > 0 ? 'Inventurna korekcija +' : 'Inventurna korekcija −',
        quantity: Math.abs(row.difference),
        location: row.location,
        reason: row.reason,
        date
      })),
      ...current
    ].slice(0, 100));
  }

  const warehouseSubnav = <div className="warehouse-subnav">
    <button className={'warehouse-subnav-item ' + (warehouseTab === 'materials' ? 'active' : '')} onClick={() => setWarehouseTab('materials')}><Boxes size={16}/> Materijali i zalihe</button>
    <button className={'warehouse-subnav-item ' + (warehouseTab === 'finished' ? 'active' : '')} onClick={() => setWarehouseTab('finished')}><Layers3 size={16}/> Gotovi proizvodi</button>
    <button className={'warehouse-subnav-item ' + (warehouseTab === 'stocktake' ? 'active' : '')} onClick={() => setWarehouseTab('stocktake')}><ClipboardCheck size={16}/> Inventura</button>
  </div>;

  if (!productionMode && warehouseTab === 'finished') return <div className="page-content module-page warehouse-page">{warehouseSubnav}<FinishedProductsModule onBack={() => setWarehouseTab('materials')} /></div>;
  if (!productionMode && warehouseTab === 'stocktake') return <div className="page-content module-page warehouse-page">{warehouseSubnav}<StocktakeModule materials={materials} onApply={applyStocktake} /></div>;

  return (
    <div className="page-content module-page warehouse-page">
      <section className="welcome-row module-welcome">
        <div><div className="eyebrow"><span className="live-dot" /> {productionMode ? 'RADIONICA I OBRADA' : 'MATERIJAL I ZALIHE'}</div><h1>{productionMode ? 'Proizvodnja i pilanje' : 'Skladište'}</h1><p className="subtitle">{productionMode ? 'Poveži pilanje s radnim nalogom, evidentiraj gotove komade, ostatke i otpad te automatski ažuriraj stanje materijala.' : 'Evidencija kamenih ploča, komada, ostataka i otpada na jednome mjestu.'}</p></div>
        <div className="welcome-actions"><button className="button button-secondary" onClick={onBack}>← Povratak na pregled</button><button className="button button-secondary" onClick={() => setShowCut(true)}><Scissors size={16}/> {productionMode ? 'Novi nalog za pilanje' : 'Evidentiraj pilanje'}</button><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16}/> Novi materijal</button></div>
      </section>

      {!productionMode && warehouseSubnav}

      <section className="stats-grid warehouse-stats">
        <article className="stat-card"><div className="stat-top"><span>Stavke u evidenciji</span><span className="stat-icon blue-icon"><Boxes size={18}/></span></div><div className="stat-value">{materials.length}<span className="stat-unit">stavki</span></div><div className="stat-foot">Materijali, ostaci i otpad</div></article>
        <article className="stat-card"><div className="stat-top"><span>Ukupna količina</span><span className="stat-icon green-icon"><Layers3 size={18}/></span></div><div className="stat-value">{formatQuantity(totalPieces)}<span className="stat-unit">kom / ploča</span></div><div className="stat-foot">Zbroj evidentiranih jedinica</div></article>
        <article className="stat-card"><div className="stat-top"><span>Niska zaliha</span><span className="stat-icon red-icon"><ArrowDownToLine size={18}/></span></div><div className="stat-value">{lowStock}<span className="stat-unit">stavki</span></div><div className="stat-foot">Na ili ispod minimalne količine</div></article>
        <article className="stat-card"><div className="stat-top"><span>Upotrebljivi ostaci</span><span className="stat-icon violet-icon"><ClipboardCheck size={18}/></span></div><div className="stat-value">{remnants}<span className="stat-unit">stavki</span></div><div className="stat-foot">Odvojeno od punih ploča</div></article>
      </section>

      <section className="panel warehouse-panel">
        <div className="panel-heading"><div><div className="panel-title-line"><h2>Stanje materijala</h2><span className="count-pill">{filtered.length}</span></div><p>Pretraži zalihu i pregledaj lokacije ili evidentiraj kretanje.</p></div><span className="demo-label"><span/> STVARNA EVIDENCIJA</span></div>
        <div className="warehouse-toolbar">
          <label className="warehouse-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Traži materijal, šifru ili lokaciju..."/></label>
          <label className="warehouse-filter"><span>Vrsta stavke</span><select value={category} onChange={e => setCategory(e.target.value)}><option>Sve</option><option>Ploča</option><option>Ostatak</option><option>Otpad</option></select><ChevronDown size={14}/></label>
        </div>
        <div className="orders-table-wrap"><table className="orders-table warehouse-table"><thead><tr><th>MATERIJAL</th><th>DIMENZIJE (D × Š × D)</th><th>KOLIČINA</th><th>LOKACIJA</th><th>STANJE</th><th>RADNJE</th></tr></thead><tbody>
          {filtered.length ? filtered.map(item => <tr key={item.id}><td><div className="order-name"><span className="order-symbol blue"><Layers3 size={16}/></span><div><strong>{item.name}</strong><small>{item.id} · {item.type} · {item.form}{item.pricePerM2 != null ? ' · Nabava ' + Number(item.pricePerM2).toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €/m²' : ''}{item.salePricePerM2 != null ? ' · Prodaja ' + Number(item.salePricePerM2).toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €/m²' : ''}</small></div></div></td><td>{item.length && item.width ? <span>{item.length} × {item.width} × {item.thickness} cm</span> : <span className="muted-icon">Nije navedeno</span>}</td><td><strong>{formatQuantity(item.quantity)}</strong> <span className="muted-icon">{item.unit}</span></td><td>{item.location}</td><td><span className={'stock-status ' + (item.form === 'Otpad' ? 'warn' : item.quantity <= item.min ? 'low' : 'good')}><i/>{item.form === 'Otpad' ? 'Otpad' : item.quantity <= item.min ? 'Niska zaliha' : 'Dostupno'}</span></td><td><div className="warehouse-row-actions"><button className="row-action" title="Zaprimanje" aria-label={'Zaprimanje ' + item.name} onClick={() => { setMovement({ id: item.id, kind: 'Zaprimanje' }); setMovementQty('1'); }}><ArrowDownToLine size={15}/></button><button className="row-action" title="Izdavanje" aria-label={'Izdavanje ' + item.name} disabled={item.quantity < 1 || item.form === 'Otpad'} onClick={() => { setMovement({ id: item.id, kind: 'Izdavanje' }); setMovementQty('1'); }}><ArrowUpFromLine size={15}/></button><button className="row-action" title="Prodaja po m²" aria-label={'Prodaja ' + item.name} disabled={item.quantity <= 0 || item.form === 'Otpad'} onClick={() => { setMovement({ id: item.id, kind: 'Prodaja' }); setSaleLength(String(item.length || '')); setSaleWidth(String(item.width || '')); setSalePieces('1'); }}><span style={{fontSize:11,fontWeight:800}}>€</span></button><button className="row-action" title="Uredi stavku" aria-label={'Uredi ' + item.name} onClick={() => editMaterial(item)}><Pencil size={15}/></button><button className="row-action danger" title="Ukloni stavku" aria-label={'Ukloni ' + item.name} onClick={() => deleteMaterial(item)}><Trash2 size={15}/></button></div></td></tr>) : <tr><td colSpan="6"><div className="empty-state"><Search size={22}/><strong>Nema pronađenih stavki</strong><span>Promijeni pojam ili vrstu stavke.</span></div></td></tr>}
        </tbody></table></div>
        <div className="panel-foot"><span>Prikazano {filtered.length} od {materials.length} stavki</span><span>Podaci se spremaju lokalno u ovaj preglednik.</span></div>
      </section>

      <section className="panel warehouse-movements"><div className="panel-heading"><div><h2>{productionMode ? 'Proizvodni dnevnik' : 'Zadnja kretanja'}</h2><p>{productionMode ? 'Utrošak ploča, gotovi komadi, ostatci i otpad iz postupaka pilanja.' : 'Ogledni dnevnik zaprimanja i izdavanja.'}</p></div><ClipboardCheck size={19} className="muted-icon"/></div>
        {movements.length ? <div className="warehouse-movement-list">{movements.map(row => <div className="warehouse-movement" key={row.id}><span className={'movement-icon ' + (['Zaprimanje','Nastali ostatak','Nastali otpad','Gotov komad','Povrat gotovog proizvoda na zalihu'].includes(row.kind) ? 'movement-in' : 'movement-out')}>{['Zaprimanje','Nastali ostatak','Nastali otpad','Gotov komad','Povrat gotovog proizvoda na zalihu'].includes(row.kind) ? <ArrowDownToLine size={16}/> : <ArrowUpFromLine size={16}/>}</span><div><strong>{row.kind}: {row.material}</strong><small>{row.date} · {row.location}{row.saleAmount != null ? ' · ' + row.pieces + ' kom × ' + row.lengthCm + ' × ' + row.widthCm + ' cm · bez PDV-a ' + Number(row.saleNetAmount).toLocaleString('hr-HR',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' € · PDV ' + Number(row.saleVatAmount).toLocaleString('hr-HR',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' € · ukupno ' + Number(row.saleAmount).toLocaleString('hr-HR',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €' : ''}</small></div><b>{['Zaprimanje','Nastali ostatak','Nastali otpad','Gotov komad','Povrat gotovog proizvoda na zalihu','Povrat neiskorištene rezervacije'].includes(row.kind) ? '+' : '−'}{formatQuantity(row.quantity)}</b></div>)}</div> : <div className="warehouse-empty"><ClipboardCheck size={24}/><strong>Nema evidentiranih kretanja</strong><span>Odaberi zaprimanje ili izdavanje u tablici materijala.</span></div>}
      </section>

      <div className="module-notice"><Boxes size={17}/><span>Početno stanje je prazno. Unosi materijal koji stvarno zaprimiš; količine se vode u ovom pregledniku i još se ne sinkroniziraju između uređaja.</span></div>

      {showForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowForm(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="warehouse-modal-title"><div className="modal-head"><div><span className="modal-kicker">SKLADIŠTE</span><h2 id="warehouse-modal-title">{editingId ? 'Uredi materijal' : 'Novi materijal'}</h2><p>{editingId ? 'Ispravi podatke postojeće skladišne stavke.' : 'Unesi osnovne podatke o zalihi.'}</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Zatvori"><X size={19}/></button></div><form onSubmit={addMaterial}><label>Naziv materijala<input autoFocus value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Npr. Jadranski kamen" required/></label><div className="form-row"><label>Vrsta / opis materijala<input value={form.type} onChange={e => updateForm('type', e.target.value)} placeholder="Npr. granit, mramor, umjetni granit"/></label><label>Oblik stavke<select value={form.form} onChange={e => updateForm('form', e.target.value)}><option>Ploča</option><option>Komad</option><option>Ostatak</option><option>Otpad</option></select></label></div><div className="form-row"><label>Debljina (cm)<input type="number" min="0" step="0.1" value={form.thickness} onChange={e => updateForm('thickness', e.target.value)} placeholder="Npr. 3"/></label><label>Količina<input type="number" min="0" step="0.01" value={form.quantity} onChange={e => updateForm('quantity', e.target.value)} required/></label></div><div className="form-row"><label>Dužina (cm)<input type="number" min="0" value={form.length} onChange={e => updateForm('length', e.target.value)}/></label><label>Širina (cm)<input type="number" min="0" value={form.width} onChange={e => updateForm('width', e.target.value)}/></label></div><div className="form-row"><label>Jedinica<select value={form.unit} onChange={e => updateForm('unit', e.target.value)}><option>ploča</option><option>kom</option><option>m²</option><option>m³</option></select></label><label>Minimalna zaliha<input type="number" min="0" value={form.min} onChange={e => updateForm('min', e.target.value)}/></label></div><div className="form-row"><label>Nabavna cijena (€/m²)<input type="text" inputMode="decimal" value={form.pricePerM2} onChange={e => updateForm('pricePerM2', e.target.value)} placeholder="Npr. 120,00"/></label><label>Prodajna cijena bez PDV-a (€/m²)<input type="text" inputMode="decimal" value={form.salePricePerM2} onChange={e => updateForm('salePricePerM2', e.target.value)} placeholder="Npr. 200,00"/></label></div><div className="form-row"><label>Stopa PDV-a (%)<input type="text" inputMode="decimal" value={form.vatRate ?? '25'} onChange={e => updateForm('vatRate', e.target.value)} placeholder="25"/></label><label>Cijena s PDV-om (€/m²)<input value={form.salePricePerM2.trim() !== '' && Number.isFinite(parseQuantity(form.salePricePerM2)) ? (parseQuantity(form.salePricePerM2) * (1 + (parseQuantity(form.vatRate || '25') / 100))).toLocaleString('hr-HR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'} readOnly/></label></div><small className="field-hint">Prodajna cijena unosi se bez PDV-a. Cijena s PDV-om izračunava se prema upisanoj stopi. Stopa je promjenjiva po materijalu.</small><label>Lokacija u skladištu<input value={form.location} onChange={e => updateForm('location', e.target.value)} placeholder="Npr. Stalak C1" required/></label><label>Napomena<input value={form.note} onChange={e => updateForm('note', e.target.value)} placeholder="Opcionalno"/></label><div className="modal-note"><ClipboardCheck size={16}/><span>Unos povećava zalihu za unesenu količinu. Naziv i vrstu materijala unosiš slobodno, prema stvarnoj nabavi.</span></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Odustani</button><button type="submit" className="button button-primary">{editingId ? <Check size={16}/> : <Plus size={16}/>} {editingId ? 'Spremi promjene' : 'Dodaj materijal'}</button></div></form></section></div>}


      {showCut && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowCut(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="cut-modal-title"><div className="modal-head"><div><span className="modal-kicker">PROIZVODNJA · SKLADIŠTE</span><h2 id="cut-modal-title">Evidentiraj pilanje</h2><p>Utroši ulazni materijal i evidentiraj nastali ostatak ili otpad.</p></div><button className="icon-button" onClick={() => setShowCut(false)} aria-label="Zatvori"><X size={19}/></button></div><form onSubmit={saveCut}><label>Radni nalog (nije obavezno)<select value={cutForm.orderId} onChange={e => setCutForm(current => ({ ...current, orderId: e.target.value }))}><option value="">Bez povezivanja s nalogom</option>{availableOrders.map(order => <option key={order.id} value={order.id}>{order.id} — {order.project} · {order.customer}</option>)}</select></label>{cutForm.orderId && availableOrders.find(order => order.id === cutForm.orderId) && <div className="modal-note"><ClipboardCheck size={16}/><span>{availableOrders.find(order => order.id === cutForm.orderId).material} · {availableOrders.find(order => order.id === cutForm.orderId).pieces.reduce((sum, piece) => sum + Number(piece.quantity || 0), 0)} komada po nacrtu. Nakon evidentiranja pilanja nalog prelazi na „Čeka kontrolu”.</span></div>}<label>Ulazni materijal<select value={cutForm.sourceId} onChange={e => setCutForm(current => ({ ...current, sourceId: e.target.value }))} required><option value="">Odaberi ploču iz skladišta</option>{materials.filter(item => item.form === 'Ploča' && (item.quantity > 0 || (cutForm.orderId && availableOrders.find(order => order.id === cutForm.orderId)?.reservedMaterialId === item.id && Number(availableOrders.find(order => order.id === cutForm.orderId)?.reservedMaterialQty || 0) > 0))).map(item => <option key={item.id} value={item.id}>{item.name} — {formatQuantity(item.quantity)} {item.unit} dostupno</option>)}</select></label>{cutForm.orderId && selectedCutSource && <section className="cutting-planner"><div className="cutting-planner-head"><div><span className="modal-kicker">PLANIRANJE REZA</span><h3>Prijedlog rasporeda komada</h3><p>Prikaz je informativan i ne mijenja zalihu dok ne evidentiraš pilanje.</p></div><span className="cutting-planner-tag">BETA</span></div><div className="form-row cutting-settings"><label>Širina reza pile (cm)<input type="number" min="0" step="0.1" value={cutKerf} onChange={e => setCutKerf(e.target.value)}/></label><label>Rubno obrezivanje (cm po strani)<input type="number" min="0" step="0.1" value={cutTrim} onChange={e => setCutTrim(e.target.value)}/></label></div><label className="cutting-rotation"><input type="checkbox" checked={allowRotation} onChange={e => setAllowRotation(e.target.checked)}/> Dopusti rotaciju komada za 90°</label>{cuttingPlan?.error ? <div className="cutting-plan-warning">{cuttingPlan.error}</div> : cuttingPlan && <><div className="cutting-plan-summary"><div><strong>{cuttingPlan.boards.length}</strong><span>ploča u prijedlogu</span></div><div><strong>{cuttingPlan.unplaced.length}</strong><span>komada nije raspoređeno</span></div><div><strong>{cuttingPlan.boards.reduce((sum, board) => sum + board.placed.length, 0)}</strong><span>komada raspoređeno</span></div><div><strong>{cuttingPlan.boards.reduce((sum, board) => sum + board.offcuts.length, 0)}</strong><span>upotrebljivih ostataka</span></div></div><button type="button" className="button button-secondary cutting-fill-button" onClick={populateCutOutputsFromPlan} disabled={!cuttingPlan.boards.length}>Popuni izlazne stavke iz plana</button>{cuttingPlan.boards.map(board => <div className="cutting-board-preview" key={board.index}><div className="cutting-board-label"><strong>Ploča {board.index}</strong><span>{board.placed.length} komada · {board.offcuts.length} ostataka · iskorištenje površine {board.usableArea ? Math.round(board.placedArea / board.usableArea * 100) : 0}%</span></div><svg viewBox={`0 0 ${selectedCutSource.length} ${selectedCutSource.width}`} role="img" aria-label={`Plan rasporeda na ploči ${board.index}`}><rect x="0" y="0" width={selectedCutSource.length} height={selectedCutSource.width} rx="1" className="cutting-board-outline"/><rect x={Number(cutTrim)} y={Number(cutTrim)} width={Math.max(0, Number(selectedCutSource.length) - Number(cutTrim) * 2)} height={Math.max(0, Number(selectedCutSource.width) - Number(cutTrim) * 2)} className="cutting-board-usable"/>{board.offcuts.map(offcut => <rect key={offcut.id} x={offcut.x + Number(cutTrim)} y={offcut.y + Number(cutTrim)} width={offcut.w} height={offcut.h} className="cutting-offcut-rect"/>)}{board.placed.map(piece => <g key={piece.id}><rect x={piece.x + Number(cutTrim)} y={piece.y + Number(cutTrim)} width={piece.w} height={piece.h} className="cutting-piece-rect"/><text x={piece.x + Number(cutTrim) + piece.w / 2} y={piece.y + Number(cutTrim) + piece.h / 2} textAnchor="middle" dominantBaseline="middle">{piece.name.slice(0, 18)}</text></g>)}</svg></div>)}{cuttingPlan.unplaced.length > 0 && <div className="cutting-plan-warning">Nisu svi komadi stali u raspoložive cijele ploče. Nedostaje raspoloživih ploča ili treba promijeniti raspored / dimenzije.</div>}<p className="cutting-plan-footnote">Ostatci su pravokutni slobodni dijelovi dimenzija najmanje 20 × 20 cm. Provjeri ih fizički prije potvrde pilanja.</p></>}</section>}<div className="form-row"><label>Potrošnja za ovaj rez (broj ploča)<input type="text" inputMode="decimal" placeholder="Npr. 0,2" value={cutForm.usedQty} onChange={e => setCutForm(current => ({ ...current, usedQty: e.target.value }))} required/></label><label>Napomena za postupak<input value={cutForm.note} onChange={e => setCutForm(current => ({ ...current, note: e.target.value }))} placeholder="Opcionalno"/></label></div><div className="cut-outputs-heading"><div><strong>Izlazne stavke</strong><p>Dodaj svaki gotov komad, upotrebljivi ostatak ili otpad.</p></div><button type="button" className="button button-secondary" onClick={addCutOutput}><Plus size={15}/> Dodaj stavku</button></div>{cutForm.outputs.map((output, index) => <section className="cut-output-card" key={output.id}><div className="cut-output-card-head"><strong>Izlazna stavka {index + 1}</strong>{cutForm.outputs.length > 1 && <button type="button" className="icon-button" onClick={() => removeCutOutput(output.id)} aria-label={'Ukloni izlaznu stavku ' + (index + 1)}><X size={16}/></button>}</div><label>Naziv komada / ostatka / otpada<input value={output.name} onChange={e => updateCutOutput(output.id, 'name', e.target.value)} placeholder="Npr. Gazište 1 ili ostatak Bračkog kamena" required/></label><div className="form-row"><label>Vrsta stavke<select value={output.type} onChange={e => updateCutOutput(output.id, 'type', e.target.value)}><option>Gotov komad</option><option>Ostatak</option><option>Otpad</option></select></label><label>Količina (kom)<input type="number" min="1" step="1" value={output.quantity} onChange={e => updateCutOutput(output.id, 'quantity', e.target.value)} required/></label></div>{cutForm.orderId && output.type === 'Gotov komad' && <label>Poveži s naručenim komadom *<select value={output.orderPieceIndex} onChange={e => updateCutOutput(output.id, 'orderPieceIndex', e.target.value)} required><option value="">Odaberi komad iz naloga</option>{(availableOrders.find(order => order.id === cutForm.orderId)?.pieces || []).map((piece, pieceIndex) => { const remaining = Math.max(0, Number(piece.quantity || 0) - Number(piece.producedQuantity || 0)); return <option key={pieceIndex} value={pieceIndex} disabled={remaining === 0}>{piece.name} — preostalo {remaining} od {piece.quantity}</option>; })}</select></label>}<div className="form-row"><label>Dužina (cm)<input type="number" min="0" step="0.1" value={output.length} onChange={e => updateCutOutput(output.id, 'length', e.target.value)} required/></label><label>Širina (cm)<input type="number" min="0" step="0.1" value={output.width} onChange={e => updateCutOutput(output.id, 'width', e.target.value)} required/></label></div><div className="form-row"><label>Debljina (cm)<input type="number" min="0" step="0.1" value={output.thickness || sourceThicknessForCut(materials, cutForm.sourceId)} onChange={e => updateCutOutput(output.id, 'thickness', e.target.value)} required/></label><label>Lokacija<input value={output.location} onChange={e => updateCutOutput(output.id, 'location', e.target.value)} required/></label></div><label>Napomena<input value={output.note} onChange={e => updateCutOutput(output.id, 'note', e.target.value)} placeholder="Opcionalno"/></label></section>)}<div className="modal-note"><Scissors size={16}/><span>Svaki zapis pilanja evidentira stvarnu potrošnju u pločama (npr. 0,2 ili 0,5). Neiskorišteni dio rezervacije vraća se na raspoloživu zalihu; gotovi komadi, ostaci i otpad vode se zasebno.</span></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowCut(false)}>Odustani</button><button type="submit" className="button button-primary"><Check size={16}/> Evidentiraj pilanje</button></div></form></section></div>}
      {movement && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setMovement(null); }}><section className="modal movement-modal" role="dialog" aria-modal="true" aria-labelledby="movement-title"><div className="modal-head"><div><span className="modal-kicker">SKLADIŠNO KRETANJE</span><h2 id="movement-title">{movement.kind}</h2><p>{materials.find(row => row.id === movement.id)?.name}</p></div><button className="icon-button" onClick={() => setMovement(null)} aria-label="Zatvori"><X size={19}/></button></div><form onSubmit={saveMovement}>{movement.kind === 'Prodaja' ? <>{(() => { const item = materials.find(row => row.id === movement.id); const area = Math.max(0, parseQuantity(saleLength) * parseQuantity(saleWidth) / 10000 * parseQuantity(salePieces)); const stockArea = Number(item?.length || 0) * Number(item?.width || 0) / 10000; const deduction = item?.unit === 'm²' ? area : stockArea > 0 ? area / stockArea : 0; const net = area * Number(item?.salePricePerM2 || 0); const vatRate = Number(item?.vatRate ?? 25); const vatAmount = net * vatRate / 100; const total = net + vatAmount; return <><div className="form-row"><label>Duljina prodanog komada (cm)<input type="text" inputMode="decimal" value={saleLength} onChange={e => setSaleLength(e.target.value)} required/></label><label>Širina prodanog komada (cm)<input type="text" inputMode="decimal" value={saleWidth} onChange={e => setSaleWidth(e.target.value)} required/></label></div><label>Broj prodanih komada<input type="number" min="1" step="1" value={salePieces} onChange={e => setSalePieces(e.target.value)} required/></label><div className="sale-calculation"><div><span>Prodana površina</span><strong>{area.toLocaleString('hr-HR',{minimumFractionDigits:2,maximumFractionDigits:4})} m²</strong></div><div><span>Cijena bez PDV-a / m²</span><strong>{Number(item?.salePricePerM2 || 0).toLocaleString('hr-HR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong></div><div><span>Cijena s PDV-om / m²</span><strong>{(Number(item?.salePricePerM2 || 0) * (1 + vatRate / 100)).toLocaleString('hr-HR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong></div><div><span>Iznos bez PDV-a</span><strong>{net.toLocaleString('hr-HR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong></div><div><span>PDV ({vatRate} %)</span><strong>{vatAmount.toLocaleString('hr-HR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong></div><div><span>Ukupno s PDV-om</span><strong>{total.toLocaleString('hr-HR',{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong></div><div><span>Umanjenje zalihe</span><strong>{deduction.toLocaleString('hr-HR',{minimumFractionDigits:2,maximumFractionDigits:4})} {item?.unit === 'm²' ? 'm²' : item?.unit || 'jed.'}</strong></div></div><div className="modal-note"><ClipboardCheck size={16}/><span>Prodana površina računa se iz duljine × širine × broj komada. Zaliha se umanjuje za istu površinu, pretvorenu u dio izvorne ploče/komada. Obračun ne zamjenjuje račun ili fiskalizaciju.</span></div></>; })()}</> : <><label>Količina<input type="text" inputMode="decimal" placeholder="Npr. 0,5" value={movementQty} onChange={e => setMovementQty(e.target.value)} required/></label><div className="modal-note"><ClipboardCheck size={16}/><span>Trenutna količina: {formatQuantity(materials.find(row => row.id === movement.id)?.quantity)}. Podaci se spremaju u ovu preglednicu.</span></div></>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setMovement(null)}>Odustani</button><button type="submit" className="button button-primary"><Check size={16}/> {movement.kind === 'Prodaja' ? 'Potvrdi prodaju' : 'Potvrdi'}</button></div></form></section></div>}
      {toast && <div className="toast"><Check size={17}/>{toast}<button onClick={() => setToast('')} aria-label="Zatvori poruku"><X size={15}/></button></div>}
    </div>
  );
}
