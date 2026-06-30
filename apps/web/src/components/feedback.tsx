'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
type ToastTipo = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tipo: ToastTipo;
  mensagem: string;
}

interface FeedbackCtx {
  toast: (mensagem: string, tipo?: ToastTipo) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
}

const Ctx = createContext<FeedbackCtx | null>(null);

export function useFeedback(): FeedbackCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFeedback deve ser usado dentro de <FeedbackProvider>');
  return ctx;
}

interface ConfirmOptions {
  titulo: string;
  mensagem?: string;
  confirmar?: string;
  cancelar?: string;
  perigo?: boolean;
}

interface PromptOptions extends ConfirmOptions {
  placeholder?: string;
  obrigatorio?: boolean;
  valorInicial?: string;
}

interface DialogState {
  modo: 'confirm' | 'prompt';
  opts: ConfirmOptions & PromptOptions;
  resolve: (v: boolean | string | null) => void;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState('');

  const toast = useCallback((mensagem: string, tipo: ToastTipo = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tipo, mensagem }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        modo: 'confirm',
        opts,
        resolve: (v) => resolve(Boolean(v)),
      });
    });
  }, []);

  const prompt = useCallback((opts: PromptOptions) => {
    setValor(opts.valorInicial ?? '');
    setErro('');
    return new Promise<string | null>((resolve) => {
      setDialog({
        modo: 'prompt',
        opts,
        resolve: (v) => resolve(typeof v === 'string' ? v : null),
      });
    });
  }, []);

  const fechar = (resultado: boolean | string | null) => {
    dialog?.resolve(resultado);
    setDialog(null);
    setValor('');
    setErro('');
  };

  const value = useMemo(() => ({ toast, confirm, prompt }), [toast, confirm, prompt]);

  return (
    <Ctx.Provider value={value}>
      {children}

      {/* Toasts */}
      <div className="fixed right-4 top-4 z-[100] flex w-80 max-w-[90vw] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`rounded-lg px-4 py-3 text-sm shadow-lg ring-1 ${
              t.tipo === 'success'
                ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                : t.tipo === 'error'
                  ? 'bg-red-50 text-red-800 ring-red-200'
                  : 'bg-slate-50 text-slate-800 ring-slate-200'
            }`}
          >
            {t.mensagem}
          </div>
        ))}
      </div>

      {/* Modal de confirmação/prompt */}
      {dialog && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
          onClick={() => fechar(dialog.modo === 'prompt' ? null : false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900">{dialog.opts.titulo}</h3>
            {dialog.opts.mensagem && (
              <p className="mt-2 text-sm text-slate-600">{dialog.opts.mensagem}</p>
            )}

            {dialog.modo === 'prompt' && (
              <div className="mt-4">
                <textarea
                  autoFocus
                  className="input min-h-[90px] w-full"
                  placeholder={dialog.opts.placeholder}
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
                {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="btn-ghost"
                onClick={() => fechar(dialog.modo === 'prompt' ? null : false)}
              >
                {dialog.opts.cancelar ?? 'Cancelar'}
              </button>
              <button
                className={dialog.opts.perigo ? 'btn-danger' : 'btn-primary'}
                onClick={() => {
                  if (dialog.modo === 'prompt') {
                    if (dialog.opts.obrigatorio && !valor.trim()) {
                      setErro('Campo obrigatório');
                      return;
                    }
                    fechar(valor);
                  } else {
                    fechar(true);
                  }
                }}
              >
                {dialog.opts.confirmar ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
