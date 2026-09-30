'use client';

import { LiveCreditBalance } from '@/components/live-credit-balance';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function LedgerWorkbench() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <LiveCreditBalance />
      <Card>
        <CardHeader>
          <CardTitle>Randevu hakkı hareketleri</CardTitle>
          <CardDescription>RawdahBooking hesap geçmişi</CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          Sağlayıcının mevcut API hizmeti kalan bakiyeyi bildiriyor; satın alma,
          kullanım ve iade geçmişini sunmuyor. Ayrıntılı hareketleri
          RawdahBooking hesabınızdan inceleyebilirsiniz.
        </CardContent>
      </Card>
    </div>
  );
}
