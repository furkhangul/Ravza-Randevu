'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Pencil, Trash2 } from 'lucide-react';

type EditableRequest = {
  code: string;
  fullName: string;
  phone: string;
  email: string | null;
  femaleCount: number;
  maleCount: number;
  dateFrom: string;
  dateTo: string;
  flexible: boolean;
  timePreference: string;
  note: string | null;
};

const timeOptions: Array<[string, string]> = [
  ['any', 'Fark etmez'],
  ['morning', 'Sabah'],
  ['afternoon', 'Öğleden sonra'],
  ['evening', 'Akşam'],
  ['night', 'Gece'],
];

const inputClass =
  'min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

type DeleteStep = 'idle' | 'confirm' | 'confirmBooked' | 'deleting';

/** Düzenleme formunun alanları (sayılar metin olarak tutulur). */
function toForm(value: EditableRequest) {
  return {
    fullName: value.fullName,
    phone: value.phone,
    email: value.email ?? '',
    femaleCount: String(value.femaleCount),
    maleCount: String(value.maleCount),
    dateFrom: value.dateFrom,
    dateTo: value.dateTo,
    flexible: value.flexible,
    timePreference: value.timePreference,
    note: value.note ?? '',
  };
}


/**
 * Talep penceresindeki düzenleme ve iki aşamalı silme.
 * Silme: "Talebi sil" → "Talep silinsin mi?" → "Talep siliniyor…".
 */
export function QuoteRequestActions<T extends EditableRequest>({
  request,
  onUpdated,
  onDeleted,
}: {
  request: T;
  onUpdated: (request: T) => void;
  onDeleted: (code: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => toForm(request));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle');

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/quote-requests', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: request.code,
          changes: {
            ...form,
            femaleCount: Number(form.femaleCount),
            maleCount: Number(form.maleCount),
          },
        }),
      });
      const payload = (await response.json()) as { request?: T; error?: string };
      if (!response.ok || !payload.request) {
        setError(payload.error ?? 'Kaydedilemedi.');
        return;
      }
      onUpdated(payload.request);
      setEditing(false);
    } catch {
      setError('Bağlantı kurulamadı; tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(confirmBooked: boolean) {
    setDeleteStep('deleting');
    setError(null);
    try {
      const response = await fetch('/api/admin/quote-requests', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: request.code, confirmBooked }),
      });
      const payload = (await response.json()) as { error?: string };
      if (response.status === 409 && payload.error === 'booked_confirmation_required') {
        setDeleteStep('confirmBooked');
        return;
      }
      if (!response.ok) {
        setError('Talep silinemedi; tekrar deneyin.');
        setDeleteStep('idle');
        return;
      }
      onDeleted(request.code);
    } catch {
      setError('Bağlantı kurulamadı; talep silinmedi.');
      setDeleteStep('idle');
    }
  }

  if (deleteStep === 'deleting') {
    return (
      <p className="mt-6 flex items-center gap-2 rounded-xl bg-muted p-4 text-sm">
        <Loader2 className="size-4 animate-spin" /> Talep siliniyor…
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {editing ? (
        <div className="space-y-3 rounded-2xl border border-border p-4">
          <p className="text-sm font-semibold">Talebi düzenle</p>
          <label className="block text-xs text-muted-foreground">
            Ad soyad
            <input className={`${inputClass} mt-1`} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted-foreground">
              Telefon
              <input className={`${inputClass} mt-1`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="block text-xs text-muted-foreground">
              E-posta
              <input className={`${inputClass} mt-1`} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted-foreground">
              Kadın
              <input className={`${inputClass} mt-1`} type="number" min={0} value={form.femaleCount} onChange={(e) => setForm({ ...form, femaleCount: e.target.value })} />
            </label>
            <label className="block text-xs text-muted-foreground">
              Erkek
              <input className={`${inputClass} mt-1`} type="number" min={0} value={form.maleCount} onChange={(e) => setForm({ ...form, maleCount: e.target.value })} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-muted-foreground">
              Başlangıç
              <input className={`${inputClass} mt-1`} type="date" value={form.dateFrom} onChange={(e) => setForm({ ...form, dateFrom: e.target.value })} />
            </label>
            <label className="block text-xs text-muted-foreground">
              Bitiş
              <input className={`${inputClass} mt-1`} type="date" value={form.dateTo} min={form.dateFrom} onChange={(e) => setForm({ ...form, dateTo: e.target.value })} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.flexible} onChange={(e) => setForm({ ...form, flexible: e.target.checked })} />
            Tarihler esnek
          </label>
          <label className="block text-xs text-muted-foreground">
            Saat tercihi
            <select className={`${inputClass} mt-1`} value={form.timePreference} onChange={(e) => setForm({ ...form, timePreference: e.target.value })}>
              {timeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-muted-foreground">
            Not
            <textarea className={`${inputClass} mt-1 min-h-20 py-2`} maxLength={300} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          {error ? <p className="rounded-lg bg-[#fbeee9] px-3 py-2 text-xs text-[#9f432b]">{error}</p> : null}
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={save} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#0a2e1f] px-4 text-sm font-medium text-white disabled:opacity-60">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null} Kaydet
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setError(null);
                setForm(toForm(request));
              }}
              className="min-h-10 rounded-lg border border-border px-4 text-sm"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : deleteStep === 'confirm' ? (
        <div className="rounded-2xl border border-[#e7b9a8] bg-[#fdf3ef] p-4 text-sm">
          <p className="font-semibold text-[#8a3a22]">Talep silinsin mi?</p>
          <p className="mt-1 text-xs text-[#8a3a22]/80">
            {request.code} ({request.fullName}) ve geçmişi kalıcı olarak silinir. Bu işlem geri alınamaz.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => remove(false)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#9f432b] px-4 font-medium text-white">
              <Trash2 className="size-4" /> Evet, sil
            </button>
            <button type="button" onClick={() => setDeleteStep('idle')} className="min-h-10 rounded-lg border border-border bg-white px-4">
              Vazgeç
            </button>
          </div>
        </div>
      ) : deleteStep === 'confirmBooked' ? (
        <div className="rounded-2xl border border-[#e7b9a8] bg-[#fdf3ef] p-4 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-[#8a3a22]">
            <AlertTriangle className="size-4" /> Bu talep için randevu satın alındı
          </p>
          <p className="mt-1 text-xs text-[#8a3a22]/80">
            Silerseniz müşteri QR bağlantısına talep sayfasından ulaşamaz. RawdahBooking&apos;deki
            randevu ve harcanan kontör yerinde kalır.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => remove(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#9f432b] px-4 font-medium text-white">
              <Trash2 className="size-4" /> Yine de sil
            </button>
            <button type="button" onClick={() => setDeleteStep('idle')} className="min-h-10 rounded-lg border border-border bg-white px-4">
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setForm(toForm(request));
              setEditing(true);
            }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
          >
            <Pencil className="size-4" /> Düzenle
          </button>
          <button
            type="button"
            onClick={() => setDeleteStep('confirm')}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#e7b9a8] px-4 text-sm font-medium text-[#9f432b] hover:bg-[#fdf3ef]"
          >
            <Trash2 className="size-4" /> Talebi sil
          </button>
        </div>
      )}
      {error && !editing ? <p className="rounded-lg bg-[#fbeee9] px-3 py-2 text-xs text-[#9f432b]">{error}</p> : null}
    </div>
  );
}
