'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, LockKeyhole, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';

export function MembershipWorkbench() {
  const [autoRenew, setAutoRenew] = useState(false);
  const [credits, setCredits] = useState(248);
  useEffect(() => { fetch('/api/demo/state').then((response) => response.json()).then((value: unknown) => { const state = value as { credits?: number }; if (typeof state.credits === 'number') setCredits(state.credits); }).catch(() => undefined); }, []);
  const history = [{ id: 'PKG-DEMO-250', amount: '250 hak', status: 'Etkin', icon: CheckCircle2 }, { id: 'PKG-DEMO-050', amount: '50 hak', status: 'Süresi doldu', icon: Clock3 }];
  return <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Card className="border-0 bg-primary text-primary-foreground"><CardHeader><div className="flex items-center justify-between"><Badge className="bg-white/12 text-white">Aktif demo</Badge><span className="text-xs text-white/55">Tek seferlik</span></div><CardTitle className="mt-5 font-serif text-3xl">Operasyon 250</CardTitle><CardDescription className="text-white/60">Ravza randevu hakkı hak havuzu</CardDescription></CardHeader><CardContent><div className="flex items-end justify-between"><span className="font-serif text-5xl">{credits}</span><span className="pb-1 text-sm text-white/60">/ 250 hak</span></div><Progress value={Math.max(0, Math.min(100, credits / 2.5))} className="mt-4 bg-white/15" /><div className="mt-6 flex items-center justify-between rounded-xl bg-white/8 p-4 text-sm"><span className="flex items-center gap-2"><RefreshCw className="size-4" /> Otomatik yenileme</span><Switch checked={autoRenew} onCheckedChange={setAutoRenew} aria-label="Otomatik yenileme demo tercihi" /></div><p className="mt-3 text-xs leading-5 text-white/55">Tercih yalnız arayüz demosudur; ödeme veya abonelik başlatmaz.</p></CardContent></Card><Card className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border"><CardHeader><CardTitle className="font-serif text-2xl">Paket geçmişi</CardTitle><CardDescription>Ticari belge değildir; randevu hakkı defteri hareketleriyle eşleşir.</CardDescription></CardHeader><CardContent className="space-y-3">{history.map(({ id, amount, status, icon: Icon }) => <div key={id} className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-muted"><Icon className="size-4" /></span><span><strong className="block font-mono text-xs">{id}</strong><span className="text-xs text-muted-foreground">{amount}</span></span></div><Badge variant="outline">{status}</Badge></div>)}<Button disabled variant="outline" className="mt-2 w-full"><LockKeyhole /> Fatura geçmişi · entegrasyon bekliyor</Button></CardContent></Card></div>;
}

