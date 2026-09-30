'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
  type ReactNode,
} from 'react';

export type PublicLocale = 'tr' | 'en' | 'ar';
export type DisplayCurrency = 'USD' | 'TRY' | 'EUR' | 'SAR' | 'KWD';

export const localeCodes: Record<PublicLocale, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  ar: 'ar-SA',
};

// Display estimates only. Checkout and all order records remain USD.
const displayRates: Record<DisplayCurrency, number> = {
  USD: 1,
  TRY: 42,
  EUR: 0.86,
  SAR: 3.75,
  KWD: 0.31,
};

type PreferencesContextValue = {
  locale: PublicLocale;
  currency: DisplayCurrency;
  setLocale: (value: PublicLocale) => void;
  setCurrency: (value: DisplayCurrency) => void;
  formatUsd: (amountUsd: number) => string;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PublicPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<PublicLocale>('tr');
  const [currency, setCurrencyState] = useState<DisplayCurrency>('USD');

  // Okuma hidrasyondan sonraya ertelenir; böylece sunucu çıktısıyla uyuşmazlık
  // oluşmaz. requestAnimationFrame kullanılmaz: arka plandaki sekmelerde hiç
  // tetiklenmez ve kullanıcı sekmeye dönene kadar kayıtlı dil uygulanmazdı.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedLocale = window.localStorage.getItem('ravza-locale');
      const savedCurrency = window.localStorage.getItem('ravza-currency');
      if (savedLocale === 'tr' || savedLocale === 'en' || savedLocale === 'ar')
        setLocaleState(savedLocale);
      if (
        savedCurrency === 'USD' ||
        savedCurrency === 'TRY' ||
        savedCurrency === 'EUR' ||
        savedCurrency === 'SAR' ||
        savedCurrency === 'KWD'
      )
        setCurrencyState(savedCurrency);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  // Kalıcılık yalnız kullanıcı gerçekten seçim yaptığında yazılır. Efekt
  // içinden yazmak, ilk render'daki varsayılan değerin kayıtlı tercihi
  // ezmesine yol açıyordu.
  const setLocale = useCallback((value: PublicLocale) => {
    setLocaleState(value);
    window.localStorage.setItem('ravza-locale', value);
  }, []);

  const setCurrency = useCallback((value: DisplayCurrency) => {
    setCurrencyState(value);
    window.localStorage.setItem('ravza-currency', value);
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      locale,
      currency,
      setLocale,
      setCurrency,
      formatUsd(amountUsd) {
        return new Intl.NumberFormat(localeCodes[locale], {
          style: 'currency',
          currency,
          maximumFractionDigits: currency === 'KWD' ? 3 : 0,
        }).format(amountUsd * displayRates[currency]);
      },
    }),
    [currency, locale, setCurrency, setLocale],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePublicPreferences() {
  const value = useContext(PreferencesContext);
  if (!value)
    throw new Error('usePublicPreferences must be used inside its provider');
  return value;
}

export function PublicPreferenceControls({
  dark = false,
  idPrefix = 'public',
}: {
  dark?: boolean;
  idPrefix?: string;
}) {
  const { locale, currency, setLocale, setCurrency } = usePublicPreferences();
  const controlClass = dark
    ? 'border-white/15 bg-white/10 text-white'
    : 'border-border bg-white/80 text-foreground';
  const groupLabel = {
    tr: 'Dil ve para birimi',
    en: 'Language and currency',
    ar: 'اللغة والعملة',
  }[locale];

  return (
    <div className="flex items-center gap-1.5" aria-label={groupLabel}>
      <label className="sr-only" htmlFor={`${idPrefix}-language`}>
        Language
      </label>
      <select
        id={`${idPrefix}-language`}
        value={locale}
        onChange={(event) => setLocale(event.target.value as PublicLocale)}
        className={`h-9 rounded-lg border px-2 text-xs font-semibold outline-none ${controlClass}`}
      >
        <option value="tr">TR</option>
        <option value="en">EN</option>
        <option value="ar">العربية</option>
      </select>
      <label className="sr-only" htmlFor={`${idPrefix}-currency`}>
        Currency
      </label>
      <select
        id={`${idPrefix}-currency`}
        value={currency}
        onChange={(event) => setCurrency(event.target.value as DisplayCurrency)}
        className={`h-9 rounded-lg border px-2 text-xs font-semibold outline-none ${controlClass}`}
      >
        {(['USD', 'TRY', 'EUR', 'SAR', 'KWD'] as const).map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </div>
  );
}
