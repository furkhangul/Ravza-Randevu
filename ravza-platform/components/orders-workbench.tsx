'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Globe,
  RefreshCw,
  Search,
  QrCode,
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
import { Input } from '@/components/ui/input';

type OrderDisplayItem = {
  id: string;
  source: 'web' | 'demo';
  group: string;
  time: string;
  count: number;
  status: string;
  amount?: string;
  customer?: string;
  isArchived?: boolean;
  qrReadyCount?: number;
  canApprove?: boolean;
};

const initialOrders: OrderDisplayItem[] = [
  {
    id: 'ORD-DEMO-1042',
    source: 'demo',
    group: 'EYLUL-04-A',
    time: 'Bugün · 17:00–17:20',
    count: 3,
    status: 'qr_ready',
  },
  {
    id: 'ORD-DEMO-1043',
    source: 'demo',
    group: 'EYLUL-04-B',
    time: 'Bugün · 19:00–19:20',
    count: 4,
    status: 'qr_pending',
  },
  {
    id: 'ORD-DEMO-1044',
    source: 'demo',
    group: 'EYLUL-04-C',
    time: 'Yarın · 21:20–21:40',
    count: 1,
    status: 'unknown',
  },
  {
    id: 'ORD-DEMO-1041',
    source: 'demo',
    group: 'EYLUL-03-D',
    time: 'Dün · 08:00–08:20',
    count: 5,
    status: 'completed',
  },
];

const statusText: Record<string, string> = {
  all: 'Tümü',
  confirmed: 'Onaylandı',
  qr_ready: 'QR hazır',
  qr_pending: 'QR bekliyor',
  awaiting_payment: 'Ödeme bekleniyor',
  unknown: 'Kontrol gerekli',
  completed: 'Tamamlandı',
  archived: 'Eski işlem',
};

