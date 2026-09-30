import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Crown,
  DatabaseZap,
  FileCheck2,
  LockKeyhole,
  Radio,
  ShieldCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const operationRows = [
  ['Bugün', 'Kadın', '08:00–08:20', '12', 'QR hazır'],
  ['Bugün', 'Erkek', '16:00–16:20', '18', 'Sağlayıcı bekleniyor'],
  ['Yarın', 'Kadın', '21:20–21:40', '9', 'Kontrol gerekiyor'],
];

export function ExecutiveOverview() {
  return (
    <>
      <div className="relative mb-5 overflow-hidden rounded-[2rem] bg-[#071c14] p-7 text-white shadow-[0_24px_70px_rgba(7,28,20,.2)] sm:p-9">
        <div
          aria-hidden="true"
          className="absolute -top-20 right-0 size-72 rounded-full bg-[#c9a86a]/15 blur-3xl"
        />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs text-[#e6ce98]">
              <Crown className="size-4" /> Yönetici kontrol kulesi
            </span>
            <h2 className="mt-5 max-w-2xl font-serif text-[clamp(2.3rem,4vw,4rem)] leading-[.95] tracking-[-.04em]">
              Para, operasyon ve risk aynı karar ekranında.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
              Sentetik rakamlar teklif veya fatura değildir. Canlı kapılar
              doğrulanana kadar hiçbir finansal işlem tetiklenmez.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-xs text-white/65">
            <Radio className="size-4 text-emerald-300" /> Sistem sağlığı: normal
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Brüt tahsilat', '$184,500', '+12,4%', true],
          ['Sağlayıcı maliyeti', '$126,000', '+8,1%', false],
          ['İade + komisyon', '$9,840', '-2,3%', false],
          ['Katkı marjı', '$48,660', '+4,6%', true],
        ].map(([label, value, trend, positive]) => (
          <Card
            key={String(label)}
            className="border-0 shadow-sm ring-1 ring-border"
          >
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="font-serif text-3xl">{value}</CardTitle>
            </CardHeader>
            <CardContent
              className={`flex items-center gap-1 text-xs font-semibold ${positive ? 'text-[#19613f]' : 'text-[#9f432b]'}`}
            >
              {positive ? (
                <ArrowUpRight className="size-4" />
              ) : (
                <ArrowDownRight className="size-4" />
              )}
              {trend} sentetik dönem farkı
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="border-0 bg-white/80 shadow-[0_18px_55px_rgba(20,38,28,.07)] ring-1 ring-black/5 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="font-serif text-2xl">
                  Mutabakat kuyruğu
                </CardTitle>
                <CardDescription>
                  Yerel kayıt ve sağlayıcı sonucu arasındaki farklar.
                </CardDescription>
              </div>
              <DatabaseZap className="size-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-[.1em] text-muted-foreground">
                  <th className="pb-3 font-medium">Kayıt</th>
                  <th className="pb-3 font-medium">Yerel</th>
                  <th className="pb-3 font-medium">Sağlayıcı</th>
                  <th className="pb-3 font-medium">Son kontrol</th>
                  <th className="pb-3 font-medium">Sorumlu</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/70">
                  <td className="py-4 font-mono text-xs">ORD-DEMO-1044</td>
                  <td className="py-4">
                    <Badge variant="outline">unknown</Badge>
                  </td>
                  <td className="py-4 text-muted-foreground">Doğrulanamadı</td>
                  <td className="py-4">4 dk önce</td>
                  <td className="py-4">Operasyon</td>
                </tr>
                <tr>
                  <td className="py-4 font-mono text-xs">PAY-DEMO-0731</td>
                  <td className="py-4">
                    <Badge
                      variant="outline"
                      className="border-[#6c9c83] text-[#19613f]"
                    >
                      onaylı
                    </Badge>
                  </td>
                  <td className="py-4 text-[#19613f]">Eşleşti</td>
                  <td className="py-4">11 dk önce</td>
                  <td className="py-4">Finans</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card className="border-0 bg-[#d8b873] text-[#071c14] shadow-lg ring-0">
          <CardHeader>
            <LockKeyhole className="size-7" />
            <CardTitle className="font-serif text-2xl">
              Canlı yayın kapıları
            </CardTitle>
            <CardDescription className="text-[#071c14]/65">
              Dış onay gelmeden açılamayan alanlar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              'Partner sözleşmesi',
              'Sandbox ve test randevu hakkını',
              'USD ödeme onayı',
              'KVKK aktarım mekanizması',
            ].map((item) => (
              <p
                key={item}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/35 p-3"
              >
                <span>{item}</span>
                <strong className="text-xs">Bekliyor</strong>
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          [
            FileCheck2,
            'Denetim izi',
            'Fiyat, ödeme, rol ve mutabakat kararları eklemeli kayda dönüşür.',
          ],
          [
            ShieldCheck,
            'Tenant izolasyonu',
            'Acenteler yalnız kendi sipariş, yolcu ve finans özetini görebilir.',
          ],
          [
            Radio,
            'Bildirim sağlığı',
            'E-posta ve uygulama içi olaylar ayrı durum ve tekrar anahtarıyla izlenir.',
          ],
        ].map(([Icon, title, text]) => (
          <Card
            key={String(title)}
            className="border-0 bg-white/75 shadow-sm ring-1 ring-black/5 backdrop-blur-xl"
          >
            <CardHeader>
              <Icon className="size-6 text-primary" />
              <CardTitle className="font-serif text-xl">
                {title as string}
              </CardTitle>
              <CardDescription>{text as string}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">
              Bugün + yarın operasyonu
            </CardTitle>
            <CardDescription>
              Cinsiyet, saat, kapasite ve ayrı QR durumuyla tek tablo.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-[.1em] text-muted-foreground">
                  <th className="pb-3 font-medium">Gün</th>
                  <th className="pb-3 font-medium">Grup</th>
                  <th className="pb-3 font-medium">Saat</th>
                  <th className="pb-3 font-medium">Uygun</th>
                  <th className="pb-3 font-medium">QR</th>
                </tr>
              </thead>
              <tbody>
                {operationRows.map((row) => (
                  <tr
                    key={row.join('-')}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="py-4 font-medium">{row[0]}</td>
                    <td className="py-4">{row[1]}</td>
                    <td className="py-4">{row[2]}</td>
                    <td className="py-4">{row[3]}</td>
                    <td className="py-4">
                      <Badge
                        variant="outline"
                        className={
                          row[4] === 'QR hazır'
                            ? 'border-[#6c9c83] text-[#19613f]'
                            : row[4] === 'Kontrol gerekiyor'
                              ? 'border-[#c67755] text-[#9f432b]'
                              : 'border-[#c9a86a] text-[#715724]'
                        }
                      >
                        {row[4]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card className="border-[#c67755]/35 bg-[#fff7f3]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-[#9f432b]" />
                <CardTitle className="font-serif text-xl">
                  Operasyon alarmı
                </CardTitle>
              </div>
              <CardDescription>
                1 siparişin sağlayıcı sonucu belirsiz. Yeniden satın alma
                kapalı, mutabakat incelemesi açık.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-0 bg-primary text-primary-foreground">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5" />
                <CardTitle className="font-serif text-xl">
                  Güvenlik durumu
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-primary-foreground/75">
              <p className="flex justify-between">
                <span>Canlı ödeme</span>
                <strong>Kapalı</strong>
              </p>
              <p className="flex justify-between">
                <span>Sağlayıcı satın alma</span>
                <strong>Kapalı</strong>
              </p>
              <p className="flex justify-between">
                <span>Son sentetik kontrol</span>
                <strong className="flex items-center gap-1">
                  <Clock3 className="size-3.5" /> 2 dk
                </strong>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

