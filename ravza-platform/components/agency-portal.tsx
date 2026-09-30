'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Loader2, QrCode, RefreshCw, Send, Wallet } from 'lucide-react';

import { ChatAvailability, type AvailabilitySelection } from '@/components/chat-availability';
import { emptyVisit } from '@/lib/visit-conversation';

type Me = {
  agency: { companyName: string; contactName: string; contactEmail: string };
  member: { fullName: string; email: string; role: 'owner' | 'staff' };
  balance: number;
  enabled: boolean;
  requests: Array<{ id: string; quantity: number; note: string | null; status: string; approvedQuantity: number | null; decisionNote: string | null; createdAt: number }>;
  bookings: Array<{ id: string; groupName: string; gender: 'female' | 'male'; dateKey: string; timeSlot: string; quantity: number; status: string; shareUrl: string | null; createdAt: number; qr: { total: number; withQr: number } | null }>;
  ledger: Array<{ id: string; amount: number; type: string; note: string | null; createdAt: number }>;
};

const nf = new Intl.NumberFormat('tr-TR');
const dateTime = (ms: number) =>
  new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' }).format(new Date(ms));

const requestStatus: Record<string, [string, string]> = {
  pending: ['Onay bekliyor', 'bg-amber-100 text-amber-900'],
  approved: ['Onaylandı', 'bg-[color:var(--success)]/12 text-[color:var(--success)]'],
  rejected: ['Reddedildi', 'bg-[#fbeee9] text-[#9f432b]'],
  cancelled: ['İptal', 'bg-muted text-muted-foreground'],
};
const bookingStatus: Record<string, [string, string]> = {
  shared: ['QR bağlantısı hazır', 'bg-[color:var(--success)]/12 text-[color:var(--success)]'],
  purchased: ['Satın alındı · bağlantı bekleniyor', 'bg-amber-100 text-amber-900'],
  purchasing: ['İşleniyor', 'bg-amber-100 text-amber-900'],
  unknown: ['Kontrol ediliyor', 'bg-amber-100 text-amber-900'],
  failed: ['Alınamadı · kontör iade', 'bg-muted text-muted-foreground'],
};
const ledgerLabel: Record<string, string> = {
  allocation: 'Kontör yüklemesi',
  consumption: 'Randevu',
  refund: 'İade',
  adjustment: 'Düzeltme',
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-black/5 bg-white p-5 ${className}`}>{children}</section>;
}

function BookingForm({ me, onDone }: { me: Me; onDone: () => void }) {
  const [female, setFemale] = useState('0');
  const [male, setMale] = useState('0');
  const [groupName, setGroupName] = useState('');
  const [selection, setSelection] = useState<AvailabilitySelection | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const f = Math.max(0, Math.floor(Number(female) || 0));
  const m = Math.max(0, Math.floor(Number(male) || 0));
  const total = f + m;
  const complete = selection && (f === 0 || selection.female) && (m === 0 || selection.male);
  const enough = total <= me.balance;

  async function purchase() {
    if (!selection) return;
    setBusy(true);
    setConfirming(false);
    setMessage(null);
    try {
      const response = await fetch('/api/agency/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
          groupName,
          dateKey: selection.date,
          female: f > 0 && selection.female ? { timeSlot: selection.female.timeSlot, count: f } : null,
          male: m > 0 && selection.male ? { timeSlot: selection.male.timeSlot, count: m } : null,
        }),
      });
      const payload = (await response.json()) as { error?: string; results?: Array<{ gender: string; status: string }> };
      if (!response.ok) {
        setMessage({ tone: 'warn', text: payload.error ?? 'İşlem tamamlanamadı.' });
        return;
      }
      const results = payload.results ?? [];
      const okCount = results.filter((item) => item.status === 'shared').length;
      const failed = results.filter((item) => item.status === 'failed' || item.status === 'insufficient').length;
      setMessage(
        failed
          ? { tone: 'warn', text: `${failed} grup alınamadı (saat dolmuş olabilir); kontörü iade edildi. Başka bir saat seçip tekrar deneyin.` }
          : okCount === results.length
            ? { tone: 'ok', text: 'Randevu alındı. QR bağlantıları aşağıdaki listede. QR kodları randevudan 2 saat önce bağlantıda görünür.' }
            : { tone: 'warn', text: 'Randevu alındı; bağlantı birazdan hazır olacak. Listeden "QR bağlantılarını yenile"ye basabilirsiniz.' },
      );
      setSelection(null);
      setFemale('0');
      setMale('0');
      setGroupName('');
    } catch {
      setMessage({ tone: 'warn', text: 'Bağlantı koptu. Tekrar satın almadan önce aşağıdaki listeyi kontrol edin.' });
    } finally {
      setBusy(false);
      onDone();
    }
  }

  const input = 'mt-1 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm';
  return (
    <Card>
      <h2 className="flex items-center gap-2 text-base font-semibold"><QrCode className="size-5" /> Randevu al ve QR oluştur</h2>
      <p className="mt-1 text-xs text-muted-foreground">Kişi başı 1 kontör. Kadın ve erkek saatleri ayrıdır; her grup için saat seçin.</p>
      {!me.enabled ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Randevu alma şu anda kapalı. Lütfen bizimle iletişime geçin.</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-muted-foreground">Kadın sayısı<input className={input} type="number" min={0} inputMode="numeric" value={female} onChange={(e) => { setFemale(e.target.value); setSelection(null); }} /></label>
        <label className="text-xs text-muted-foreground">Erkek sayısı<input className={input} type="number" min={0} inputMode="numeric" value={male} onChange={(e) => { setMale(e.target.value); setSelection(null); }} /></label>
        <label className="text-xs text-muted-foreground">Grup adı (isteğe bağlı)<input className={input} maxLength={80} value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Örn. Ekim kafilesi" /></label>
      </div>
      {total > 0 ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <ChatAvailability
            details={{ ...emptyVisit, personCount: total, femaleCount: f, maleCount: m }}
            locale="tr"
            selected={selection}
            onSelect={setSelection}
            disabled={busy}
          />
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f3f5f0] px-4 py-3 text-sm">
        <span>
          {complete && selection ? (
            <>
              <strong>{selection.date}</strong>
              {selection.female ? ` · Kadın ${selection.female.window.replace('-', '–')}` : ''}
              {selection.male ? ` · Erkek ${selection.male.window.replace('-', '–')}` : ''}
            </>
          ) : total > 0 ? 'Yukarıdan gün ve saat seçin' : 'Kişi sayısını girin'}
        </span>
        <span className={enough ? '' : 'font-semibold text-[#9f432b]'}>
          Düşülecek: <strong>{nf.format(total)}</strong> kontör · Bakiye {nf.format(me.balance)}
        </span>
      </div>
      {confirming && complete ? (
        <div className="mt-3 rounded-xl border border-[#0a2e1f]/20 bg-[#eef4ee] p-3 text-sm">
          <p><strong>{nf.format(total)} kontör</strong> düşülerek RawdahBooking&apos;den randevu alınacak. Ravza randevuları iade edilemez.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={purchase} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#0a2e1f] px-4 font-medium text-white"><Check className="size-4" /> Evet, randevuyu al</button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-10 rounded-lg border border-border bg-white px-4">Vazgeç</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!me.enabled || !complete || !enough || total === 0 || busy}
          onClick={() => setConfirming(true)}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0a2e1f] font-medium text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
          {busy ? 'Randevu alınıyor…' : `Randevu al ve QR oluştur (${nf.format(total)} kontör)`}
        </button>
      )}
      {!enough && total > 0 ? <p className="mt-2 text-xs text-[#9f432b]">Bakiyeniz yetmiyor. Aşağıdan kontör talep edebilirsiniz.</p> : null}
      {message ? (
        <p className={`mt-3 rounded-xl p-3 text-sm ${message.tone === 'ok' ? 'bg-[color:var(--success)]/10 text-[color:var(--success)]' : 'bg-amber-50 text-amber-900'}`}>{message.text}</p>
      ) : null}
    </Card>
  );
}

function CreditRequestForm({ onDone }: { onDone: () => void }) {
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/agency/credit-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ quantity: Number(quantity), note }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) setMessage({ tone: 'warn', text: payload.error ?? 'Talep gönderilemedi.' });
      else {
        setMessage({ tone: 'ok', text: 'Talebiniz alındı. Onaylandığında bakiyenize eklenir.' });
        setQuantity('');
        setNote('');
        onDone();
      }
    } catch {
      setMessage({ tone: 'warn', text: 'Bağlantı kurulamadı.' });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <h2 className="flex items-center gap-2 text-base font-semibold"><Wallet className="size-5" /> Kontör talep et</h2>
      <p className="mt-1 text-xs text-muted-foreground">Fiyat ve ödeme ekibimizle netleşir; onaylanınca bakiyenize eklenir.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
        <label className="text-xs text-muted-foreground">Adet<input className="mt-1 min-h-11 w-full rounded-xl border border-border px-3 text-sm" type="number" min={1} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="500" /></label>
        <label className="text-xs text-muted-foreground">Not (isteğe bağlı)<input className="mt-1 min-h-11 w-full rounded-xl border border-border px-3 text-sm" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn. havale yapıldı, dekont ektedir" /></label>
      </div>
      <button type="button" disabled={busy || !Number(quantity)} onClick={submit} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0a2e1f] px-5 text-sm font-medium text-white disabled:opacity-50">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Talebi gönder
      </button>
      {message ? <p className={`mt-3 rounded-xl p-3 text-sm ${message.tone === 'ok' ? 'bg-[color:var(--success)]/10 text-[color:var(--success)]' : 'bg-amber-50 text-amber-900'}`}>{message.text}</p> : null}
    </Card>
  );
}

type TeamMember = { id: string; email: string; fullName: string; phone: string; role: 'owner' | 'staff'; status: 'active' | 'suspended'; lastLoginAt: number | null; self: boolean };

/** Acente sahibinin ekip yönetimi: çalışan ekle, askıya al, şifre sıfırla. */
function TeamCard() {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [max, setMax] = useState(25);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'staff' });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(() => {
    fetch('/api/agency/team', { cache: 'no-store' })
      .then((response) => (response.ok ? (response.json() as Promise<{ members: TeamMember[]; max: number }>) : null))
      .then((payload) => {
        if (payload) {
          setMembers(payload.members);
          setMax(payload.max);
        }
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function run(key: string, body: Record<string, unknown>, okText: string) {
    setBusy(key);
    setConfirm(null);
    setMessage(null);
    try {
      const response = await fetch('/api/agency/team', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const payload = (await response.json()) as { error?: string; temporaryPassword?: string; email?: string };
      if (!response.ok) {
        setMessage({ tone: 'warn', text: payload.error ?? 'İşlem yapılamadı.' });
        return false;
      }
      if (payload.temporaryPassword && payload.email) setSecret({ email: payload.email, password: payload.temporaryPassword });
      setMessage({ tone: 'ok', text: okText });
      load();
      return true;
    } catch {
      setMessage({ tone: 'warn', text: 'Bağlantı kurulamadı.' });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const input = 'mt-1 min-h-10 w-full rounded-xl border border-border px-3 text-sm';
  return (
    <Card>
      <h2 className="text-base font-semibold">Ekip</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Çalışanlarınız kendi e-posta ve şifreleriyle girer; randevu alıp QR bağlantılarını görebilir. Kontör talebi ve ekip yönetimi yalnız acente sahibindedir. En fazla {max} kullanıcı.
      </p>
      {!members ? <div className="mt-3 h-20 animate-pulse rounded-xl bg-black/5" /> : (
        <ul className="mt-3 divide-y divide-border text-sm">
          {members.map((m) => (
            <li key={m.id} className="py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>{m.fullName}</strong>{m.self ? ' (siz)' : ''}
                  <span className="block text-xs text-muted-foreground">{m.email}{m.lastLoginAt ? ` · son giriş ${dateTime(m.lastLoginAt)}` : ' · henüz giriş yapmadı'}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="rounded-full bg-[#f3f5f0] px-2 py-0.5">{m.role === 'owner' ? 'Acente sahibi' : 'Çalışan'}</span>
                  {m.status === 'suspended' ? <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Askıda</span> : null}
                </span>
              </div>
              {!m.self ? (
                confirm === m.id ? (
                  <div className="mt-2 flex flex-wrap gap-2 rounded-lg bg-[#f3f5f0] p-2 text-xs">
                    {m.status === 'active' ? (
                      <button type="button" disabled={Boolean(busy)} onClick={() => run(`s-${m.id}`, { action: 'suspend', memberId: m.id }, `${m.fullName} askıya alındı; açık oturumları kapandı.`)} className="rounded-md bg-[#9f432b] px-2.5 py-1 font-medium text-white">Askıya al</button>
                    ) : (
                      <button type="button" disabled={Boolean(busy)} onClick={() => run(`a-${m.id}`, { action: 'activate', memberId: m.id }, `${m.fullName} yeniden aktif.`)} className="rounded-md bg-[#0a2e1f] px-2.5 py-1 font-medium text-white">Aktifleştir</button>
                    )}
                    <button type="button" disabled={Boolean(busy)} onClick={() => run(`r-${m.id}`, { action: 'resetPassword', memberId: m.id }, `${m.fullName} için geçici şifre üretildi ve e-postayla gönderildi.`)} className="rounded-md border border-border bg-white px-2.5 py-1">Şifre sıfırla</button>
                    <button type="button" onClick={() => setConfirm(null)} className="rounded-md px-2.5 py-1 underline">Vazgeç</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirm(m.id)} className="mt-1 text-xs text-primary underline">Yönet</button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 rounded-xl border border-border p-3">
        <p className="text-sm font-semibold">Çalışan ekle</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">Ad soyad<input className={input} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
          <label className="text-xs text-muted-foreground">E-posta<input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="text-xs text-muted-foreground">Telefon (isteğe bağlı)<input className={input} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="text-xs text-muted-foreground">Yetki
            <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">Çalışan (randevu alır)</option>
              <option value="owner">Acente sahibi (tam yetki)</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={Boolean(busy) || !form.fullName || !form.email}
          onClick={() => run('invite', { action: 'invite', ...form }, `${form.fullName} eklendi; giriş bilgileri e-postayla gönderildi.`).then((ok) => ok && setForm({ fullName: '', email: '', phone: '', role: 'staff' }))}
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0a2e1f] px-5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === 'invite' ? <Loader2 className="size-4 animate-spin" /> : null} Çalışanı ekle
        </button>
      </div>
      {message ? <p className={`mt-3 rounded-xl p-3 text-sm ${message.tone === 'ok' ? 'bg-[color:var(--success)]/10 text-[color:var(--success)]' : 'bg-amber-50 text-amber-900'}`}>{message.text}</p> : null}
      {secret ? (
        <div className="mt-3 rounded-xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 p-3 text-sm">
          <p className="font-medium">Geçici şifre · {secret.email}</p>
          <code className="mt-1 block rounded bg-white px-2 py-1 text-base font-semibold tracking-wide">{secret.password}</code>
          <p className="mt-1 text-xs text-muted-foreground">E-postayla da gönderildi. Bu şifre yalnız şimdi gösterilir; kullanıcı ilk girişten sonra değiştirmeli.</p>
          <button type="button" onClick={() => setSecret(null)} className="mt-1 text-xs underline">Kapat</button>
        </div>
      ) : null}
    </Card>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ current: '', next: '', again: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  async function submit() {
    if (form.next !== form.again) {
      setMessage({ tone: 'warn', text: 'Yeni şifreler aynı değil.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/agency/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ current: form.current, next: form.next }),
      });
      const payload = (await response.json()) as { error?: string };
      if (response.ok) {
        setMessage({ tone: 'ok', text: 'Şifreniz değiştirildi. Diğer cihazlardaki oturumlar kapatıldı.' });
        setForm({ current: '', next: '', again: '' });
      } else setMessage({ tone: 'warn', text: payload.error ?? 'Şifre değiştirilemedi.' });
    } catch {
      setMessage({ tone: 'warn', text: 'Bağlantı kurulamadı.' });
    } finally {
      setBusy(false);
    }
  }
  const input = 'mt-1 min-h-10 w-full rounded-xl border border-border px-3 text-sm';
  return (
    <Card>
      <h2 className="text-base font-semibold">Şifre değiştir</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-muted-foreground">Mevcut şifre<input className={input} type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} /></label>
        <label className="text-xs text-muted-foreground">Yeni şifre<input className={input} type="password" autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} /></label>
        <label className="text-xs text-muted-foreground">Yeni şifre (tekrar)<input className={input} type="password" autoComplete="new-password" value={form.again} onChange={(e) => setForm({ ...form, again: e.target.value })} /></label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">En az 10 karakter; harf ve rakam içermeli.</p>
      <button type="button" disabled={busy || !form.current || !form.next} onClick={submit} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0a2e1f] px-5 text-sm font-medium text-white disabled:opacity-50">
        {busy ? <Loader2 className="size-4 animate-spin" /> : null} Şifreyi değiştir
      </button>
      {message ? <p className={`mt-3 rounded-xl p-3 text-sm ${message.tone === 'ok' ? 'bg-[color:var(--success)]/10 text-[color:var(--success)]' : 'bg-amber-50 text-amber-900'}`}>{message.text}</p> : null}
    </Card>
  );
}

export function AgencyPortal() {
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/agency/me', { cache: 'no-store' })
      .then((response) => {
        if (response.status === 401) {
          window.location.assign('/acente/giris');
          return null;
        }
        if (!response.ok) throw new Error('unavailable');
        return response.json() as Promise<Me>;
      })
      .then((payload) => {
        if (payload) {
          setMe(payload);
          setFailed(false);
        }
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function sync() {
    setSyncing(true);
    try {
      await fetch('/api/agency/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'sync' }) });
    } finally {
      setSyncing(false);
      load();
    }
  }

  if (failed) return <p className="rounded-2xl border border-border bg-white p-6 text-sm">Panel verisi şu anda okunamıyor. <button type="button" className="underline" onClick={load}>Tekrar dene</button></p>;
  if (!me) return <div className="h-64 animate-pulse rounded-2xl bg-black/5" />;

  const pending = me.requests.filter((item) => item.status === 'pending');
  // Net kullanım: harcamalar eksi, iadeler artı yazılır; 0 - toplam ile "-0" görünmez.
  const used = 0 - me.ledger.filter((item) => item.type === 'consumption' || item.type === 'refund').reduce((sum, item) => sum + item.amount, 0);
  const people = me.bookings.filter((item) => item.status !== 'failed').reduce((sum, item) => sum + item.quantity, 0);
  const open = me.bookings.some((item) => ['purchased', 'unknown', 'purchasing'].includes(item.status));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Kullanılabilir kontör</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight">{nf.format(me.balance)}</p>
          <p className="mt-1 text-xs text-muted-foreground">1 kontör = 1 kişilik Ravza randevusu</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Bekleyen kontör talebi</p>
          <p className="mt-2 text-3xl font-semibold">{nf.format(pending.reduce((sum, item) => sum + item.quantity, 0))}</p>
          <p className="mt-1 text-xs text-muted-foreground">{pending.length} talep onay bekliyor</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Kullanılan kontör</p>
          <p className="mt-2 text-3xl font-semibold">{nf.format(used)}</p>
          <p className="mt-1 text-xs text-muted-foreground">İadeler düşülmüş net kullanım</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Randevu alınan kişi</p>
          <p className="mt-2 text-3xl font-semibold">{nf.format(people)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{me.bookings.filter((item) => item.status !== 'failed').length} grup</p>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <BookingForm me={me} onDone={load} />
        <div className="space-y-5">
          {me.member.role === 'owner' ? (
            <CreditRequestForm onDone={load} />
          ) : (
            <Card>
              <h2 className="flex items-center gap-2 text-base font-semibold"><Wallet className="size-5" /> Kontör talebi</h2>
              <p className="mt-2 text-sm text-muted-foreground">Kontör talebini acente sahibi yapar. Bakiye azaldığında acente sahibinize haber verin.</p>
            </Card>
          )}
          <Card>
            <h2 className="text-base font-semibold">Kontör taleplerim</h2>
            {me.requests.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Henüz talep yok.</p> : (
              <ul className="mt-3 divide-y divide-border text-sm">
                {me.requests.slice(0, 8).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      <strong>{nf.format(item.approvedQuantity ?? item.quantity)}</strong> kontör
                      <span className="block text-xs text-muted-foreground">{dateTime(item.createdAt)}{item.decisionNote ? ` · ${item.decisionNote}` : ''}</span>
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${requestStatus[item.status]?.[1] ?? ''}`}>{requestStatus[item.status]?.[0] ?? item.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Randevularım ve QR bağlantıları</h2>
          {open ? (
            <button type="button" onClick={sync} disabled={syncing} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium">
              {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} QR bağlantılarını yenile
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">QR kodları randevu saatinden 2 saat önce bağlantıda yeşil olarak görünür. Bağlantıyı yolcularınıza şimdiden iletebilirsiniz.</p>
        {me.bookings.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Henüz randevu yok.</p> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#f3f5f0] text-xs text-muted-foreground">
                <tr>{['Tarih · saat (Medine)', 'Grup', 'Kişi', 'Durum', 'QR'].map((head) => <th key={head} scope="col" className="px-3 py-2 font-medium">{head}</th>)}</tr>
              </thead>
              <tbody>
                {me.bookings.map((item) => (
                  <tr key={item.id} className="border-t border-border/70 align-top">
                    <td className="px-3 py-2.5 tabular-nums">{item.dateKey} · {item.timeSlot}</td>
                    <td className="px-3 py-2.5">{item.groupName || '—'}</td>
                    <td className="px-3 py-2.5">{item.gender === 'female' ? 'Kadın' : 'Erkek'} · {item.quantity}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${bookingStatus[item.status]?.[1] ?? ''}`}>{bookingStatus[item.status]?.[0] ?? item.status}</span>
                      {item.qr ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {item.qr.total > 0 && item.qr.withQr >= item.qr.total
                            ? `QR kodları hazır (${item.qr.withQr}/${item.qr.total})`
                            : `QR kodu ${item.qr.withQr}/${item.qr.total} · randevudan 2 saat önce hazır olur`}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      {item.shareUrl ? (
                        <div className="flex flex-wrap gap-1.5">
                          <a href={item.shareUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-[#0a2e1f] px-2.5 text-xs font-medium text-white">Aç <ExternalLink className="size-3" /></a>
                          <button type="button" onClick={() => navigator.clipboard.writeText(item.shareUrl ?? '').then(() => setCopied(item.id)).catch(() => setCopied(null))} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs"><Copy className="size-3" /> {copied === item.id ? 'Kopyalandı' : 'Kopyala'}</button>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Kontör hareketleri</h2>
        {me.ledger.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Henüz hareket yok.</p> : (
          <div className="mt-3 max-h-80 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <tbody>
                {me.ledger.map((item) => (
                  <tr key={item.id} className="border-t border-border/70">
                    <td className="py-2 pe-3 text-xs text-muted-foreground tabular-nums">{dateTime(item.createdAt)}</td>
                    <td className="py-2 pe-3">{ledgerLabel[item.type] ?? item.type}<span className="block text-xs text-muted-foreground">{item.note}</span></td>
                    <td className={`py-2 text-end font-semibold tabular-nums ${item.amount > 0 ? 'text-[color:var(--success)]' : ''}`}>{item.amount > 0 ? '+' : ''}{nf.format(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {me.member.role === 'owner' ? <TeamCard /> : null}

      <PasswordForm />
    </div>
  );
}
