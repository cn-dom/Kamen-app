export function getMaterialLineage(item, materials = []) {
  if (!item?.id) return [];
  const byId = new Map((Array.isArray(materials) ? materials : []).map(row => [row.id, row]));
  const chain = [];
  const visited = new Set();
  let current = item;
  while (current && current.id && !visited.has(current.id)) {
    visited.add(current.id);
    chain.unshift({
      id: current.id,
      name: current.name || 'Materijal',
      form: current.form || '',
      length: Number(current.length || 0),
      width: Number(current.width || 0),
      location: current.location || ''
    });
    current = current.parentMaterialId ? byId.get(current.parentMaterialId) : null;
  }
  return chain;
}

export function getMaterialOriginId(item) {
  if (!item?.id) return '';
  return String(item.originMaterialId || item.sourceMaterialId || item.parentMaterialId || item.id);
}
