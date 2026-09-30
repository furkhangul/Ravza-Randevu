'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, LoaderCircle, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

export function SupportForm() {
  const [sent, setSent] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [tickets, setTickets] = useState<Array<{ id: string; category: string; subject: string; status: string }>>([]);
  useEffect(() => { fetch('/api/demo/state').then((response) => response.json()).then((value: unknown) => { const state = value as { tickets?: Array<{ id: string; category: string; subject: string; status: string }> }; if (state.tickets) setTickets(state.tickets); }).catch(() => undefined); }, []);
  async function submit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/demo/state', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'create_ticket', category: form.get('category'), subject: form.get('subject'), message: form.get('message') }) });
      const result = await response.json() as { error?: string; ticketId?: string; state?: { tickets?: Array<{ id: string; category: string; subject: string; status: string }> } };
      if (!response.ok) throw new Error(result.error ?? 'Talep kaydedilemedi.');
      setTicketId(result.ticketId ?? 'TKT-DEMO');
      if (result.state?.tickets) setTickets(result.state.tickets);
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Talep kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_.75fr]">
    <Card className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border">
      <CardHeader><CardTitle className="font-serif text-2xl">Destek talebi aç</CardTitle><CardDescription>Hassas yolcu verisini mesaj alanına yazmayın; yalnız işlem kimliği kullanın.</CardDescription></CardHeader>
      <CardContent>
        {sent ? <div className="rounded-2xl bg-[#e8f2ed] p-6 text-[#19613f]"><CheckCircle2 className="mb-3 size-8" /><h2 className="font-serif text-2xl">Demo talep kaydedildi</h2><p className="mt-2 text-sm"><span className="font-mono">{ticketId}</span> · Yerel D1 veritabanına kaydedildi, dışarı mesaj gönderilmedi.</p><Button variant="outline" className="mt-5 bg-white" onClick={() => setSent(false)}>Yeni talep</Button></div> : <form className="space-y-4" onSubmit={submit}><div><label className="mb-2 block text-sm font-medium" htmlFor="category">Kategori</label><NativeSelect id="category" name="category" className="w-full" required><NativeSelectOption value="appointment">Randevu</NativeSelectOption><NativeSelectOption value="qr">QR</NativeSelectOption><NativeSelectOption value="payment">Ödeme</NativeSelectOption><NativeSelectOption value="other">Diğer</NativeSelectOption></NativeSelect></div><div><label className="mb-2 block text-sm font-medium" htmlFor="subject">Konu</label><Input id="subject" name="subject" required maxLength={100} className="h-11" placeholder="Örn. sipariş numarasıyla durum kontrolü" /></div><div><label className="mb-2 block text-sm font-medium" htmlFor="message">Açıklama</label><Textarea id="message" name="message" required maxLength={1000} className="min-h-32" placeholder="Kişisel veri eklemeden durumu açıklayın." /></div>{error && <p className="flex items-center gap-2 rounded-xl bg-[#fff1eb] p-3 text-sm text-[#9f432b]"><AlertTriangle className="size-4" />{error}</p>}<Button className="h-11" disabled={saving}>{saving ? <LoaderCircle className="animate-spin" /> : <Send />}{saving ? 'Kaydediliyor' : 'Demo talebi oluştur'}</Button></form>}
      </CardContent>
    </Card>
    <Card className="border-0 bg-[#f3eee5] ring-1 ring-[#d7c9ae]"><CardHeader><CardTitle className="font-serif text-2xl">Talep geçmişi</CardTitle><CardDescription>Yerel D1 kayıtları</CardDescription></CardHeader><CardContent className="space-y-3">{tickets.length ? tickets.slice(0, 8).map((ticket) => <div key={ticket.id} className="rounded-xl bg-white/80 p-4"><div className="flex items-center justify-between gap-3"><strong className="font-mono text-xs">{ticket.id}</strong><span className="rounded-full bg-[#e8f2ed] px-2 py-1 text-[10px] font-semibold uppercase text-[#19613f]">Açık</span></div><p className="mt-2 text-sm font-medium">{ticket.subject}</p><p className="mt-1 text-xs text-muted-foreground">{ticket.category}</p></div>) : <p className="rounded-xl border border-dashed border-[#bda97f] p-6 text-center text-sm text-muted-foreground">Henüz demo talep yok.</p>}</CardContent></Card>
    </div>
  );
}
