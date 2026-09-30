'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MapPinCheck,
  Plane,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import Link from '@/components/safe-link';
import Image from 'next/image';

import {
  localeCodes,
  usePublicPreferences,
} from '@/components/public-preferences';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatMoneyMinor } from '@/lib/format-money';

type CustomerOrder = {
  id: string;
  packageName: string;
  productType: 'hajj' | 'umrah';
  status: 'awaiting_payment' | 'payment_pending' | 'confirmed' | 'cancelled';
  passengerCount: number;
  amountMinor: number;
  currency: 'USD';
  departureCity: string;
  departureDate: string;
  returnDate: string;
  ravzaVisitDate: string;
  residenceCountry: string;
  residenceCity: string;
  departureLocation: string;
  selectedSlots: Partial<
    Record<'male' | 'female', { timeSlot: string; window: string }>
  >;
  passengers: Array<{
    id?: string;
    firstName: string;
    lastName: string;
    gender: 'male' | 'female';
    birthDate: string;
    nationality: string;
    visaStatus?: 'pending' | 'applied' | 'approved' | 'rejected';
    visaNumber?: string;
    appointmentStatus?: 'pending' | 'booked' | 'qr_ready' | 'failed';
    appointmentDate?: string;
    appointmentTime?: string;
    appointmentGate?: string;
    qrPayload?: string;
    rawdahPermitId?: string;
  }>;
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
  archiveDate: string;
};

function AppointmentQr({ value, code }: { value: string; code: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value, {
      width: 180,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0a2e1f', light: '#ffffff' },
    }).then((dataUrl) => {
      if (active) setSrc(dataUrl);
    });
    return () => {
      active = false;
    };
  }, [value]);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#c9a86a]/45 bg-white p-3">
      {src ? (
        <Image
          src={src}
          alt={`${code} Ravza giriş QR kodu`}
          width={140}
          height={140}
          unoptimized
          className="size-32 rounded-lg border border-border bg-white p-1"
        />
      ) : (
        <div className="grid size-32 place-items-center rounded-lg bg-muted text-center text-[10px] text-muted-foreground">
          QR hazırlanıyor…
        </div>
      )}
      <div className="min-w-40 flex-1 text-xs">
        <p className="font-semibold text-[#0a2e1f]">Giriş QR kodu</p>
        <p className="mt-1 text-muted-foreground">Görevliye bu ekrandaki kodu gösterin.</p>
        <p className="mt-3 font-mono text-[11px] font-semibold text-foreground">{code}</p>
      </div>
    </div>
  );
}

