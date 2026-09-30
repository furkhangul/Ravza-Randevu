'use client';

import { LiveCreditBalance } from '@/components/live-credit-balance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MembershipWorkbench() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <LiveCreditBalance />
      <Card>
        <CardHeader>
          <CardTitle>Üyelik ve paket bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          Üyelik planı, toplam satın alınan hak ve paket geçmişi mevcut API
          yanıtında bulunmuyor. Bu bilgiler için RawdahBooking hesabınızı
          kontrol edebilirsiniz.
        </CardContent>
      </Card>
    </div>
  );
}
