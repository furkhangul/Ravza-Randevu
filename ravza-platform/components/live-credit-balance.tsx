'use client';

import { RefreshCw } from 'lucide-react';
import { useCreditSummary } from '@/components/panel-providers';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function LiveCreditBalance() {
  const { summary, loading, failed, refresh } = useCreditSummary();
  return (
    <Card className="border-0 bg-primary text-primary-foreground">
      <CardHeader>
        <CardDescription className="text-white/60">
          RawdahBooking · kullanılabilir randevu hakkı
        </CardDescription>
        <CardTitle
          className="font-serif text-5xl tabular-nums"
          aria-live="polite"
        >
          {summary
            ? summary.remaining.toLocaleString('tr-TR')
            : loading
              ? '…'
              : '—'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-white/70">
          {failed
            ? 'Bakiye şu anda okunamıyor. Yeniden deneyebilirsiniz.'
            : 'Bağlı RawdahBooking hesabının güncel bakiyesi.'}
        </p>
        {summary && (
          <p className="text-xs text-white/60">
            Son kontrol:{' '}
            {new Date(summary.fetchedAt).toLocaleString('tr-TR', {
              timeZone: 'Asia/Riyadh',
            })}{' '}
            · Medine saati
          </p>
        )}
        <Button variant="secondary" disabled={loading} onClick={refresh}>
          <RefreshCw className={loading ? 'animate-spin' : ''} /> Bakiyeyi
          yenile
        </Button>
      </CardContent>
    </Card>
  );
}
