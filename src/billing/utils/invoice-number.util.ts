export function generateInvoiceNumber(prefix = 'INV'): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  // Simple sequence based on timestamp; production should use a DB-backed sequence
  const seq = Math.floor(now.getTime() / 1000) % 1000000; // last 6 digits
  return `${prefix}-${year}-${seq.toString().padStart(6, '0')}`;
}

