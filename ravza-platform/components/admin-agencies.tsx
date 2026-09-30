'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, ExternalLink, Loader2, RefreshCw, X } from 'lucide-react';

type AgencyStatus = 'pending' | 'active' | 'rejected' | 'suspended';
type Summary = {
  id: string;
  companyName: string;
  taxNumber: string;
  city: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: AgencyStatus;
  balance: number;
  pendingRequests: number;
  pendingQuantity: number;
  bookingCount: number;
  usedCredits: number;
  createdAt: number;
};
type PendingRequest = { id: string; agencyId: string; companyName: string; quantity: number; note: string | null; createdAt: number };
type ListPayload = { agencies: Summary[]; pendingRequests: PendingRequest[]; outstanding: number; masterBalance: number | null };
type Detail = {
  agency: Summary & { taxOffice: string; tursabNumber: string; address: string; rejectReason: string | null; adminNote: string | null; approvedAt: number | null; approvedBy: string | null; termsVersion: string | null; termsAcceptedAt: number | null };
  balance: number;
  members: Array<{ id: string; email: string; fullName: string; phone: string; role: string; status: string; lastLoginAt: number | null }>;
  ledger: Array<{ id: string; amount: number; type: string; note: string | null; actor: string; createdAt: number }>;
  requests: Array<{ id: string; quantity: number; status: string; approvedQuantity: number | null; note: string | null; paymentNote: string | null; createdAt: number }>;
  bookings: Array<{ id: string; groupName: string; gender: string; dateKey: string; timeSlot: string; quantity: number; status: string; shareUrl: string | null; error: string | null; createdAt: number }>;
};

const nf = new Intl.NumberFormat('tr-TR');
const when = (ms: number | null) =>
  ms ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' }).format(new Date(ms)) : '—';
const statusLabel: Record<AgencyStatus, [string, string]> = {
  pending: ['Başvuru bekliyor', 'bg-amber-100 text-amber-900'],
  active: ['Aktif', 'bg-[color:var(--success)]/12 text-[color:var(--success)]'],
  rejected: ['Reddedildi', 'bg-[#fbeee9] text-[#9f432b]'],
  suspended: ['Askıda', 'bg-muted text-muted-foreground'],
};
const ledgerLabel: Record<string, string> = { allocation: 'Yükleme', consumption: 'Randevu', refund: 'İade', adjustment: 'Düzeltme' };
const input = 'min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm';

