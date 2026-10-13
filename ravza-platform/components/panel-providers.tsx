'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { PublicPreferencesProvider } from '@/components/public-preferences';

type CreditSummary = {
  source: 'rawdahbooking';
  remaining: number;
  fetchedAt: string;
};
type CreditState = {
  summary: CreditSummary | null;
  loading: boolean;
  failed: boolean;
  refresh: () => void;
};
const CreditContext = createContext<CreditState | null>(null);

export function PanelProviders({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const pending = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setFailed(false);
    setSummary(null);
    fetch('/api/credits/summary', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('credit_summary_unavailable');
        const value = (await response.json()) as CreditSummary;
        if (
          value.source !== 'rawdahbooking' ||
          !Number.isFinite(value.remaining) ||
          value.remaining < 0 ||
          !Number.isFinite(Date.parse(value.fetchedAt))
        ) {
          throw new Error('invalid_credit_summary');
        }
        if (!controller.signal.aborted) setSummary(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      pending.current?.abort();
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  return (
    <PublicPreferencesProvider>
      <CreditContext.Provider value={{ summary, loading, failed, refresh }}>
        {children}
      </CreditContext.Provider>
    </PublicPreferencesProvider>
  );
}

export function useCreditSummary() {
  const value = useContext(CreditContext);
  if (!value)
    throw new Error('useCreditSummary must be used inside PanelProviders');
  return value;
}
