import { useState, useEffect, useRef, useCallback } from 'react';
import { getMessages, sendMessage } from '../../api/messages';
import { supabase, realtimeEnabled } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import Skeleton from '../ui/Skeleton';
import CallPanel from './CallPanel';

const POLL_INTERVAL_MS = 4000;

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-PK', { timeStyle: 'short' });
}

export default function ChatPanel({ bookingId }) {
  const { user } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  // Keep the newest message in view whenever the list grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Authoritative fetch — always goes through the ownership-checked backend.
  const load = useCallback(
    (showSkeleton = false) => {
      if (showSkeleton) setLoading(true);
      return getMessages(bookingId)
        .then(setMessages)
        .catch(() => toast('Failed to load messages', 'error'))
        .finally(() => showSkeleton && setLoading(false));
    },
    [bookingId, toast]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  // Realtime when configured: the Supabase event is only a "something changed"
  // signal — we never trust its payload, we refetch through the secure backend.
  // No anon key? Fall back to a light poll so chat still updates on its own.
  useEffect(() => {
    if (realtimeEnabled && supabase) {
      const channel = supabase
        .channel(`messages:booking:${bookingId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
          () => load(false)
        )
        .subscribe();
      return () => supabase.removeChannel(channel);
    }

    const id = setInterval(() => load(false), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [bookingId, load]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const created = await sendMessage(bookingId, content);
      setDraft('');
      // Optimistically append so the sender sees it instantly, avoiding a
      // duplicate if the realtime refetch also lands (dedupe by id).
      setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-ha-border bg-ha-surface-2 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-ha-border bg-ha-surface">
        <svg className="h-4 w-4 text-ha-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.83L3 20l1.13-3.39A7.87 7.87 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-sm font-semibold text-ha-text-1">Chat</p>
        {!realtimeEnabled && (
          <span className="text-[10px] text-ha-text-3" title="Realtime not configured — updating every few seconds">
            auto-refresh
          </span>
        )}
        <div className="ml-auto">
          <CallPanel bookingId={bookingId} />
        </div>
      </div>

      <div ref={scrollRef} className="h-64 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-2/3 rounded-lg" />
            <Skeleton className="h-8 w-1/2 rounded-lg ml-auto" />
            <Skeleton className="h-8 w-3/5 rounded-lg" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-2xl mb-1">💬</div>
            <p className="text-sm text-ha-text-3">No messages yet — say hello!</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? 'bg-ha-primary text-white rounded-br-sm'
                      : 'bg-ha-surface border border-ha-border text-ha-text-1 rounded-bl-sm'
                  }`}
                >
                  {!mine && <p className="text-[11px] font-semibold text-ha-text-3 mb-0.5">{m.senderName}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                </div>
                <span className="text-[10px] text-ha-text-3 mt-0.5 px-1">{formatTime(m.createdAt)}</span>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-ha-border bg-ha-surface px-3 py-2.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          maxLength={2000}
          className="flex-1 rounded-[6px] border border-ha-border bg-ha-bg px-3 py-2 text-sm text-ha-text-1 placeholder-ha-text-3 focus:outline-none focus:ring-2 focus:ring-ha-primary/20 focus:border-ha-primary"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="inline-flex items-center justify-center rounded-[6px] bg-ha-primary hover:bg-ha-primary-hover text-white h-9 w-9 flex-shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}
