/**
 * formatCompactINR — compact Indian Rupee formatting for large figures.
 *
 * Indian convention: lakhs (1,00,000) and crores (1,00,00,000).
 *   formatCompactINR(150000)   → "₹1.5L"
 *   formatCompactINR(12500000) → "₹1.25Cr"
 *   formatCompactINR(4250)     → "₹4,250"
 */
export function formatCompactINR(value) {
  if (value === null || value === undefined || isNaN(Number(value))) return '—';
  const num = Number(value);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(abs % 10000000 === 0 ? 0 : 2).replace(/\.?0+$/, '')}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(abs % 100000 === 0 ? 0 : 2).replace(/\.?0+$/, '')}L`;
  return `${sign}₹${num.toLocaleString('en-IN')}`;
}
