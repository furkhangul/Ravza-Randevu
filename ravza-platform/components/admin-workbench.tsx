'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Check, Eye, LoaderCircle, Search, ShieldAlert, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type AgencyStatus = 'pending' | 'active' | 'rejected';

type Agency = {
  id: string;
  name: string;
  contact: string;
  city: string;
  status: AgencyStatus;
  credits: number;
};

type DemoOrder = { id: string; status: string };

type AuditEntry = {
  id: string;
  action: string;
  targetId: string;
  createdAt: number;
};

const initialAgencies: Agency[] = [
  { id: 'AGN-DEMO-018', name: 'Hira Turizm', contact: 'F. G.', city: 'İstanbul', status: 'active', credits: 248 },
  { id: 'AGN-DEMO-021', name: 'Menzil Seyahat', contact: 'A. K.', city: 'Konya', status: 'pending', credits: 0 },
  { id: 'AGN-DEMO-022', name: 'Safa Organizasyon', contact: 'S. D.', city: 'Ankara', status: 'pending', credits: 0 },
  { id: 'AGN-DEMO-016', name: 'Nur Tur', contact: 'M. Y.', city: 'Bursa', status: 'rejected', credits: 0 },
];

const statusLabel: Record<AgencyStatus, string> = {
  active: 'Aktif',
  pending: 'İncelemede',
  rejected: 'Reddedildi',
};

const auditActionLabel: Record<string, string> = {
  'demo.order.created': 'Randevu oluşturuldu',
  'demo.order.qr_pending': 'Sipariş QR bekleyene taşındı',
  'demo.order.qr_ready': 'Sipariş QR hazıra taşındı',
  'demo.passengers.imported': 'Yolcu grubu içe aktarıldı',
  'demo.ticket.created': 'Destek talebi açıldı',
  'demo.agency.active': 'Acente onaylandı',
  'demo.agency.rejected': 'Acente reddedildi',
};

