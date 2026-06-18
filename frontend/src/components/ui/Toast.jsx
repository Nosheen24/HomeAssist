import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const CONFIGS = {
  success: {
    wrap: 'bg-ha-teal/10 border-ha-teal/40',
    icon: 'text-ha-teal',
    path: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
  },
  error: {
    wrap: 'bg-ha-danger/10 border-ha-danger/40',
    icon: 'text-ha-danger',
    path: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z',
  },
  info: {
    wrap: 'bg-ha-surface border-ha-border',
    icon: 'text-ha-text-2',
    path: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const cfg = CONFIGS[toast.type] || CONFIGS.info;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto animate-toast-in flex items-start gap-3 border shadow-xl rounded-[6px] px-4 py-3 min-w-[280px] max-w-sm ${cfg.wrap}`}
            >
              <svg className={`h-5 w-5 flex-shrink-0 mt-0.5 ${cfg.icon}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d={cfg.path} clipRule="evenodd" />
              </svg>
              <p className="text-sm text-ha-text-1 flex-1">{toast.message}</p>
              <button
                onClick={() => remove(toast.id)}
                className="flex-shrink-0 text-ha-text-3 hover:text-ha-text-2 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.addToast;
}
