/**
 * Format a date as a human-readable relative time string.
 * e.g., "Just now", "5m ago", "3h ago", "2d ago", "Jan 15"
 *
 * @param {string|Date} dateStr - The date to format
 * @returns {string} Human-readable relative time
 */
export function timeAgo(dateStr) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/**
 * Format a date as a short display string.
 * e.g., "Jan 15, 2024"
 */
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date as a short date without year.
 * e.g., "Jan 15"
 */
export function formatShortDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