export function OrdersWorkbench() {
  const [orders, setOrders] = useState<OrderDisplayItem[]>(initialOrders);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const visible = orders.filter(
    (order) =>
      (filter === 'all' ||
        (filter === 'archived' ? order.isArchived : order.status === filter)) &&
      `${order.id} ${order.group} ${order.customer ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  async function approveOrder(orderId: string) {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/customer-orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'update_order_status',
          orderId,
          status: 'confirmed',
        }),
      });
      if (!response.ok) throw new Error('approval_failed');
      await refreshOrders();
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  async function refreshOrders() {
    setLoading(true);
    try {
      const items: OrderDisplayItem[] = [];

      // 1. Fetch web customer orders
      try {
        const customerRes = await fetch('/api/admin/customer-orders');
        if (customerRes.ok) {
          const customerData = (await customerRes.json()) as {
            orders?: Array<{
              id: string;
              packageName: string;
              passengerCount: number;
              amountMinor: number;
              currency: string;
              ravzaVisitDate: string;
              status: string;
              customerEmail: string;
              isArchived: boolean;
              passengers?: Array<{ qrPayload?: string }>;
            }>;
          };
          for (const ord of customerData.orders ?? []) {
            items.push({
              id: ord.id,
              source: 'web',
              group: ord.packageName,
              time: `${ord.ravzaVisitDate} (Ravza)`,
              count: ord.passengerCount,
              status: ord.status,
              amount: `$${(ord.amountMinor / 100).toLocaleString('en-US')}`,
              customer: ord.customerEmail,
              isArchived: ord.isArchived,
              qrReadyCount: (ord.passengers ?? []).filter((passenger) => passenger.qrPayload).length,
              canApprove: ord.status !== 'confirmed' && !ord.isArchived,
            });
          }
        }
      } catch {
        // Continue to demo orders
      }

      // 2. Fetch demo internal orders
      const demoRes = await fetch('/api/demo/state');
      if (demoRes.ok) {
        const state = (await demoRes.json()) as {
          orders?: Array<{
            id: string;
            groupCode: string;
            visitWindow: string;
            passengerCount: number;
            status: string;
          }>;
        };
        if (state.orders) {
          for (const ord of state.orders) {
            items.push({
              id: ord.id,
              source: 'demo',
              group: ord.groupCode,
              time: ord.visitWindow,
              count: ord.passengerCount,
              status: ord.status,
            });
          }
        }
      }

      if (items.length > 0) setOrders(items);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch('/api/admin/customer-orders')
      .then(async (customerRes) => {
        const items: OrderDisplayItem[] = [];
        if (customerRes.ok) {
          const customerData = (await customerRes.json()) as {
            orders?: Array<{
              id: string;
              packageName: string;
              passengerCount: number;
              amountMinor: number;
              currency: string;
              ravzaVisitDate: string;
              status: string;
              customerEmail: string;
              isArchived: boolean;
              passengers?: Array<{ qrPayload?: string }>;
            }>;
          };
          for (const ord of customerData.orders ?? []) {
            items.push({
              id: ord.id,
              source: 'web',
              group: ord.packageName,
              time: `${ord.ravzaVisitDate} (Ravza)`,
              count: ord.passengerCount,
              status: ord.status,
              amount: `$${(ord.amountMinor / 100).toLocaleString('en-US')}`,
              customer: ord.customerEmail,
              isArchived: ord.isArchived,
              qrReadyCount: (ord.passengers ?? []).filter((passenger) => passenger.qrPayload).length,
              canApprove: ord.status !== 'confirmed' && !ord.isArchived,
            });
          }
        }
        const demoRes = await fetch('/api/demo/state');
        if (demoRes.ok) {
          const state = (await demoRes.json()) as {
            orders?: Array<{
              id: string;
              groupCode: string;
              visitWindow: string;
              passengerCount: number;
              status: string;
            }>;
          };
          if (state.orders) {
            for (const ord of state.orders) {
              items.push({
                id: ord.id,
                source: 'demo',
                group: ord.groupCode,
                time: ord.visitWindow,
                count: ord.passengerCount,
                status: ord.status,
              });
            }
          }
        }
        if (active && items.length > 0) setOrders(items);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border">
      <CardHeader className="gap-4 border-b border-border pb-4 md:flex md:flex-row md:items-end md:justify-between">
        <div>
          <CardTitle className="font-serif text-2xl">
            Sipariş ve Rezervasyon Hareketleri
          </CardTitle>
          <CardDescription>
            Web sitesi son kullanıcı paket satışları ve acente kafile
            operasyonları tek defterde.
          </CardDescription>
        </div>
        <div className="flex w-full gap-2 md:max-w-sm">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Sipariş, müşteri veya grup ara"
              className="h-10 bg-background pl-9"
            />
          </div>
          <Button
            size="icon"
            variant="outline"
            aria-label="Siparişleri yenile"
            disabled={loading}
            onClick={refreshOrders}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#c67755]/40 bg-[#fff7f3] p-3 text-sm text-[#9f432b]">
            <AlertTriangle className="size-4 shrink-0" />
            Siparişler yenilenemedi; gösterilen liste güncel olmayabilir.
          </div>
        ) : null}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {Object.keys(statusText).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? 'default' : 'outline'}
              onClick={() => setFilter(key)}
            >
              {statusText[key]}
            </Button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="pb-3 font-medium">Sipariş</th>
                <th className="pb-3 font-medium">Kanal / Tur</th>
                <th className="pb-3 font-medium">Ziyaret / Tarih</th>
                <th className="pb-3 font-medium">Kişi</th>
                <th className="pb-3 font-medium">Tutar</th>
                <th className="pb-3 font-medium">Durum</th>
                <th className="pb-3 text-right font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="py-4 font-mono text-xs font-semibold">
                    {order.id}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-1.5 font-medium">
                      {order.source === 'web' && (
                        <Globe className="size-3.5 text-blue-600" />
                      )}
                      {order.group}
                    </div>
                    {order.customer && (
                      <div className="text-xs text-muted-foreground">
                        {order.customer}
                      </div>
                    )}
                  </td>
                  <td className="py-4 text-muted-foreground">{order.time}</td>
                  <td className="py-4">{order.count}</td>
                  <td className="py-4 font-medium">{order.amount ?? '—'}</td>
                  <td className="py-4">
                    <Badge
                      variant="outline"
                      className={
                        order.status === 'unknown'
                          ? 'border-[#c67755] text-[#9f432b]'
                          : order.status === 'qr_ready' ||
                              order.status === 'completed' ||
                              order.status === 'confirmed'
                            ? 'border-[#6c9c83] text-[#19613f]'
                            : 'border-[#c9a86a] text-[#715724]'
                      }
                    >
                      {order.status === 'unknown' ? (
                        <AlertTriangle className="mr-1 size-3" />
                      ) : order.status === 'qr_ready' ||
                        order.status === 'completed' ||
                        order.status === 'confirmed' ? (
                        <CheckCircle2 className="mr-1 size-3" />
                      ) : (
                        <Clock3 className="mr-1 size-3" />
                      )}
                      {statusText[order.status] ?? order.status}
                    </Badge>
                  </td>
                  <td className="py-4 text-right">
                    {order.source === 'web' && order.canApprove ? (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={loading}
                        onClick={() => void approveOrder(order.id)}
                      >
                        <QrCode className="size-3.5" />
                        Onayla ve QR üret
                      </Button>
                    ) : order.source === 'web' && order.qrReadyCount ? (
                      <span className="text-xs text-[#19613f]">
                        {order.qrReadyCount} QR hazır
                      </span>
                    ) : order.isArchived ? (
                      <span className="text-xs text-muted-foreground">Arşivde</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Bu filtrede sipariş bulunamadı.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