function relativeTimeFromNow(timestampMs: number) {
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestampMs) / 60000));
  if (diffMinutes < 1) return 'az önce';
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} sa önce`;
  return `${Math.round(diffHours / 24)} gün önce`;
}

export function AdminWorkbench() {
  const [agencies, setAgencies] = useState(initialAgencies);
  const [filter, setFilter] = useState<'all' | AgencyStatus>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Agency | null>(null);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [audits, setAudits] = useState<AuditEntry[]>([]);

  const loadState = () => {
    fetch('/api/demo/state').then((response) => response.json()).then((value: unknown) => {
      const state = value as {
        credits?: number;
        agencies?: Array<{ id: string; name: string; contactMasked: string; city: string; status: AgencyStatus }>;
        orders?: DemoOrder[];
        audits?: AuditEntry[];
      };
      if (state.agencies) setAgencies(state.agencies.map((agency) => ({ ...agency, contact: agency.contactMasked, credits: agency.id === 'AGN-DEMO-018' ? (state.credits ?? 0) : 0 })));
      if (state.orders) setOrders(state.orders);
      if (state.audits) setAudits(state.audits);
    }).catch(() => undefined);
  };

  useEffect(() => {
    loadState();
  }, []);

  const visible = useMemo(
    () => agencies.filter((agency) =>
      (filter === 'all' || agency.status === filter)
      && `${agency.name} ${agency.id} ${agency.city}`.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')),
    ),
    [agencies, filter, search],
  );

  const updateStatus = async (status: AgencyStatus) => {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch('/api/demo/state', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'review_agency', agencyId: selected.id, status }) });
      if (response.ok) {
        setAgencies((current) => current.map((agency) => agency.id === selected.id ? { ...agency, status } : agency));
        setSelected(null);
        loadState();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Bekleyen başvuru', agencies.filter((item) => item.status === 'pending').length.toString(), 'Yetki ve belge kontrolü'],
          ['Sağlayıcı bekleyen', orders.filter((item) => item.status === 'provider_pending').length.toString(), 'Yeniden satın alma kapalı'],
          ['QR bekleyen', orders.filter((item) => item.status === 'qr_pending').length.toString(), 'Kesin süre gösterilmiyor'],
          ['Mutabakat farkı', orders.filter((item) => item.status === 'qr_ready').length.toString(), 'İnsan incelemesi gerekli'],
        ].map(([label, value, note], index) => (
          <Card key={label} className={index === 3 ? 'border-[#c67755]/40 bg-[#fff7f3]' : 'border-0 shadow-sm ring-1 ring-border'}>
            <CardHeader className="pb-2"><CardDescription>{label}</CardDescription><CardTitle className="font-serif text-4xl">{value}</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground">{note}</CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border">
        <CardHeader className="gap-4 border-b border-border md:flex md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle className="font-serif text-2xl">Acente yönetimi</CardTitle>
            <CardDescription>Profiller maskeli gösterilir; kararlar acente kaydına işlenir ve denetim izine yazılır.</CardDescription>
          </div>
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Acente, kod veya şehir ara" className="h-10 pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {([['all', 'Tümü'], ['pending', 'İncelemede'], ['active', 'Aktif'], ['rejected', 'Reddedildi']] as const).map(([key, label]) => (
              <Button key={key} size="sm" variant={filter === key ? 'default' : 'outline'} onClick={() => setFilter(key)}>{label}</Button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead><tr className="border-b border-border text-xs uppercase tracking-[.1em] text-muted-foreground"><th className="pb-3 font-medium">Acente</th><th className="pb-3 font-medium">Yetkili</th><th className="pb-3 font-medium">Şehir</th><th className="pb-3 font-medium">Ravza randevu hakkı</th><th className="pb-3 font-medium">Durum</th><th className="pb-3 text-right font-medium">İşlem</th></tr></thead>
              <tbody>
                {visible.map((agency) => (
                  <tr key={agency.id} className="border-b border-border/70 last:border-0">
                    <td aria-label={`Acente: ${agency.name}`} className="py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-muted"><Building2 aria-hidden="true" className="size-4" /></span><span><strong className="block">{agency.name}</strong><span className="font-mono text-[11px] text-muted-foreground">{agency.id}</span></span></div></td>
                    <td className="py-4">{agency.contact}</td><td className="py-4 text-muted-foreground">{agency.city}</td><td className="py-4">{agency.credits}</td>
                    <td className="py-4"><Badge variant="outline" className={agency.status === 'active' ? 'border-[#6c9c83] text-[#19613f]' : agency.status === 'rejected' ? 'border-[#c67755] text-[#9f432b]' : 'border-[#c9a86a] text-[#715724]'}>{statusLabel[agency.status]}</Badge></td>
                    <td className="py-4 text-right"><Button size="sm" variant="outline" onClick={() => setSelected(agency)}><Eye /> İncele</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visible.length && <p className="py-10 text-center text-sm text-muted-foreground">Bu filtrede acente bulunamadı.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-0 bg-[#f3eee5] ring-1 ring-[#d7c9ae]">
          <CardHeader><CardTitle className="font-serif text-2xl">Değiştirilemez denetim izi</CardTitle><CardDescription>Yüksek riskli her demo kararı gerekçe ve zamanla kaydedilir.</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {audits.length ? (
              audits.slice(0, 6).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-4 rounded-xl bg-white/75 p-3">
                  <span>{auditActionLabel[entry.action] ?? entry.action} · {entry.targetId}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTimeFromNow(entry.createdAt)}</span>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-white/75 p-3 text-xs text-muted-foreground">Henüz kaydedilmiş demo denetim olayı yok.</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-[#c67755]/35 bg-[#fff7f3]">
          <CardHeader><div className="mb-1 grid size-10 place-items-center rounded-xl bg-white text-[#9f432b]"><ShieldAlert /></div><CardTitle className="font-serif text-2xl">Canlı işlem kapısı</CardTitle><CardDescription>Sağlayıcı sözleşmesi ve sandbox E2E doğrulanana kadar ödeme, randevu hakkı düzeltmesi ve gerçek onay işlemleri açılamaz.</CardDescription></CardHeader>
        </Card>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-serif text-2xl">{selected?.name}</DialogTitle><DialogDescription>{selected?.id} · Kişisel alanlar güvenli demo için maskelenmiştir.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-4 text-sm"><span className="text-muted-foreground">Yetkili</span><strong className="text-right">{selected?.contact}</strong><span className="text-muted-foreground">Şehir</span><strong className="text-right">{selected?.city}</strong><span className="text-muted-foreground">Mevcut durum</span><strong className="text-right">{selected ? statusLabel[selected.status] : ''}</strong></div>
          <p className="text-xs leading-5 text-muted-foreground">Karar bu ekrandaki acente kaydını günceller. Hesap açma ve bildirim gönderimi, üyelik akışı bağlandığında devreye girer.</p>
          <DialogFooter className="sm:justify-between"><Button variant="outline" disabled={saving} onClick={() => updateStatus('rejected')}><X /> Reddet</Button><Button disabled={saving} onClick={() => updateStatus('active')}>{saving ? <LoaderCircle className="animate-spin" /> : <Check />}{saving ? 'Kaydediliyor' : 'Onayla'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

