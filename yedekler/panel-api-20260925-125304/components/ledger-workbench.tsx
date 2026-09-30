'use client';

import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, BookOpenCheck, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Entry = { id: string; orderId: string | null; amount: number; type: string; referenceKey: string; createdAt: number };

export function LedgerWorkbench() {
  const [credits, setCredits] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  useEffect(() => { fetch('/api/demo/state').then((response) => response.json()).then((value: unknown) => { const state = value as { credits?: number; ledger?: Entry[] }; if (typeof state.credits === 'number') setCredits(state.credits); if (state.ledger) setEntries(state.ledger); }).catch(() => undefined); }, []);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-[.7fr_1.3fr]"><Card className="border-0 bg-primary text-primary-foreground"><CardHeader><CardDescription className="text-white/60">Kullanılabilir demo randevu hakkını</CardDescription><CardTitle className="font-serif text-5xl">{credits}</CardTitle></CardHeader><CardContent className="flex items-center gap-2 text-xs text-white/60"><ShieldCheck className="size-4" /> Bakiye ledger toplamından hesaplanır.</CardContent></Card><Card className="border-0 bg-[#f3eee5] ring-1 ring-[#d7c9ae]"><CardHeader><div className="flex items-center gap-3"><BookOpenCheck className="text-primary" /><CardTitle className="font-serif text-2xl">Çift taraflı kayıt mantığı</CardTitle></div><CardDescription>Ravza randevu hakkı yalnız kullanıcı tablosundaki sayaçtan ibaret değildir. Her rezervasyon, tüketim, iade ve düzeltme benzersiz referansla eklemeli kayda dönüşür.</CardDescription></CardHeader></Card></div><Card className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border"><CardHeader><CardTitle className="font-serif text-2xl">Randevu hakkı hareketleri</CardTitle><CardDescription>Randevu hakkı defteri · normal arayüzden silinemez</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase tracking-[.1em] text-muted-foreground"><th className="pb-3 font-medium">Hareket</th><th className="pb-3 font-medium">Sipariş</th><th className="pb-3 font-medium">Tür</th><th className="pb-3 font-medium">Referans</th><th className="pb-3 text-right font-medium">Miktar</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id} className="border-b border-border/70 last:border-0"><td className="py-4 font-mono text-xs">{entry.id}</td><td className="py-4 font-mono text-xs text-muted-foreground">{entry.orderId ?? '—'}</td><td className="py-4"><Badge variant="outline">{entry.type}</Badge></td><td className="py-4 font-mono text-xs text-muted-foreground">{entry.referenceKey}</td><td className={`py-4 text-right font-semibold ${entry.amount > 0 ? 'text-[#19613f]' : 'text-[#9f432b]'}`}><span className="inline-flex items-center gap-1">{entry.amount > 0 ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}{entry.amount > 0 ? '+' : ''}{entry.amount}</span></td></tr>)}</tbody></table></CardContent></Card></div>;
}