const copy = {
  tr: {
    statuses: {
      awaiting_payment: 'Görüşme bekleniyor',
      payment_pending: 'Onay bekleniyor',
      confirmed: 'Rezervasyon onaylandı',
      cancelled: 'İptal edildi',
    },
    loading: 'Rezervasyonlarınız yükleniyor…',
    errorTitle: 'Rezervasyonlar okunamadı',
    errorText: 'Sayfayı yenileyerek tekrar deneyin.',
    emptyTitle: 'Henüz rezervasyon yok',
    emptyText:
      'Satıştaki Hac veya Umre paketini seçip yolcu ve Ravza tercihlerini tamamladığınızda kayıt burada görünecek.',
    emptyCta: 'Hac ve Umre paketlerini incele',
    hajjCard: {
      title: 'Hac seyahati',
      text: 'Uçuş, konaklama, Arafat, Mina, Müzdelife, yolcu belgeleri ve Ravza süreci.',
    },
    umrahCard: {
      title: 'Umre seyahati',
      text: 'Uçuş, Mekke–Medine konaklaması, transferler, yolcu belgeleri ve Ravza süreci.',
    },
    hajj: 'Hac',
    umrah: 'Umre',
    journeySuffix: 'seyahati',
    departure: 'Gidiş',
    travelers: 'Yolcular',
    total: 'Toplam',
    ravzaDate: 'Ravza tarihi',
    people: 'kişi',
    male: 'Erkek',
    female: 'Kadın',
    residence: 'İkamet',
    ravzaPreferences: 'Ravza tercihleri',
    activeTitle: 'Aktif ziyaretler',
    historyTitle: 'Eski işlemler',
    archiveNote: 'Ziyaret günü geçtiği için bu kayıt geçmiş işlemlere taşındı.',
    disclaimer:
      'Bu kayıt müşteriye aittir. Operasyon onayı verilmeden RawdahBooking satın alma işlemi başlatılmaz ve QR oluşturulmuş sayılmaz.',
  },
  en: {
    statuses: {
      awaiting_payment: 'Awaiting contact',
      payment_pending: 'Awaiting approval',
      confirmed: 'Booking confirmed',
      cancelled: 'Cancelled',
    },
    loading: 'Loading your bookings…',
    errorTitle: 'Bookings could not be loaded',
    errorText: 'Refresh the page and try again.',
    emptyTitle: 'No bookings yet',
    emptyText:
      'Once you choose a Hajj or Umrah package on sale and complete traveler and Rawdah preferences, the record will appear here.',
    emptyCta: 'Browse Hajj and Umrah packages',
    hajjCard: {
      title: 'Hajj journey',
      text: 'Flight, accommodation, Arafat, Mina, Muzdalifah, traveler documents and the Rawdah process.',
    },
    umrahCard: {
      title: 'Umrah journey',
      text: 'Flight, Makkah–Madinah accommodation, transfers, traveler documents and the Rawdah process.',
    },
    hajj: 'Hajj',
    umrah: 'Umrah',
    journeySuffix: 'journey',
    departure: 'Departure',
    travelers: 'Travelers',
    total: 'Total',
    ravzaDate: 'Rawdah date',
    people: 'people',
    male: 'Male',
    female: 'Female',
    residence: 'Residence',
    ravzaPreferences: 'Rawdah preferences',
    activeTitle: 'Active visits',
    historyTitle: 'Past records',
    archiveNote: 'This record moved to history after the visit date passed.',
    disclaimer:
      'This record belongs to the customer. No RawdahBooking purchase is started and no QR is considered issued before operations approval.',
  },
  ar: {
    statuses: {
      awaiting_payment: 'بانتظار التواصل',
      payment_pending: 'بانتظار الموافقة',
      confirmed: 'تم تأكيد الحجز',
      cancelled: 'أُلغي',
    },
    loading: 'جارٍ تحميل حجوزاتك…',
    errorTitle: 'تعذّر تحميل الحجوزات',
    errorText: 'حدّث الصفحة وحاول مرة أخرى.',
    emptyTitle: 'لا توجد حجوزات بعد',
    emptyText:
      'عند اختيار باقة حج أو عمرة معروضة واستكمال بيانات المسافرين وتفضيلات الروضة، سيظهر السجل هنا.',
    emptyCta: 'تصفّح باقات الحج والعمرة',
    hajjCard: {
      title: 'رحلة الحج',
      text: 'الطيران والإقامة وعرفات ومنى ومزدلفة ومستندات المسافر وإجراءات الروضة.',
    },
    umrahCard: {
      title: 'رحلة العمرة',
      text: 'الطيران والإقامة في مكة والمدينة والتنقلات ومستندات المسافر وإجراءات الروضة.',
    },
    hajj: 'الحج',
    umrah: 'العمرة',
    journeySuffix: 'رحلة',
    departure: 'المغادرة',
    travelers: 'المسافرون',
    total: 'الإجمالي',
    ravzaDate: 'تاريخ الروضة',
    people: 'أشخاص',
    male: 'ذكر',
    female: 'أنثى',
    residence: 'الإقامة',
    ravzaPreferences: 'تفضيلات الروضة',
    activeTitle: 'الزيارات النشطة',
    historyTitle: 'السجلات السابقة',
    archiveNote: 'نُقل هذا السجل إلى الأرشيف بعد انتهاء موعد الزيارة.',
    disclaimer:
      'هذا السجل يخص العميل. لا يبدأ الشراء عبر RawdahBooking ولا يُعد رمز QR صادرًا قبل تأكيد الدفع.',
  },
};

