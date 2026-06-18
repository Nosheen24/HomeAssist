import { useState, useRef, useEffect } from 'react';

const MAX_HISTORY = 6;

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="h-7 w-7 rounded-full bg-ha-surface-2 border border-ha-border flex items-center justify-center flex-shrink-0">
        <svg className="h-3.5 w-3.5 text-ha-teal" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
        </svg>
      </div>
      <div className="bg-ha-surface-2 border border-ha-border rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="h-1.5 w-1.5 rounded-full bg-ha-text-3 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 rounded-full bg-ha-text-3 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 rounded-full bg-ha-text-3 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-ha-surface-2 border border-ha-border flex items-center justify-center flex-shrink-0">
          <svg className="h-3.5 w-3.5 text-ha-teal" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </svg>
        </div>
      )}
      <div
        className={`max-w-[75%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'rounded-2xl rounded-br-sm bg-ha-primary text-white'
            : 'rounded-2xl rounded-bl-sm bg-ha-surface-2 border border-ha-border text-ha-text-2'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

export default function FAQChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, open, loading]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'Hi! I\'m the HomeAssist assistant. Ask me anything about our services, bookings, or how the platform works.',
      }]);
    }
  }, [open]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = { role: 'user', content: input.trim() };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');
    setLoading(true);
    const history = updated.slice(-MAX_HISTORY).map(({ role, content }) => ({ role, content }));
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I\'m having trouble connecting. Please try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="bg-ha-bg border border-ha-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ width: 380, height: 500 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ha-border bg-ha-surface flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-ha-surface-2 border border-ha-border flex items-center justify-center">
                  <svg className="h-4 w-4 text-ha-text-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-ha-teal border-2 border-ha-surface" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ha-text-1 leading-none">HomeAssist Assistant</p>
                <p className="text-xs text-ha-teal mt-0.5">Online</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-7 w-7 rounded-full flex items-center justify-center text-ha-text-3 hover:text-ha-text-1 hover:bg-ha-surface-2 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0 bg-ha-bg">
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-ha-border bg-ha-surface flex-shrink-0">
            <div className="flex items-end gap-2 bg-ha-surface-2 border border-ha-border rounded-[6px] px-3 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-ha-text-1 placeholder-ha-text-3 resize-none outline-none max-h-24 leading-5 py-0.5"
                style={{ minHeight: '20px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="h-7 w-7 rounded-[4px] flex items-center justify-center flex-shrink-0 bg-ha-primary hover:bg-ha-primary-hover disabled:opacity-40 disabled:bg-ha-surface-2 transition-colors"
              >
                <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs text-ha-text-3 mt-2">HomeAssist · Powered by Claude AI</p>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-14 w-14 rounded-full bg-ha-primary hover:bg-ha-primary-hover shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        aria-label="Open FAQ chatbot"
      >
        {open ? (
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
