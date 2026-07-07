'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

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

const toastStyles: Record<ToastTipo, { box: string; icon: typeof CheckCircle2 }> = {
  success: { box: 'border-border bg-surface-elevated text-success-700', icon: CheckCircle2 },
  error: { box: 'border-danger/30 bg-surface-elevated text-danger-700', icon: AlertCircle },
  info: { box: 'border-border bg-surface-elevated text-ink-muted', icon: Info },
};

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

      <div className="fixed right-4 top-4 z-[100] flex w-[min(20rem,90vw)] flex-col gap-2">
        {toasts.map((t) => {
          const style = toastStyles[t.tipo];
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              role="status"
              className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-sm ${style.box}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="leading-relaxed">{t.mensagem}</span>
            </div>
          );
        })}
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4"
          onClick={() => fechar(dialog.modo === 'prompt' ? null : false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-surface-elevated p-6 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold text-ink">{dialog.opts.titulo}</h3>
            {dialog.opts.mensagem && (
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{dialog.opts.mensagem}</p>
            )}

            {dialog.modo === 'prompt' && (
              <div className="mt-5">
                <textarea
                  autoFocus
                  className="textarea w-full"
                  placeholder={dialog.opts.placeholder}
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
                {erro && <p className="mt-1.5 text-xs text-danger">{erro}</p>}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-2.5">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => fechar(dialog.modo === 'prompt' ? null : false)}
              >
                {dialog.opts.cancelar ?? 'Cancelar'}
              </button>
              <button
                type="button"
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