export function CustomerOrderDashboard() {
  const { locale } = usePublicPreferences();
  const t = copy[locale];
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  useEffect(() => {
    void fetch('/api/customer/orders', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('orders_failed');
        return response.json() as Promise<{ orders?: CustomerOrder[] }>;
      })
      .then((payload) => {
        setOrders(payload.orders ?? []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'loading')
    return (
      <Card className="mt-8 border-0 py-10 ring-1 ring-border">
        <CardContent className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" /> {t.loading}
        </CardContent>
      </Card>
    );

  if (status === 'error')
    return (
      <Alert variant="destructive" className="mt-8">
        <AlertTitle>{t.errorTitle}</AlertTitle>
        <AlertDescription>{t.errorText}</AlertDescription>
      </Alert>
    );

  if (!orders.length)
    return (
      <div className="mt-8">
        <Card className="border-0 bg-white py-10 text-center shadow-[0_2rem_5rem_rgba(20,38,28,.07)] ring-1 ring-border">
          <CardContent className="flex flex-col items-center px-6 py-6">
            <span className="grid size-14 place-items-center rounded-2xl bg-[#e8f2ed] text-[#0a2e1f]">
              <CalendarCheck2 className="size-7" />
            </span>
            <h2 className="mt-4 font-serif text-3xl">{t.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              {t.emptyText}
            </p>
            <Link
              href="/paketler"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground sm:w-auto"
            >
              {t.emptyCta}
            </Link>
          </CardContent>
        </Card>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            { ...t.hajjCard, icon: Plane },
            { ...t.umrahCard, icon: MapPinCheck },
          ].map(({ title, text, icon: Icon }) => (
            <Card
              key={title}
              className="border-0 bg-[#f3eee5] py-6 shadow-none ring-1 ring-[#ded8cb]"
            >
              <CardContent>
                <Icon className="size-6 text-[#80652f]" />
                <h3 className="mt-5 font-serif text-2xl">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {text}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );

  return (
    <div className="mt-8 space-y-5">
      {(() => {
        const activeOrders = orders.filter((order) => !order.isArchived);
        const archivedOrders = orders.filter((order) => order.isArchived);
        const ordered = [...activeOrders, ...archivedOrders];
        return ordered.map((order, index) => (
          <div key={order.id} className="space-y-3">
            {index === 0 && activeOrders.length ? (
              <h2 className="px-1 font-serif text-2xl">{t.activeTitle}</h2>
            ) : null}
            {index === activeOrders.length && archivedOrders.length ? (
              <h2 className="border-t border-border px-1 pt-8 font-serif text-2xl">
                {t.historyTitle}
              </h2>
            ) : null}
            <Card
              className={`overflow-hidden border-0 py-0 shadow-[0_1rem_3rem_rgba(20,38,28,.07)] ring-1 ring-border ${order.isArchived ? 'opacity-85' : ''}`}
            >
          <div className={`h-1.5 ${order.isArchived ? 'bg-muted-foreground/35' : 'bg-[#c9a86a]'}`} />
          <CardHeader className="px-5 pt-6 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge variant="outline" className="mb-2">
                  {order.productType === 'hajj' ? t.hajj : t.umrah}{' '}
                  {t.journeySuffix}
                </Badge>
                <CardTitle className="font-serif text-3xl">
                  {order.packageName}
                </CardTitle>
                <CardDescription>
                  {order.id} · {order.departureDate} – {order.returnDate}
                </CardDescription>
              </div>
              <Badge
                className={
                  order.status === 'confirmed'
                    ? 'bg-[#e8f2ed] text-[#19613f] hover:bg-[#e8f2ed]'
                    : undefined
                }
                variant={order.status === 'confirmed' ? 'default' : 'outline'}
              >
                {t.statuses[order.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 px-5 pb-7 sm:px-7">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  icon: Plane,
                  label: t.departure,
                  value: `${order.departureDate} · ${order.departureLocation || order.departureCity}`,
                },
                {
                  icon: UsersRound,
                  label: t.travelers,
                  value: `${order.passengerCount} ${t.people}`,
                },
                {
                  icon: CircleDollarSign,
                  label: t.total,
                  value: formatMoneyMinor(
                    order.amountMinor,
                    order.currency,
                    localeCodes[locale],
                  ),
                },
                {
                  icon: MapPinCheck,
                  label: t.ravzaDate,
                  value: order.ravzaVisitDate,
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl bg-muted p-4 text-sm">
                  <Icon className="size-5 text-primary" />
                  <span className="mt-4 block text-xs text-muted-foreground">
                    {label}
                  </span>
                  <strong className="mt-1 block">{value}</strong>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">{t.travelers} & Ravza İzin Durumu</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {order.passengers.map((passenger, index) => {
                  const isQrReady = passenger.appointmentStatus === 'qr_ready';
                  const isVisaApproved = passenger.visaStatus === 'approved';

                  return (
                    <div
                      key={`${passenger.firstName}-${passenger.lastName}-${index}`}
                      className={`rounded-2xl border p-5 transition-all ${
                        isQrReady
                          ? 'border-[#c9a86a]/60 bg-gradient-to-br from-[#fbf9f4] to-[#f4eee1] shadow-sm'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                        <div>
                          <div className="font-medium text-base text-foreground">
                            {index + 1}. {passenger.firstName} {passenger.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {passenger.gender === 'male' ? t.male : t.female} · {passenger.nationality} · {passenger.birthDate}
                          </div>
                        </div>
                        {isVisaApproved ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                            <ShieldCheck className="size-3.5 text-emerald-600" />
                            Vize Onaylandı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            <ShieldAlert className="size-3.5 text-amber-600" />
                            Vize İnceleniyor
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        {isQrReady ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#19613f]">
                                <CheckCircle2 className="size-4 text-emerald-600" />
                                Ravza Randevusu Kesinleşti
                              </span>
                              <Badge variant="outline" className="font-mono text-[10px] border-[#c9a86a]">
                                {passenger.rawdahPermitId}
                              </Badge>
                            </div>
                            <div className="rounded-xl bg-white/90 p-3 text-xs shadow-xs space-y-1">
                              <p className="flex items-center justify-between">
                                <span className="text-muted-foreground">Giriş Kapısı:</span>
                                <strong className="text-foreground">{passenger.appointmentGate || 'Belirtilmedi'}</strong>
                              </p>
                              <p className="flex items-center justify-between">
                                <span className="text-muted-foreground">Ziyaret Vakti:</span>
                                <strong className="text-foreground">
                                  {passenger.appointmentDate} · {passenger.appointmentTime}
                                </strong>
                              </p>
                            </div>
                            {passenger.qrPayload && passenger.rawdahPermitId ? (
                              <AppointmentQr
                                value={passenger.qrPayload}
                                code={passenger.rawdahPermitId}
                              />
                            ) : null}
                            {passenger.qrPayload && (
                              <a
                                href={passenger.qrPayload}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a2e1f] py-2 text-xs font-medium text-white shadow-xs hover:bg-[#154632]"
                              >
                                <QrCode className="size-4" />
                                Ravza Giriş QR Kodunu Aç
                                <ExternalLink className="size-3 text-white/70" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl bg-muted/60 p-3.5 text-xs text-muted-foreground">
                            <p className="font-medium text-foreground mb-1">Ravza İzni Hazırlanıyor</p>
                            <p>
                              {isVisaApproved
                                ? 'Vizeniz onaylandı. Acente operasyon ekibi seçtiğiniz saat aralığına randevunuzu tanımlamaktadır.'
                                : 'Vize onayınızın ardından ekibimiz Ravza randevunuzu alır; giriş QR kodunuz hazır olduğunda burada görünür.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.residence}: {order.residenceCity}, {order.residenceCountry}
              </p>
            </div>

            <div className="rounded-2xl border border-border p-4">
              <h3 className="font-semibold text-sm">{t.ravzaPreferences}</h3>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {(['male', 'female'] as const).map((gender) =>
                  order.selectedSlots[gender] ? (
                    <p key={gender} className="flex items-center gap-2">
                      <Clock3 className="size-4 text-primary" />
                      {gender === 'male' ? t.male : t.female} ·{' '}
                      {order.selectedSlots[gender]?.window}
                    </p>
                  ) : null,
                )}
              </div>
            </div>

            <p className="rounded-xl bg-[#f3eee5] p-4 text-xs leading-5 text-muted-foreground">
              {t.disclaimer}
            </p>
            {order.isArchived ? (
              <p className="rounded-xl bg-muted p-4 text-xs leading-5 text-muted-foreground">
                {t.archiveNote} ({order.archiveDate})
              </p>
            ) : null}
          </CardContent>
            </Card>
          </div>
        ));
      })()}
    </div>
  );
}

