// All dates in Firestore are stored as ISO strings 'YYYY-MM-DD' (no time
// component) so date-only comparisons stay simple and timezone-safe.

export function todayStr() {
  return toDateStr(new Date());
}

export function toDateStr(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

// Positive => vade geçti (overdue). 0 => bugün vadesi. Negative => henüz gelmedi.
export function daysPastDue(dueDateStr) {
  const due = new Date(dueDateStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  const diffMs = today.getTime() - due.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatDateTR(dateStr) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

export function formatCurrencyTR(amount) {
  const n = Number(amount || 0);
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}
