'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  LoaderCircle,
  Minus,
  Plus,
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const demoSlots = [
  { timeSlot: '08:00', window: '08:00-08:20', gender: 'Kadın', available: 50 },
  { timeSlot: '11:20', window: '11:20-11:40', gender: 'Erkek', available: 0 },
  { timeSlot: '16:00', window: '16:00-16:20', gender: 'Erkek', available: 18 },
  { timeSlot: '21:20', window: '21:20-21:40', gender: 'Kadın', available: 9 },
];

type Slot = (typeof demoSlots)[number];

function localIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function displayDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function BookingWorkbench() {
  const [date, setDate] = useState(localIsoDate);
  const [slots, setSlots] = useState<Slot[]>(demoSlots);
  const [selected, setSelected] = useState<Slot>(demoSlots[0]);
  const [slotSource, setSlotSource] = useState<
    'loading' | 'live' | 'demo' | 'error'
  >('loading');
  const [providerHasBalance, setProviderHasBalance] = useState<boolean | null>(
    null,
  );
  const [count, setCount] = useState(2);
  const [groupCode, setGroupCode] = useState('EYLUL-04-A');
  const [open, setOpen] = useState(false);
  const [complete, setComplete] = useState(false);
  const [credits, setCredits] = useState(248);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState('');
  const idempotencyKey = useRef('');
  const remaining = useMemo(() => credits - count, [count, credits]);

  useEffect(() => {
    fetch('/api/demo/state')
      .then((response) => response.json())
      .then((value: unknown) => {
        const state = value as { credits?: number };
        if (typeof state.credits === 'number') setCredits(state.credits);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/provider/availability?date=${encodeURIComponent(date)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Takvim okunamadı.');
        return response.json() as Promise<{
          slots?: Array<{
            timeSlot: string;
            window: string;
            gender: 'female' | 'male';
            available: number | '50+';
          }>;
          hasBalance?: boolean | null;
        }>;
      })
      .then((result) => {
        const next = (result.slots ?? []).map((slot) => ({
          timeSlot: slot.timeSlot,
          window: slot.window,
          gender: slot.gender === 'female' ? 'Kadın' : 'Erkek',
          available: slot.available === '50+' ? 50 : slot.available,
        }));
        setSlots(next);
        setSelected(
          next.find((slot) => slot.available > 0) ?? next[0] ?? demoSlots[0],
        );
        setProviderHasBalance(result.hasBalance ?? null);
        setSlotSource('live');
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError')
          return;
        setSlots(demoSlots);
        setSelected(demoSlots[0]);
        setProviderHasBalance(null);
        setSlotSource('error');
      });
    return () => controller.abort();
  }, [date]);

  async function createDemoOrder() {
    setSaving(true);
    setError('');
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    try {
      const response = await fetch('/api/demo/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'create_order',
          groupCode,
          visitWindow: selected.window,
          gender: selected.gender,
          passengerCount: count,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        orderId?: string;
        state?: { credits?: number };
      };
      if (!response.ok)
        throw new Error(result.error ?? 'Sipariş oluşturulamadı.');
      setOrderId(result.orderId ?? 'ORD-DEMO');
      if (typeof result.state?.credits === 'number')
        setCredits(result.state.credits);
      setComplete(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Sipariş oluşturulamadı.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <Card className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="font-serif text-2xl">
                {displayDate(date)}
              </CardTitle>
              <CardDescription>
                Medine saati · RawdahBooking salt-okunur takvimi
              </CardDescription>
            </div>
            <Badge
              className={
                slotSource === 'live'
                  ? 'bg-[#e8f2ed] text-[#19613f] hover:bg-[#e8f2ed]'
                  : 'bg-[#f1e8d7] text-[#715724] hover:bg-[#f1e8d7]'
              }
            >
              {slotSource === 'live'
                ? 'Canlı kaynak · okuma'
                : slotSource === 'loading'
                  ? 'Yükleniyor'
                  : 'Yerel kayıt'}
            </Badge>
          </div>
          <div className="mt-4 max-w-52">
            <label
              htmlFor="appointment-date"
              className="mb-2 block text-xs font-medium text-muted-foreground"
            >
              Takvim tarihi
            </label>
            <Input
              id="appointment-date"
              type="date"
              value={date}
              onChange={(event) => {
                setSlotSource('loading');
                setDate(event.target.value);
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {slots.length === 0 && (
            <p className="col-span-full rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
              Bu tarih için saat kaydı bulunamadı.
            </p>
          )}
          {slots.map((slot) => {
            const disabled = slot.available <= 0;
            const active =
              selected.window === slot.window &&
              selected.gender === slot.gender;
            return (
              <button
                key={`${slot.gender}-${slot.window}`}
                type="button"
                disabled={disabled}
                onClick={() => setSelected(slot)}
                className={`min-h-24 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-45 ${active ? 'border-primary bg-primary text-primary-foreground shadow-lg' : 'border-border bg-card hover:border-[#c9a86a]'}`}
              >
                <span className="block font-serif text-2xl">{slot.window}</span>
                <span
                  className={`mt-2 flex items-center justify-between text-xs ${active ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                >
                  <span>{slot.gender}</span>
                  <span>
                    {disabled ? 'Tükendi' : `${slot.available} uygun`}
                  </span>
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-0 bg-[#f3eee5] ring-1 ring-[#d7c9ae]">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Randevu özeti</CardTitle>
          <CardDescription>
            Randevu hakkı kullanımından önce çift onay uygulanır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white/75 p-4 text-sm">
            <span className="text-muted-foreground">Ziyaret</span>
            <strong className="text-right">{selected.window}</strong>
            <span className="text-muted-foreground">Grup</span>
            <strong className="text-right">{selected.gender}</strong>
            <span className="text-muted-foreground">Kalan randevu hakkı</span>
            <strong className="text-right">{remaining}</strong>
            <span className="text-muted-foreground">Sağlayıcı bakiyesi</span>
            <strong className="text-right">
              {providerHasBalance === true
                ? 'Yeterli'
                : providerHasBalance === false
                  ? 'Yetersiz'
                  : 'Bilinmiyor'}
            </strong>
          </div>
          <div>
            <label
              htmlFor="group-code"
              className="mb-2 block text-sm font-medium"
            >
              Grup kodu{' '}
              <span className="text-muted-foreground">(isteğe bağlı)</span>
            </label>
            <Input
              id="group-code"
              value={groupCode}
              onChange={(event) => setGroupCode(event.target.value)}
              className="h-11 bg-white"
              maxLength={24}
            />
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium">Kişi sayısı</span>
            <div className="flex items-center justify-between rounded-xl border border-border bg-white p-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Kişi sayısını azalt"
                onClick={() => setCount((value) => Math.max(1, value - 1))}
              >
                <Minus />
              </Button>
              <strong>{count}</strong>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Kişi sayısını artır"
                onClick={() => setCount((value) => Math.min(10, value + 1))}
              >
                <Plus />
              </Button>
            </div>
          </div>
          <Button
            className="h-11 w-full rounded-xl"
            onClick={() => {
              setComplete(false);
              setError('');
              setOrderId('');
              idempotencyKey.current = crypto.randomUUID();
              setOpen(true);
            }}
          >
            <CalendarDays /> Kontrol et
          </Button>
          <p className="flex gap-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" /> Takvim canlı
            kaynaktan yalnızca okunur. Bu düğme randevu kaydını oluşturur;
            sağlayıcıya satın alma isteği, ticari sözleşme tamamlandığında
            gönderilir.
          </p>
          {providerHasBalance === false && (
            <p className="flex gap-2 rounded-xl bg-[#fff1eb] p-3 text-xs leading-5 text-[#9f432b]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Rawdah hesabı
              satın alma için yeterli bakiye bildirmiyor. Canlı satın alma kapalı
              olduğu için bu kayıt randevu hakkı kullanmaz.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {complete ? (
            <>
              <DialogHeader>
                <div className="mb-2 grid size-12 place-items-center rounded-full bg-[#e8f2ed] text-[#19613f]">
                  <Check />
                </div>
                <DialogTitle className="font-serif text-2xl">
                  Sipariş oluşturuldu
                </DialogTitle>
                <DialogDescription>
                  <span className="font-mono">{orderId}</span> kaydedildi ve
                  sağlayıcı onayı bekleyen randevular kuyruğuna alındı.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button />}>Tamam</DialogClose>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">
                  İşlemi ikinci kez doğrula
                </DialogTitle>
                <DialogDescription>
                  {count} kişi için {selected.window} penceresinde demo
                  randevusu oluşturulacak.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl bg-muted p-4 text-sm">
                <div className="flex justify-between">
                  <span>Kullanılacak randevu hakkı</span>
                  <strong>{count}</strong>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>İşlem sonrası</span>
                  <strong>{remaining}</strong>
                </div>
              </div>
              {error && (
                <p className="flex items-center gap-2 rounded-xl bg-[#fff1eb] p-3 text-sm text-[#9f432b]">
                  <AlertTriangle className="size-4" />
                  {error}
                </p>
              )}
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Vazgeç
                </DialogClose>
                <Button
                  disabled={saving || remaining < 0}
                  onClick={createDemoOrder}
                >
                  {saving ? <LoaderCircle className="animate-spin" /> : null}
                  {saving ? 'Kaydediliyor' : 'Randevu talebi oluştur'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

