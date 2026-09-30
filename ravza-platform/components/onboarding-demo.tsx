'use client';

import { useState } from 'react';
import Link from '@/components/safe-link';
import { ArrowRight, CheckCircle2, KeyRound, MailCheck, ShieldCheck } from 'lucide-react';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export function RegisterDemo() {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) return <SuccessState icon={MailCheck} title="Başvurunuz alındı" description="Hesabınızı etkinleştirmek için e-posta doğrulama adımına geçin." href="/verify-email" action="Doğrulamaya devam et" />;
  return <AuthFrame title="Acente başvurusu" description="Acente hesabınızı oluşturun; ekibinizi ve yetkilerinizi panelden yönetin."><form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}><label htmlFor="register-name" className="space-y-2 text-sm font-medium">Ad soyad<Input id="register-name" required className="h-11" placeholder="Yetkili kişi" /></label><label htmlFor="register-company" className="space-y-2 text-sm font-medium">Firma<Input id="register-company" required className="h-11" placeholder="Acente unvanı" /></label><label htmlFor="register-email" className="space-y-2 text-sm font-medium">E-posta<Input id="register-email" type="email" required className="h-11" placeholder="yetkili@firma.com" /></label><label htmlFor="register-phone" className="space-y-2 text-sm font-medium">Telefon<Input id="register-phone" required className="h-11" placeholder="+90 5•• ••• •• ••" /></label><label htmlFor="register-password" className="space-y-2 text-sm font-medium sm:col-span-2">Güçlü parola<Input id="register-password" type="password" required minLength={12} className="h-11" /></label><div className="flex items-start gap-3 text-xs leading-5 text-muted-foreground sm:col-span-2"><Checkbox id="privacy-acceptance" required aria-label="Aydınlatma metnini okudum" className="mt-0.5" /><label htmlFor="privacy-acceptance"><Link href="/kvkk" className="font-medium text-primary underline">KVKK aydınlatma metnini</Link> okudum ve kabul ediyorum.</label></div><Button className="h-11 sm:col-span-2">Başvuruyu gönder <ArrowRight /></Button><p className="text-center text-xs text-muted-foreground sm:col-span-2">Hesabınız var mı? <Link href="/login" className="font-medium text-primary underline">Giriş yapın</Link></p></form></AuthFrame>;
}

export function VerifyEmailDemo() {
  const [verified, setVerified] = useState(false);
  return verified ? <SuccessState icon={CheckCircle2} title="E-posta doğrulandı" description="Kullanıcı doğrulandı. Sıradaki güvenlik adımı MFA kurulumudur." href="/mfa" action="MFA kurulumuna geç" /> : <AuthFrame title="E-posta doğrulama" description="Hesabınızı doğrulamak için size ileteceğimiz tek kullanımlık kodu kullanın."><div className="rounded-2xl bg-muted p-4 text-sm"><p className="font-medium">Doğrulama kodu bekleniyor</p><p className="mt-1 text-xs text-muted-foreground">Kod 24 saat geçerlidir ve yalnız bir kez kullanılabilir.</p></div><Button className="mt-5 h-11 w-full" onClick={() => setVerified(true)}><MailCheck /> E-postayı doğrula</Button></AuthFrame>;
}

export function MfaDemo() {
  const [enabled, setEnabled] = useState(false);
  return enabled ? <SuccessState icon={ShieldCheck} title="İki adımlı doğrulama etkin" description="Kurtarma kodlarınızı güvenli bir yerde saklayın; her kod yalnız bir kez kullanılabilir." href="/notification-channels" action="Bildirim tercihlerine geç" /> : <AuthFrame title="Yönetici MFA kurulumu" description="Yönetici hesaplarında TOTP veya WebAuthn ile iki adımlı doğrulama zorunludur."><div className="grid place-items-center rounded-2xl border border-dashed border-border bg-muted/50 p-8"><KeyRound className="size-10 text-primary" /><p className="mt-3 text-sm font-medium">Kimlik doğrulayıcı uygulaması</p><p className="mt-2 text-center text-xs text-muted-foreground">Kurulum kodu, hesap yetkilendirmesi tamamlandığında burada gösterilir.</p></div><label htmlFor="mfa-code" className="mt-5 block space-y-2 text-sm font-medium">6 haneli doğrulama kodu<Input id="mfa-code" inputMode="numeric" pattern="[0-9]{6}" className="h-11" placeholder="••••••" /></label><Button className="mt-4 h-11 w-full" onClick={() => setEnabled(true)}><ShieldCheck /> İki adımlı doğrulamayı aç</Button></AuthFrame>;
}

export function NotificationChannelsDemo() {
  const [saved, setSaved] = useState(false);
  return <AuthFrame title="Bildirim tercihleri" description="Operasyon bildirimlerini hangi kanaldan almak istediğinizi seçin."><div className="space-y-3">{[['E-posta', true], ['Uygulama içi', true], ['WhatsApp · entegrasyon bekliyor', false], ['Telegram · entegrasyon bekliyor', false]].map(([label, enabled]) => <div key={String(label)} className="flex items-center justify-between rounded-xl border border-border p-4 text-sm"><span>{label}</span><Switch defaultChecked={Boolean(enabled)} disabled={!enabled} aria-label={`${label} bildirimi`} /></div>)}</div><Button className="mt-5 h-11 w-full" onClick={() => setSaved(true)}>Tercihleri kaydet</Button>{saved && <p className="mt-3 text-center text-sm font-medium text-[#19613f]">Tercihleriniz kaydedildi.</p>}</AuthFrame>;
}

export function ForgotPasswordDemo() {
  const [sent, setSent] = useState(false);
  return sent ? <SuccessState icon={MailCheck} title="Sıfırlama bağlantısı hazırlandı" description="Adres kayıtlıysa tek kullanımlık ve süreli bir bağlantı gönderilir." href="/login" action="Girişe dön" /> : <AuthFrame title="Parolayı yenile" description="E-posta adresinizi girin. Adres kayıtlıysa parola sıfırlama bağlantısı gönderilir."><form onSubmit={(event) => { event.preventDefault(); setSent(true); }}><label htmlFor="reset-email" className="space-y-2 text-sm font-medium">E-posta<Input id="reset-email" type="email" required className="h-11" placeholder="yetkili@firma.com" /></label><Button className="mt-4 h-11 w-full"><MailCheck /> Sıfırlama bağlantısı gönder</Button></form></AuthFrame>;
}

function AuthFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className="grid min-h-svh place-items-center bg-[#071c14] px-4 py-12"><Card className="w-full max-w-2xl border-white/10 bg-[#f8f5f0]"><CardHeader><Link href="/" className="mb-5 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary"><BrandMark className="size-8" tone="onDark" /></span><span className="font-serif text-lg">Ravza Randevu</span></Link><CardTitle className="font-serif text-3xl">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card></main>;
}

function SuccessState({ icon: Icon, title, description, href, action }: { icon: typeof CheckCircle2; title: string; description: string; href: string; action: string }) {
  return <main className="grid min-h-svh place-items-center bg-[#071c14] px-4 py-12"><Card className="w-full max-w-md border-0"><CardHeader><div className="mb-5 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-primary"><BrandMark className="size-7" tone="onDark" /></span><span className="font-serif">Ravza Randevu</span></div><div className="mb-3 grid size-12 place-items-center rounded-full bg-[#e8f2ed] text-[#19613f]"><Icon /></div><CardTitle className="font-serif text-3xl">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><Link href={href} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">{action}<ArrowRight className="size-4" /></Link></CardContent></Card></main>;
}
