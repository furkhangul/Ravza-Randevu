'use client';

import { useState } from 'react';
import Link from '@/components/safe-link';
import { CheckCircle2, Save, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function ProfileForm() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_.65fr]">
      <Card className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border">
        <CardHeader><CardTitle className="font-serif text-2xl">Firma bilgileri</CardTitle><CardDescription>Bu form firma profilini yerel olarak günceller; muhasebe ve fatura sistemine aktarım ayrıca bağlanır.</CardDescription></CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setSaved(true); }}>
            <label htmlFor="company-name" className="space-y-2 text-sm font-medium">Firma adı<Input id="company-name" defaultValue="Hira Turizm" className="h-11" /></label>
            <label htmlFor="contact-name" className="space-y-2 text-sm font-medium">Yetkili kişi<Input id="contact-name" defaultValue="Furkan G." className="h-11" /></label>
            <label htmlFor="company-email" className="space-y-2 text-sm font-medium">E-posta<Input id="company-email" type="email" defaultValue="operasyon@firma.com" className="h-11" /></label>
            <label htmlFor="company-phone" className="space-y-2 text-sm font-medium">Telefon<Input id="company-phone" defaultValue="+90 5•• ••• •• 41" className="h-11" /></label>
            <label htmlFor="tursab-number" className="space-y-2 text-sm font-medium">TÜRSAB no<Input id="tursab-number" defaultValue="A-••••" className="h-11" /></label>
            <label htmlFor="tax-number" className="space-y-2 text-sm font-medium">Vergi no<Input id="tax-number" defaultValue="••••••••21" className="h-11" /></label>
            <div className="flex flex-col gap-3 pt-2 sm:col-span-2 sm:flex-row sm:items-center">
              <Button type="submit" className="h-11 rounded-xl"><Save /> Yerel taslağı kaydet</Button>
              {saved && <span className="flex items-center gap-2 text-sm font-medium text-[#19613f]"><CheckCircle2 className="size-4" /> Taslak bu oturum için kaydedildi.</span>}
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="border-0 bg-primary text-primary-foreground">
        <CardHeader><div className="mb-2 grid size-11 place-items-center rounded-2xl bg-white/10"><ShieldCheck /></div><CardTitle className="font-serif text-2xl">Hesap güvenliği</CardTitle><CardDescription className="text-primary-foreground/65">Yönetici hesaplarında MFA ve yeniden kimlik doğrulama canlıya geçişten önce zorunlu olacak.</CardDescription></CardHeader>
        <CardContent className="space-y-3 text-sm text-primary-foreground/80"><p>• Aktif rol: Acente yöneticisi</p><p>• Son oturum: Bu cihaz</p><p>• Bildirim kanalı: Bağlı değil</p><div className="grid gap-2 pt-2"><Link href="/mfa" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/25 text-sm font-medium text-white">MFA demosunu aç</Link><Link href="/notification-channels" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/25 text-sm font-medium text-white">Bildirim tercihleri</Link><Link href="/dashboard/membership" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#d2b77b] text-sm font-semibold text-[#071c14]">Üyelik ve haklar</Link></div></CardContent>
      </Card>
    </div>
  );
}
