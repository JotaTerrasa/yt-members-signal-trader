export function exchangeProtectionGaps(positions = []) {
  const open = Array.isArray(positions) ? positions : [];
  return {
    withoutStopLoss: open.filter((position) => !hasStopLossProtection(position)),
    withoutTakeProfit: open.filter((position) => !hasTakeProfitProtection(position))
  };
}

export function hasStopLossProtection(position = {}) {
  return Number(position.stopLoss || 0) > 0
    || (Array.isArray(position.protectiveOrders) && position.protectiveOrders.some((order) => (
      String(order.type || '').toUpperCase().includes('STOP')
      && !String(order.type || '').toUpperCase().includes('TAKE_PROFIT')
      && Number(order.stopPrice || 0) > 0
    )));
}

export function hasTakeProfitProtection(position = {}) {
  return Number(position.takeProfit || 0) > 0
    || (Array.isArray(position.protectiveOrders) && position.protectiveOrders.some((order) => (
      String(order.type || '').toUpperCase().includes('TAKE_PROFIT')
      && Number(order.stopPrice || 0) > 0
    )));
}
