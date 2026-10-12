export const CATEGORIES = ['Rice', 'Flour', 'Oil', 'Packaging', 'Equipment', 'Services', 'Logistics'];

export const UNITS = ['kg', 'litre', 'unit', 'bag', 'sack', 'can', 'roll', 'set', 'ton'];

export const PRODUCT_STATUSES = ['available', 'low_stock', 'out_of_stock', 'discontinued'];

export const PRODUCT_STATUS_COLORS = {
  available: { bg: 'rgba(46,125,50,0.12)', color: 'success.main' },
  low_stock: { bg: 'rgba(230,81,0,0.12)', color: 'warning.main' },
  out_of_stock: { bg: 'rgba(198,40,40,0.12)', color: 'error.main' },
  discontinued: { bg: 'rgba(0,0,0,0.08)', color: 'text.secondary' },
};

export const URGENCY_COLORS = {
  low: { bg: 'rgba(46,125,50,0.12)', text: 'success.main' },
  medium: { bg: 'rgba(230,81,0,0.12)', text: 'warning.main' },
  high: { bg: 'rgba(198,40,40,0.12)', text: 'error.main' },
  critical: { bg: 'rgba(106,27,154,0.12)', text: 'secondary.main' },
};

export const ROLE_COLORS = {
  admin: { bg: 'rgba(99,102,241,0.12)', color: 'primary.main' },
  officer: { bg: 'rgba(46,125,50,0.12)', color: 'success.main' },
  manager: { bg: 'rgba(230,81,0,0.12)', color: 'warning.main' },
};
