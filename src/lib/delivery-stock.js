export function applyDeliveryToFinishedProducts(delivery, products = [], movements = []) {
  const linked = (delivery?.items || []).filter(item => item.productId);
  if (!linked.length) return { products, movements, applied: 0 };
  if (movements.some(move => move.deliveryId === delivery.id && move.kind === 'Isporuka gotovog proizvoda')) {
    throw new Error('Ova otpremnica već je proknjižena na zalihu.');
  }

  const nextProducts = products.map(product => ({ ...product, transactions: [...(product.transactions || [])] }));
  const nextMovements = [...movements];
  let applied = 0;
  for (const line of linked) {
    const product = nextProducts.find(item => item.id === line.productId);
    if (!product) throw new Error('Odabrani gotovi proizvod više ne postoji u zalihi.');
    const quantity = Number(line.quantity);
    const available = Number(product.stockQuantity ?? (['Ugrađen', 'Prodano'].includes(product.status) ? 0 : product.quantity));
    if (!(quantity > 0) || quantity - available > 0.0005) {
      throw new Error('Nema dovoljno zalihe za proizvod: ' + product.name + '. Raspoloživo: ' + available + ' ' + (product.unit || 'kom') + '.');
    }
    if (line.unit && product.unit && line.unit !== product.unit) {
      throw new Error('Jedinica stavke ne odgovara jedinici gotovog proizvoda: ' + product.name + '.');
    }
    const remaining = Math.max(0, Number((available - quantity).toFixed(4)));
    const transactionId = delivery.id + '-' + line.quoteLineId;
    const operationId = 'DELIVERY-' + delivery.id;
    product.stockQuantity = remaining;
    product.soldQuantity = Number(product.soldQuantity || 0) + quantity;
    product.status = remaining === 0 ? 'Prodano' : product.status;
    product.transactions.push({
      id: transactionId,
      operationId,
      kind: 'Isporuka gotovog proizvoda',
      quantity,
      previousQuantity: available,
      nextQuantity: remaining,
      reason: 'Otpremnica ' + delivery.number,
      date: delivery.date,
      deliveryId: delivery.id
    });
    product.updatedAt = new Date().toISOString();
    nextMovements.unshift({
      id: transactionId,
      operationId,
      material: product.name,
      kind: 'Isporuka gotovog proizvoda',
      quantity,
      reason: 'Otpremnica ' + delivery.number,
      location: product.location || '',
      date: delivery.date,
      productId: product.id,
      orderId: delivery.orderId || product.orderId || '',
      deliveryId: delivery.id,
      deliveryNumber: delivery.number
    });
    applied += quantity;
  }
  return { products: nextProducts, movements: nextMovements, applied };
}
