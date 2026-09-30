'use client';

import { useEffect, useState } from 'react';
import {
  Clock3,
  Download,
  ExternalLink,
  LoaderCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Order = {
  id: string;
  groupCode: string;
  visitWindow: string;
  passengerCount: number;
  status: string;
};

type LiveGroup = {
  dateKey: string;
  groupCode: string;
  appointmentTime: string;
  genderId: 8 | 9;
  gender: 'Male' | 'Female';
  purchaseId: string | null;
  printGuid: string | null;
  confirmedCount: number;
  printedCount: number;
  totalCount: number;
  groupKey: string;
};

export function QrCenterWorkbench() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [live, setLive] = useState<{
    status: 'loading' | 'ready' | 'empty' | 'error';
    groups: LiveGroup[];
  }>({ status: 'loading', groups: [] });
  const [loadingId, setLoadingId] = useState('');

  const loadDemo = () =>
    fetch('/api/demo/state')
      .then((response) => response.json())
      .then((value: unknown) => {
        const state = value as { orders?: Order[] };
        if (state.orders) {
          setOrders(
            state.orders.filter((order) => order.status !== 'completed'),
          );
        }
      });

  useEffect(() => {
    void loadDemo();
    const controller = new AbortController();
    fetch('/api/provider/qr-groups', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('qr_groups_failed');
        return response.json() as Promise<{ groups?: LiveGroup[] }>;
      })
      .then((result) => {
        const groups = result.groups ?? [];
        setLive({ status: groups.length ? 'ready' : 'empty', groups });
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') {
          return;
        }
        setLive({ status: 'error', groups: [] });
      });
    return () => controller.abort();
  }, []);

  async function advance(orderId: string) {
    setLoadingId(orderId);
    try {
      const response = await fetch('/api/demo/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'advance_order', orderId }),
      });
      if (response.ok) await loadDemo();
    } finally {
      setLoadingId('');
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">
              RawdahBooking · salt okunur
            </p>
            <h2 className="mt-1 font-serif text-2xl">Yaklaşan QR grupları</h2>
          </div>
          {live.status === 'ready' && (
            <Badge variant="outline">{live.groups.length} grup</Badge>
          )}
        </div>

        {live.status === 'loading' && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Canlı QR grupları okunuyor…
          </p>
        )}
        {live.status === 'empty' && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Bugün veya gelecek tarihler için QR grubu bulunamadı.
          </p>
        )}
        {live.status === 'error' && (
          <p className="rounded-2xl bg-[#fff1eb] p-4 text-sm text-[#9f432b]">
            Canlı QR grup listesi şu anda okunamadı. Yerel kayıtlar
            aşağıda kullanılabilir.
          </p>
        )}
        {live.status === 'ready' && (
          <div className="grid gap-4 xl:grid-cols-3">
            {live.groups.map((group) => (
              <Card
                key={group.groupKey}
                className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-11 place-items-center rounded-2xl bg-[#e8f2ed] text-[#19613f]">
                      <QrCode />
                    </div>
                    <Badge
                      variant="outline"
                      className="border-[#6c9c83] text-[#19613f]"
                    >
                      Canlı grup
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 font-serif text-2xl">
                    {group.groupCode}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Clock3 className="size-4" />
                    {group.dateKey} · {group.appointmentTime} ·{' '}
                    {group.gender === 'Female' ? 'Kadın' : 'Erkek'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-[#e8f2ed] p-3">
                      <span className="block font-serif text-2xl text-[#19613f]">
                        {group.confirmedCount}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Hazır
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#f1e8d7] p-3">
                      <span className="block font-serif text-2xl text-[#715724]">
                        {group.printedCount}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Yazdırıldı
                      </span>
                    </div>
                    <div className="rounded-xl bg-muted p-3">
                      <span className="block font-serif text-2xl">
                        {group.totalCount}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Toplam
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button className="flex-1" disabled>
                      <ExternalLink /> Paylaş
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="PDF indir"
                      disabled
                    >
                      <Download />
                    </Button>
                  </div>
                  <p className="mt-3 flex gap-2 text-xs leading-5 text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" /> Paylaşım
                    ve PDF, ilgili sözleşmeler doğrulanana kadar kapalıdır.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
            Yerel çalışma alanı
          </p>
          <h2 className="mt-1 font-serif text-2xl">Demo durum kayıtları</h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {orders.map((order) => {
            const ready = order.status === 'qr_ready';
            const review = order.status === 'unknown';
            const pending =
              order.status === 'qr_pending' ||
              order.status === 'provider_pending';
            return (
              <Card
                key={order.id}
                className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid size-11 place-items-center rounded-2xl bg-muted text-primary">
                      <QrCode />
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        ready
                          ? 'border-[#6c9c83] text-[#19613f]'
                          : review
                            ? 'border-[#c67755] text-[#9f432b]'
                            : 'border-[#c9a86a] text-[#715724]'
                      }
                    >
                      {ready
                        ? 'QR hazır'
                        : review
                          ? 'Kontrol gerekli'
                          : order.status === 'provider_pending'
                            ? 'Sağlayıcı sonucu bekleniyor'
                            : 'QR bekleniyor'}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 font-serif text-2xl">
                    {order.groupCode}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Clock3 className="size-4" />
                    {order.visitWindow} · Medine
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#e8f2ed] p-3">
                      <span className="block font-serif text-3xl text-[#19613f]">
                        {ready ? order.passengerCount : 0}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Hazır
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#f1e8d7] p-3">
                      <span className="block font-serif text-3xl text-[#715724]">
                        {ready ? 0 : order.passengerCount}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Bekleyen
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button className="flex-1" disabled={!ready}>
                      <ExternalLink /> Paylaş
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="PDF indir"
                      disabled={!ready}
                    >
                      <Download />
                    </Button>
                  </div>
                  {pending && (
                    <Button
                      variant="ghost"
                      className="mt-2 w-full text-primary"
                      disabled={loadingId === order.id}
                      onClick={() => advance(order.id)}
                    >
                      {loadingId === order.id ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <RefreshCw />
                      )}
                      Demo durumunu ilerlet
                    </Button>
                  )}
                  <p className="mt-3 flex gap-2 text-xs leading-5 text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" /> Demo
                    bağlantısı üretilmez; gerçek link TTL ve iptal politikası
                    bekliyor.
                  </p>
                </CardContent>
              </Card>
            );
          })}
          {!orders.length && (
            <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Yerel siparişler yükleniyor.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