async function act(body: Record<string, unknown>) {
  const response = await fetch('/api/admin/agencies', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  return { ok: response.ok, error: payload.error };
}

function RequestRow({ item, onDone }: { item: PendingRequest; onDone: (text: string) => void }) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [paymentNote, setPaymentNote] = useState('');
  const [step, setStep] = useState<'idle' | 'approve' | 'reject'>('idle');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(body: Record<string, unknown>, text: string) {
    setBusy(true);
    setError('');
    const result = await act(body);
    setBusy(false);
    if (result.ok) onDone(text);
    else setError(result.error ?? 'İşlem yapılamadı.');
  }
  return (
    <li className="rounded-xl border border-border bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong>{item.companyName}</strong> · <span className="font-semibold">{nf.format(item.quantity)}</span> kontör
          <span className="block text-xs text-muted-foreground">{when(item.createdAt)}{item.note ? ` · ${item.note}` : ''}</span>
        </span>
        {step === 'idle' ? (
          <span className="flex gap-2">
            <button type="button" onClick={() => setStep('approve')} className="min-h-9 rounded-lg bg-[#0a2e1f] px-3 text-xs font-medium text-white">Onayla</button>
            <button type="button" onClick={() => setStep('reject')} className="min-h-9 rounded-lg border border-border px-3 text-xs">Reddet</button>
          </span>
        ) : null}
      </div>
      {step === 'approve' ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
          <input className={input} type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} aria-label="Yüklenecek kontör" />
          <input className={input} value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Not (isteğe bağlı, acente görür)" aria-label="Not" />
          <span className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => run({ action: 'approveRequest', requestId: item.id, quantity: Number(quantity), paymentNote }, `${item.companyName} hesabına ${quantity} kontör yüklendi.`)} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#0a2e1f] px-3 text-xs font-medium text-white">
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} {nf.format(Number(quantity) || 0)} kontör yükle
            </button>
            <button type="button" onClick={() => setStep('idle')} className="min-h-10 rounded-lg border border-border px-3 text-xs">Vazgeç</button>
          </span>
        </div>
      ) : null}
      {step === 'reject' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <input className={`${input} flex-1`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Red sebebi (acente görür)" />
          <button type="button" disabled={busy} onClick={() => run({ action: 'rejectRequest', requestId: item.id, decisionNote: reason }, 'Talep reddedildi.')} className="min-h-10 rounded-lg bg-[#9f432b] px-3 text-xs font-medium text-white">Reddet</button>
          <button type="button" onClick={() => setStep('idle')} className="min-h-10 rounded-lg border border-border px-3 text-xs">Vazgeç</button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs text-[#9f432b]">{error}</p> : null}
    </li>
  );
}

function AgencyDrawer({ id, initialCredits, onClose, onChanged }: { id: string; initialCredits: number; onClose: () => void; onChanged: (text?: string) => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [credits, setCredits] = useState(String(initialCredits || ''));
  const [reason, setReason] = useState('');
  const [adjust, setAdjust] = useState({ amount: '', note: '' });
  const [confirm, setConfirm] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);

  async function resetPassword(memberId: string) {
    setBusy(`reset-${memberId}`);
    setConfirm(null);
    const response = await fetch('/api/admin/agencies', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'resetPassword', id, memberId }),
    });
    const payload = (await response.json().catch(() => ({}))) as { temporaryPassword?: string; email?: string; error?: string };
    setBusy(null);
    if (response.ok && payload.temporaryPassword) setTempPassword({ email: payload.email ?? '', password: payload.temporaryPassword });
    else setMessage({ tone: 'warn', text: payload.error ?? 'Şifre sıfırlanamadı.' });
  }

  const load = useCallback(() => {
    fetch(`/api/admin/agencies?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then((response) => (response.ok ? (response.json() as Promise<Detail>) : null))
      .then((payload) => payload && setDetail(payload))
      .catch(() => undefined);
  }, [id]);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function run(key: string, body: Record<string, unknown>, text: string) {
    setBusy(key);
    setMessage(null);
    setConfirm(null);
    const result = await act({ id, ...body });
    setBusy(null);
    if (result.ok) {
      setMessage({ tone: 'ok', text });
      load();
      onChanged(text);
    } else setMessage({ tone: 'warn', text: result.error ?? 'İşlem yapılamadı.' });
  }

  const a = detail?.agency;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#071c14]/35" onClick={onClose} aria-hidden="true" />
      <aside aria-label="Acente ayrıntısı" className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{a?.taxNumber ?? ''}</p>
            <h3 className="mt-1 font-serif text-2xl">{a?.companyName ?? 'Yükleniyor…'}</h3>
            {a ? <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusLabel[a.status][1]}`}>{statusLabel[a.status][0]}</span> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-9 place-items-center rounded-lg hover:bg-muted"><X className="size-4" /></button>
        </div>
        {!detail || !a ? <div className="mt-6 h-40 animate-pulse rounded-xl bg-black/5" /> : (
          <>
            <div className="mt-5 rounded-2xl bg-[#f3f5f0] p-4">
              <p className="text-xs text-muted-foreground">Kullanılabilir kontör</p>
              <p className="text-4xl font-semibold">{nf.format(detail.balance)}</p>
            </div>

            {message ? <p className={`mt-4 rounded-xl p-3 text-sm ${message.tone === 'ok' ? 'bg-[color:var(--success)]/10 text-[color:var(--success)]' : 'bg-amber-50 text-amber-900'}`}>{message.text}</p> : null}

            {a.status === 'pending' || a.status === 'rejected' ? (
              <section className="mt-5 space-y-3 rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold">Başvuruyu değerlendir</p>
                {a.status === 'rejected' && a.rejectReason ? <p className="text-xs text-muted-foreground">Önceki red sebebi: {a.rejectReason}</p> : null}
                <label className="block text-xs text-muted-foreground">Onayla birlikte yüklenecek kontör
                  <input className={`${input} mt-1`} type="number" min={0} value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="0" />
                </label>
                {confirm === 'approve' ? (
                  <div className="rounded-xl bg-[#eef4ee] p-3 text-sm">
                    <p><strong>{a.companyName}</strong> onaylanacak ve <strong>{nf.format(Number(credits) || 0)} kontör</strong> yüklenecek.</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" disabled={Boolean(busy)} onClick={() => run('approve', { action: 'approve', credits: Number(credits) || 0 }, `${a.companyName} onaylandı${Number(credits) ? `, ${credits} kontör yüklendi` : ''}.`)} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#0a2e1f] px-4 text-sm font-medium text-white">{busy === 'approve' ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Evet, onayla</button>
                      <button type="button" onClick={() => setConfirm(null)} className="min-h-10 rounded-lg border border-border px-4 text-sm">Vazgeç</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirm('approve')} className="min-h-11 w-full rounded-xl bg-[#0a2e1f] text-sm font-medium text-white">Acenteyi onayla</button>
                )}
                {a.status === 'pending' ? (
                  <div className="flex gap-2">
                    <input className={`${input} flex-1`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Red sebebi (acente görür)" />
                    <button type="button" disabled={Boolean(busy)} onClick={() => run('reject', { action: 'reject', reason }, 'Başvuru reddedildi.')} className="min-h-10 rounded-lg border border-[#e7b9a8] px-3 text-sm text-[#9f432b]">Reddet</button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {a.status === 'active' || a.status === 'suspended' ? (
              <section className="mt-5 space-y-3 rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold">Kontör düzeltmesi</p>
                <div className="grid gap-2 sm:grid-cols-[110px_1fr_auto]">
                  <input className={input} type="number" value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} placeholder="+50 / -20" aria-label="Miktar" />
                  <input className={input} value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} placeholder="Açıklama (zorunlu)" aria-label="Açıklama" />
                  <button type="button" disabled={Boolean(busy) || !Number(adjust.amount)} onClick={() => run('adjust', { action: 'adjust', amount: Number(adjust.amount), note: adjust.note }, 'Kontör düzeltmesi kaydedildi.').then(() => setAdjust({ amount: '', note: '' }))} className="min-h-10 rounded-lg bg-[#0a2e1f] px-3 text-sm font-medium text-white disabled:opacity-50">Kaydet</button>
                </div>
                {a.status === 'active' ? (
                  confirm === 'suspend' ? (
                    <div className="rounded-xl bg-[#fdf3ef] p-3 text-sm text-[#8a3a22]">
                      <p>Acente askıya alınırsa açık oturumları hemen kapanır ve randevu alamaz. Bakiyesi korunur.</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => run('suspend', { action: 'suspend' }, 'Acente askıya alındı.')} className="min-h-10 rounded-lg bg-[#9f432b] px-4 font-medium text-white">Evet, askıya al</button>
                        <button type="button" onClick={() => setConfirm(null)} className="min-h-10 rounded-lg border border-border bg-white px-4">Vazgeç</button>
                      </div>
                    </div>
                  ) : <button type="button" onClick={() => setConfirm('suspend')} className="min-h-10 rounded-lg border border-[#e7b9a8] px-4 text-sm text-[#9f432b]">Askıya al</button>
                ) : (
                  <button type="button" disabled={Boolean(busy)} onClick={() => run('activate', { action: 'activate' }, 'Acente yeniden aktif.')} className="min-h-10 rounded-lg bg-[#0a2e1f] px-4 text-sm font-medium text-white">Yeniden aktifleştir</button>
                )}
              </section>
            ) : null}

            <section className="mt-5">
              <p className="text-sm font-semibold">Şirket ve yetkili</p>
              <dl className="mt-2 space-y-1.5 text-sm">
                {[
                  ['Vergi dairesi / no', `${a.taxOffice} / ${a.taxNumber}`],
                  ['TÜRSAB', a.tursabNumber || '—'],
                  ['Adres', `${a.address}, ${a.city}`],
                  ['Yetkili', a.contactName],
                  ['Telefon', a.contactPhone],
                  ['E-posta', a.contactEmail],
                  ['Başvuru', when(a.createdAt)],
                  ['Koşullar', a.termsVersion ? `Sürüm ${a.termsVersion} · ${when(a.termsAcceptedAt)}` : '—'],
                  ['Onay', a.approvedAt ? `${when(a.approvedAt)} · ${(a.approvedBy ?? '').replace(/^admin:/, '')}` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4"><dt className="shrink-0 text-xs text-muted-foreground">{k}</dt><dd className="text-end">{v}</dd></div>
                ))}
              </dl>
              <a href={`https://wa.me/${a.contactPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm">WhatsApp&apos;tan yaz <ExternalLink className="size-3.5" /></a>
            </section>

            <section className="mt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Randevular ({detail.bookings.length})</p>
                {detail.bookings.some((b) => ['purchased', 'unknown', 'purchasing'].includes(b.status)) ? (
                  <button type="button" disabled={Boolean(busy)} onClick={() => run('sync', { action: 'sync' }, 'RawdahBooking ile karşılaştırıldı.')} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs">{busy === 'sync' ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} Durumu kontrol et</button>
                ) : null}
              </div>
              <ul className="mt-2 divide-y divide-border text-sm">
                {detail.bookings.slice(0, 50).map((b) => (
                  <li key={b.id} className="py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="tabular-nums">{b.dateKey} {b.timeSlot} · {b.gender === 'female' ? 'Kadın' : 'Erkek'} {b.quantity}{b.groupName ? ` · ${b.groupName}` : ''}</span>
                      {b.shareUrl ? <a href={b.shareUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">QR bağlantısı</a> : <span className="text-xs text-muted-foreground">{b.status}{b.error ? ` · ${b.error}` : ''}</span>}
                    </div>
                    {b.status === 'unknown' || b.status === 'purchasing' ? (
                      confirm === `refund-${b.id}` ? (
                        <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                          RawdahBooking panelinde bu satın almanın OLMADIĞINI doğruladınız mı? Olduysa kontör iki kez harcanmış olur.
                          <div className="mt-1.5 flex gap-2">
                            <button type="button" onClick={() => run(`refund-${b.id}`, { action: 'refundBooking', bookingId: b.id }, `${b.quantity} kontör iade edildi.`)} className="rounded-md bg-amber-800 px-2.5 py-1 font-medium text-white">Evet, iade et</button>
                            <button type="button" onClick={() => setConfirm(null)} className="rounded-md border border-amber-300 px-2.5 py-1">Vazgeç</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setConfirm(`refund-${b.id}`)} className="mt-1 text-xs text-amber-800 underline">Satın alma olmadı · kontörü iade et</button>
                      )
                    ) : null}
                  </li>
                ))}
                {detail.bookings.length === 0 ? <li className="py-2 text-muted-foreground">Henüz randevu yok.</li> : null}
              </ul>
            </section>

            <section className="mt-6">
              <p className="text-sm font-semibold">Kontör hareketleri</p>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {detail.ledger.map((l) => (
                    <tr key={l.id} className="border-t border-border/70">
                      <td className="py-1.5 pe-2 text-xs text-muted-foreground">{when(l.createdAt)}</td>
                      <td className="py-1.5 pe-2">{ledgerLabel[l.type] ?? l.type}<span className="block text-xs text-muted-foreground">{l.note} · {l.actor.replace(/^admin:/, '').replace(/^agency:.*/, 'acente').replace('system', 'sistem')}</span></td>
                      <td className={`py-1.5 text-end font-semibold tabular-nums ${l.amount > 0 ? 'text-[color:var(--success)]' : ''}`}>{l.amount > 0 ? '+' : ''}{nf.format(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detail.ledger.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Henüz hareket yok.</p> : null}
            </section>

            <section className="mt-6">
              <p className="text-sm font-semibold">Kullanıcılar</p>
              <ul className="mt-2 text-sm">
                {detail.members.map((m) => (
                  <li key={m.id} className="border-t border-border/70 py-2">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span>{m.fullName} <span className="text-xs text-muted-foreground">{m.email}</span>
                        <span className="ms-1.5 rounded-full bg-[#f3f5f0] px-2 py-0.5 text-[0.7rem]">{m.role === 'owner' ? 'Sahip' : 'Çalışan'}</span>
                        {m.status === 'suspended' ? <span className="ms-1 rounded-full bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground">Askıda</span> : null}
                      </span>
                      <span className="text-xs text-muted-foreground">Son giriş: {when(m.lastLoginAt)}</span>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => run(`member-${m.id}`, { action: 'setMemberStatus', memberId: m.id, status: m.status === 'active' ? 'suspended' : 'active' }, m.status === 'active' ? `${m.fullName} askıya alındı.` : `${m.fullName} yeniden aktif.`)}
                      className="mt-1 me-3 text-xs text-[#9f432b] underline"
                    >
                      {m.status === 'active' ? 'Kullanıcıyı askıya al' : 'Kullanıcıyı aktifleştir'}
                    </button>
                    {confirm === `reset-${m.id}` ? (
                      <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                        Yeni geçici şifre üretilecek; eski şifre ve açık oturumlar geçersiz olur.
                        <div className="mt-1.5 flex gap-2">
                          <button type="button" onClick={() => resetPassword(m.id)} className="rounded-md bg-amber-800 px-2.5 py-1 font-medium text-white">{busy === `reset-${m.id}` ? 'Sıfırlanıyor…' : 'Evet, sıfırla'}</button>
                          <button type="button" onClick={() => setConfirm(null)} className="rounded-md border border-amber-300 px-2.5 py-1">Vazgeç</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirm(`reset-${m.id}`)} className="mt-1 text-xs text-primary underline">Şifre sıfırla</button>
                    )}
                    {tempPassword && tempPassword.email === m.email ? (
                      <div className="mt-2 rounded-lg border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 p-2.5 text-xs">
                        <p className="font-medium">Geçici şifre (yalnız bir kez gösterilir):</p>
                        <code className="mt-1 block rounded bg-white px-2 py-1 text-sm font-semibold tracking-wide">{tempPassword.password}</code>
                        <p className="mt-1 text-muted-foreground">Acenteye WhatsApp&apos;tan iletin; girişten sonra yeni şifre belirlemesini önerin.</p>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </aside>
    </div>
  );
}

const filters: Array<[AgencyStatus | 'all', string]> = [['all', 'Tümü'], ['pending', 'Başvuru bekleyen'], ['active', 'Aktif'], ['suspended', 'Askıda'], ['rejected', 'Reddedilen']];

export function AdminAgencies() {
  const [data, setData] = useState<ListPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<AgencyStatus | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/agencies', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('unavailable');
        return response.json() as Promise<ListPayload>;
      })
      .then((payload) => { setData(payload); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (failed) return <p className="rounded-2xl border border-border bg-white p-6 text-sm">Acente verisi okunamadı. <button type="button" className="underline" onClick={load}>Tekrar dene</button></p>;
  if (!data) return <div className="h-64 animate-pulse rounded-2xl bg-black/5" />;

  const counts = (status: AgencyStatus) => data.agencies.filter((a) => a.status === status).length;
  const visible = data.agencies.filter((a) => filter === 'all' || a.status === filter);
  const over = data.masterBalance !== null && data.outstanding > data.masterBalance;
  const coverage = data.masterBalance ? Math.min(100, Math.round((data.outstanding / Math.max(1, data.masterBalance)) * 100)) : 0;
  const openAgency = data.agencies.find((a) => a.id === openId);

  return (
    <div className="space-y-5">
      {notice ? (
        <output className="flex items-center justify-between rounded-xl bg-[color:var(--success)]/10 px-4 py-2.5 text-sm text-[color:var(--success)]">
          {notice}<button type="button" onClick={() => setNotice(null)} className="text-xs underline">Kapat</button>
        </output>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-black/5 bg-white p-5"><p className="text-xs text-muted-foreground">Aktif acente</p><p className="mt-2 text-3xl font-semibold">{counts('active')}</p></div>
        <div className="rounded-2xl border border-black/5 bg-white p-5"><p className="text-xs text-muted-foreground">Başvuru bekleyen</p><p className="mt-2 text-3xl font-semibold">{counts('pending')}</p></div>
        <div className="rounded-2xl border border-black/5 bg-white p-5"><p className="text-xs text-muted-foreground">Bekleyen kontör talebi</p><p className="mt-2 text-3xl font-semibold">{nf.format(data.pendingRequests.reduce((s, r) => s + r.quantity, 0))}</p><p className="mt-1 text-xs text-muted-foreground">{data.pendingRequests.length} talep</p></div>
        <div className={`rounded-2xl border p-5 ${over ? 'border-[#e7b9a8] bg-[#fdf3ef]' : 'border-black/5 bg-white'}`}>
          <p className="text-xs text-muted-foreground">Acentelerdeki kontör / RawdahBooking bakiyesi</p>
          <p className="mt-2 text-3xl font-semibold">{nf.format(data.outstanding)} <span className="text-base font-normal text-muted-foreground">/ {data.masterBalance === null ? '—' : nf.format(data.masterBalance)}</span></p>
          <div className="mt-2 h-2 rounded-full bg-[#e6eae3]" aria-hidden="true"><div className={`h-2 rounded-full ${over ? 'bg-[#9f432b]' : 'bg-[#2e7550]'}`} style={{ width: `${over ? 100 : coverage}%` }} /></div>
          <p className={`mt-1.5 flex items-center gap-1 text-xs ${over ? 'text-[#9f432b]' : 'text-muted-foreground'}`}>
            {over ? <><AlertTriangle className="size-3.5" /> Dağıtılan kontör gerçek bakiyeyi aşıyor; RawdahBooking&apos;den kontör alın.</> : 'Dağıtılan kontör gerçek bakiyeyle karşılanıyor.'}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="text-base font-semibold">Bekleyen kontör talepleri</h2>
        {data.pendingRequests.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Bekleyen talep yok.</p> : (
          <ul className="mt-3 space-y-2">
            {data.pendingRequests.map((item) => (
              <RequestRow key={item.id} item={item} onDone={(text) => { setNotice(text); load(); }} />
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Başvuru ile gelen ilk talepler, acente onaylanınca kapanır. Onaylanmamış acentenin talebi acente sayfasından onayla birlikte yüklenir.</p>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key} className={`min-h-9 rounded-full border px-3.5 text-xs font-medium ${filter === key ? 'border-primary bg-primary text-primary-foreground' : 'border-black/10 bg-white'}`}>
              {label} <span className="opacity-70">{key === 'all' ? data.agencies.length : counts(key)}</span>
            </button>
          ))}
          <a href="/acente/basvuru" target="_blank" rel="noopener noreferrer" className="ms-auto text-xs text-primary underline">Başvuru sayfası</a>
        </div>
        {visible.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Bu filtrede acente yok.</p> : (
          <ul className="mt-4 space-y-2">
            {visible.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => setOpenId(a.id)} className="flex w-full items-center gap-4 rounded-2xl border border-black/5 p-4 text-start transition hover:border-primary/30 hover:shadow-sm">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.companyName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${statusLabel[a.status][1]}`}>{statusLabel[a.status][0]}</span>
                      {a.pendingRequests ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.7rem] font-medium text-amber-900">{nf.format(a.pendingQuantity)} kontör talebi</span> : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{a.contactName} · {a.city} · başvuru {when(a.createdAt)}</span>
                  </span>
                  <span className="text-end">
                    <span className="block text-lg font-semibold">{nf.format(a.balance)}</span>
                    <span className="block text-xs text-muted-foreground">kontör · {nf.format(a.usedCredits)} kullanıldı</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {openId ? (
        <AgencyDrawer
          key={openId}
          id={openId}
          initialCredits={openAgency?.pendingQuantity ?? 0}
          onClose={() => setOpenId(null)}
          onChanged={(text) => { if (text) setNotice(text); load(); }}
        />
      ) : null}
    </div>
  );
}
