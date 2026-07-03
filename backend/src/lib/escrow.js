const pool = require('./db');

// Platform fee taken from every completed booking.
const COMMISSION_RATE = 0.15;

const round2 = (n) => Math.round(n * 100) / 100;

// Split a gross amount into the platform commission and the provider payout.
function splitAmount(amount) {
  const commission = round2(amount * COMMISSION_RATE);
  const providerPayout = round2(amount - commission);
  return { commission, providerPayout };
}

// Release a booking's held escrow to the provider's wallet.
// Returns the released transaction row, or null if there was nothing held.
async function releaseEscrow(bookingId) {
  const { rows } = await pool.query(
    `SELECT * FROM transactions WHERE booking_id = $1 AND status = 'held' LIMIT 1`,
    [bookingId]
  );
  if (rows.length === 0) return null;
  const txn = rows[0];

  await pool.query(
    `UPDATE transactions SET status = 'released', released_at = NOW() WHERE id = $1`,
    [txn.id]
  );
  await pool.query(
    `UPDATE providers SET wallet_balance = wallet_balance + $1, total_earned = total_earned + $1 WHERE id = $2`,
    [txn.provider_payout, txn.provider_id]
  );
  await pool.query(
    `UPDATE bookings SET payment_status = 'released' WHERE id = $1`,
    [bookingId]
  );
  return txn;
}

// Refund a booking's held escrow back to the customer (mock — no money moves).
// Used when a provider declines or the customer cancels after paying.
async function refundEscrow(bookingId) {
  const { rows } = await pool.query(
    `SELECT * FROM transactions WHERE booking_id = $1 AND status = 'held' LIMIT 1`,
    [bookingId]
  );
  if (rows.length === 0) return null;
  const txn = rows[0];

  await pool.query(`UPDATE transactions SET status = 'refunded' WHERE id = $1`, [txn.id]);
  await pool.query(`UPDATE bookings SET payment_status = 'unpaid' WHERE id = $1`, [bookingId]);
  return txn;
}

module.exports = { COMMISSION_RATE, splitAmount, releaseEscrow, refundEscrow };
