import { useState } from 'react';
import { payBooking } from '../../api/payments';
import { useToast } from '../ui/Toast';

const METHODS = [
  {
    key: 'jazzcash',
    label: 'JazzCash',
    color: '#C8102E',
    tint: 'rgba(200,16,46,0.08)',
    logo: 'JC',
  },
  {
    key: 'easypaisa',
    label: 'Easypaisa',
    color: '#1A9E4B',
    tint: 'rgba(26,158,75,0.08)',
    logo: 'easy',
  },
  {
    key: 'card',
    label: 'Card',
    color: '#1E3A8A',
    tint: 'rgba(30,58,138,0.08)',
    logo: '💳',
  },
];

const fmtAmount = (n) => `PKR ${Number(n || 0).toLocaleString()}`;

export default function PaymentModal({ bookingId, amount, serviceTitle, onClose, onPaid }) {
  const toast = useToast();
  const [method, setMethod] = useState('jazzcash');
  const [mobile, setMobile] = useState('');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' });
  const [status, setStatus] = useState('form'); // 'form' | 'processing' | 'success'

  const active = METHODS.find((m) => m.key === method);
  const isWallet = method === 'jazzcash' || method === 'easypaisa';

  const formatMobile = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
  };
  const formatCardNumber = (v) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const valid = isWallet
    ? mobile.replace(/\D/g, '').length === 11
    : card.number.replace(/\s/g, '').length === 16 && card.expiry.length === 5 && card.cvv.length === 3;

  const handlePay = async () => {
    if (!valid) {
      toast(isWallet ? 'Enter a valid 11-digit mobile number' : 'Enter complete card details', 'error');
      return;
    }
    setStatus('processing');
    try {
      const txn = await payBooking(bookingId, method);
      setStatus('success');
      toast('Payment successful — funds held in escrow', 'success');
      setTimeout(() => onPaid?.(txn), 1500);
    } catch (err) {
      toast(err.message || 'Payment failed', 'error');
      setStatus('form');
    }
  };

  const inputCls =
    'w-full rounded-[8px] border border-ha-border bg-ha-bg px-3 py-2.5 text-sm text-ha-text-1 placeholder-ha-text-3 focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary transition-colors';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-ha-surface rounded-2xl border border-ha-border w-full max-w-md shadow-float overflow-hidden">
        {status === 'success' ? (
          // ─── Success state ──────────────────────────────────────────────
          <div className="p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-ha-teal/10 flex items-center justify-center mb-4">
              <svg className="h-9 w-9 text-ha-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-ha-text-1 font-display">Payment Successful ✅</h2>
            <p className="text-sm text-ha-text-2 mt-2">
              Your payment of <span className="font-mono font-semibold">{fmtAmount(amount)}</span> is held securely
              until the job is completed.
            </p>
            <div className="mt-5 rounded-xl bg-ha-surface-2 border border-ha-border px-4 py-3 text-xs text-ha-text-3 flex items-start gap-2 text-left">
              <span>🔒</span>
              <span>Funds are held in escrow and released to the provider only after you confirm the job is done.</span>
            </div>
          </div>
        ) : (
          // ─── Payment form ───────────────────────────────────────────────
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-ha-border">
              <div>
                <h2 className="text-lg font-bold text-ha-text-1 font-display">Complete Payment</h2>
                {serviceTitle && <p className="text-xs text-ha-text-3 mt-0.5">{serviceTitle}</p>}
              </div>
              <button
                onClick={onClose}
                disabled={status === 'processing'}
                className="text-ha-text-3 hover:text-ha-text-1 transition-colors disabled:opacity-40 p-1"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Amount due */}
              <div className="text-center rounded-xl bg-ha-surface-2 border border-ha-border py-4">
                <p className="text-xs uppercase tracking-wide text-ha-text-3">Amount Due</p>
                <p className="text-3xl font-bold text-ha-text-1 font-mono mt-1">{fmtAmount(amount)}</p>
              </div>

              {/* Method selector */}
              <div>
                <label className="block text-[13px] font-medium text-ha-text-2 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map((m) => {
                    const selected = method === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setMethod(m.key)}
                        className="flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-all"
                        style={{
                          borderColor: selected ? m.color : 'transparent',
                          background: selected ? m.tint : '#F0EAE3',
                        }}
                      >
                        <span
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-extrabold text-white"
                          style={{ background: m.color }}
                        >
                          {m.logo}
                        </span>
                        <span className="text-xs font-semibold text-ha-text-1">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Method-specific fields */}
              {isWallet ? (
                <div className="space-y-1">
                  <label className="block text-[13px] font-medium text-ha-text-2">
                    {active.label} Mobile Account Number
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(formatMobile(e.target.value))}
                    placeholder="0300-1234567"
                    className={`${inputCls} font-mono tracking-wide`}
                  />
                  <p className="text-xs text-ha-text-3 pt-1">
                    You'll receive an OTP on this number to approve the payment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[13px] font-medium text-ha-text-2">Card Number</label>
                    <input
                      type="text"
                      value={card.number}
                      onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
                      placeholder="1234 5678 9012 3456"
                      className={`${inputCls} font-mono tracking-wide`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[13px] font-medium text-ha-text-2">Expiry</label>
                      <input
                        type="text"
                        value={card.expiry}
                        onChange={(e) => setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                        placeholder="MM/YY"
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[13px] font-medium text-ha-text-2">CVV</label>
                      <input
                        type="password"
                        value={card.cvv}
                        onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                        placeholder="•••"
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pay button */}
              <button
                type="button"
                onClick={handlePay}
                disabled={status === 'processing'}
                className="w-full rounded-[8px] py-3 text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                style={{ background: active.color }}
              >
                {status === 'processing' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  `Pay ${fmtAmount(amount)}`
                )}
              </button>

              <p className="text-[11px] text-ha-text-3 text-center leading-relaxed flex items-center justify-center gap-1.5">
                <span>🔒</span>
                Funds are held in escrow and released to the provider only after you confirm the job is done.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
