'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Phone, X } from 'lucide-react';

import {
  OrderAssistant,
  type AssistantPackage,
} from '@/components/order-assistant';
import { usePublicPreferences } from '@/components/public-preferences';

const copy = {
  tr: {
    open: 'Sipariş asistanını aç',
    cta: 'Sipariş ver',
    close: 'Kapat',
    dialog: 'Sipariş asistanı',
    phone: 'Telefonla ara',
  },
  en: {
    open: 'Open the order assistant',
    cta: 'Order',
    close: 'Close',
    dialog: 'Order assistant',
    phone: 'Call us',
  },
  ar: {
    open: 'افتح مساعد الطلب',
    cta: 'اطلب الآن',
    close: 'إغلاق',
    dialog: 'مساعد الطلب',
    phone: 'اتصل بنا',
  },
};

/**
 * Sabit sipariş düğmesi ve panel. Telefon kanalı yalnız `.env` içinde
 * numara tanımlıysa görünür; çalışmayan bir numara yayımlamak
 * kullanıcıyı yanıltır.
 */
export function OrderAssistantLauncher({
  packages,
  phone,
}: {
  packages: AssistantPackage[];
  phone: string;
}) {
  const { locale } = usePublicPreferences();
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const panelRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Tek seferlik nazik hatırlatma. Hareket tercihi kapalıysa hiç oynamaz.
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const timer = window.setTimeout(() => {
      setNudge(true);
      window.setTimeout(() => setNudge(false), 900);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    // Temizlikte ref'e dokunmamak için düğüm efekt içinde kopyalanır.
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    panel?.querySelector<HTMLElement>('button, a, input')?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([tabindex="-1"]), textarea, select',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      (previous ?? trigger)?.focus();
    };
  }, [open]);

  return (
    <>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-[#071c14]/40 backdrop-blur-[2px] sm:bg-transparent sm:backdrop-blur-0"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Odak tuzağı ve Esc davranışı elle yönetildiği için `showModal`
              yerine açık `dialog` kullanılır; konumlandırma sınıflardan gelir. */}
          <dialog
            ref={panelRef}
            open
            aria-modal="true"
            aria-label={t.dialog}
            className="fixed inset-0 z-50 m-0 flex max-h-none w-auto max-w-none flex-col overflow-hidden border-0 bg-card p-0 text-foreground sm:inset-auto sm:bottom-24 sm:end-5 sm:h-[min(38rem,calc(100svh-8rem))] sm:w-[24rem] sm:rounded-3xl sm:border sm:border-border sm:shadow-[0_1.5rem_4rem_rgba(7,28,20,.28)]"
          >
            <OrderAssistant
              packages={packages}
              onClose={() => setOpen(false)}
            />
          </dialog>
        </>
      ) : null}

      <div className="fixed bottom-5 end-5 z-40 flex flex-col items-end gap-2 print:hidden">
        {phone ? (
          <a
            href={`tel:${phone.replace(/\s/g, '')}`}
            aria-label={t.phone}
            className="grid size-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-[0_.5rem_1.5rem_rgba(20,38,28,.18)] transition hover:bg-muted"
          >
            <Phone className="size-4" />
          </a>
        ) : null}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? t.close : t.open}
          aria-expanded={open}
          className={`inline-flex min-h-13 items-center gap-2 rounded-full bg-[#0a2e1f] px-5 text-sm font-medium text-white shadow-[0_.75rem_2rem_rgba(10,46,31,.35)] transition-transform duration-300 hover:bg-[#123d2b] ${
            nudge ? '-translate-y-1.5' : ''
          }`}
        >
          {open ? (
            <X className="size-5" />
          ) : (
            <>
              <MessageCircle className="size-5" />
              <span>{t.cta}</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
