/**
 * formatINR — Indian Rupee currency formatting shared across services.
 * Usage: formatINR(1500000) → "₹15,00,000"
 */
function formatINR(value, maximumFractionDigits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits })}`;
}

module.exports = { formatINR };
