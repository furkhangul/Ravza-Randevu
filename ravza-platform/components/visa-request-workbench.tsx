'use client';

import { type SubmitEvent, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Info,
  LoaderCircle,
  Plus,
  QrCode,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserRoundPlus,
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';

type PassengerItem = {
  id: string;
  orderId: string;
  customerEmail: string;
  packageName: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  birthDate: string;
  nationality: string;
  visaStatus: 'pending' | 'applied' | 'approved' | 'rejected';
  visaNumber: string;
  appointmentStatus: 'pending' | 'booked' | 'qr_ready' | 'failed';
  appointmentDate: string;
  appointmentTime: string;
  appointmentGate: string;
  qrPayload: string;
  rawdahPermitId: string;
  targetVisitDate: string;
  preferredWindow: string;
};

type RequestRecord = {
  id: string;
  group: string;
  gender: 'Kadın' | 'Erkek';
  dateRange: string;
  timeRange: string;
  status: 'Talep alındı' | 'Atama bekleniyor' | 'Kontrol gerekiyor';
};

const initialRequests: RequestRecord[] = [
  {
    id: 'REQ-DEMO-2408',
    group: 'UMRE-EYLUL-A',
    gender: 'Kadın',
    dateRange: '12–14 Eylül 2026',
    timeRange: '08:00–18:00',
    status: 'Atama bekleniyor',
  },
  {
    id: 'REQ-DEMO-2411',
    group: 'UMRE-EYLUL-B',
    gender: 'Erkek',
    dateRange: '15–16 Eylül 2026',
    timeRange: '06:00–23:00',
    status: 'Kontrol gerekiyor',
  },
];

export function VisaRequestWorkbench() {
  const [_requests, setRequests] = useState(initialRequests);
  const [passengers, setPassengers] = useState<PassengerItem[]>([]);
  const [loadingPassengers, setLoadingPassengers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState('');
  const [activeActionId, setActiveActionId] = useState('');
  const [visaDialogOpen, setVisaDialogOpen] = useState(false);
  const [selectedPassenger, setSelectedPassenger] =
    useState<PassengerItem | null>(null);
  const [visaNumberInput, setVisaNumberInput] = useState('');
  // RawdahBooking'de alınan gerçek randevunun bilgileri elle girilir.
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrForm, setQrForm] = useState({
    permitId: '',
    qrPayload: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentGate: '',
  });
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  async function loadCustomerOrders() {
    setLoadingPassengers(true);
    try {
      const response = await fetch('/api/admin/customer-orders');
      if (!response.ok) throw new Error('Yolcu listesi alınamadı.');
      const data = (await response.json()) as {
        orders?: Array<{
          id: string;
          customerEmail: string;
          packageName: string;
          ravzaVisitDate: string;
          selectedSlots: Partial<
            Record<'male' | 'female', { timeSlot: string; window: string }>
          >;
          passengers: Array<{
            id: string;
            orderId: string;
            firstName: string;
            lastName: string;
            gender: 'male' | 'female';
            birthDate: string;
            nationality: string;
            visaStatus: 'pending' | 'applied' | 'approved' | 'rejected';
            visaNumber: string;
            appointmentStatus: 'pending' | 'booked' | 'qr_ready' | 'failed';
            appointmentDate: string;
            appointmentTime: string;
            appointmentGate: string;
            qrPayload: string;
            rawdahPermitId: string;
          }>;
        }>;
      };

      const extracted: PassengerItem[] = [];
      for (const order of data.orders ?? []) {
        for (const pax of order.passengers ?? []) {
          const pref = order.selectedSlots[pax.gender];
          extracted.push({
            ...pax,
            orderId: order.id,
            customerEmail: order.customerEmail,
            packageName: order.packageName,
            targetVisitDate: order.ravzaVisitDate,
            preferredWindow: pref?.window || '08:00–10:00',
            appointmentTime: pax.appointmentTime || pref?.timeSlot || '08:00',
          });
        }
      }
      setPassengers(extracted);
    } catch {
      // Graceful fallback
    } finally {
      setLoadingPassengers(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch('/api/admin/customer-orders')
      .then(async (response) => {
        if (!response.ok) throw new Error('Yolcu listesi alınamadı.');
        return response.json() as Promise<{
          orders?: Array<{
            id: string;
            customerEmail: string;
            packageName: string;
            ravzaVisitDate: string;
            selectedSlots: Partial<
              Record<'male' | 'female', { timeSlot: string; window: string }>
            >;
            passengers: Array<{
              id: string;
              orderId: string;
              firstName: string;
              lastName: string;
              gender: 'male' | 'female';
              birthDate: string;
              nationality: string;
              visaStatus: 'pending' | 'applied' | 'approved' | 'rejected';
              visaNumber: string;
              appointmentStatus: 'pending' | 'booked' | 'qr_ready' | 'failed';
              appointmentDate: string;
              appointmentTime: string;
              appointmentGate: string;
              qrPayload: string;
              rawdahPermitId: string;
            }>;
          }>;
        }>;
      })
      .then((data) => {
        if (!active) return;
        const extracted: PassengerItem[] = [];
        for (const order of data.orders ?? []) {
          for (const pax of order.passengers ?? []) {
            const pref = order.selectedSlots[pax.gender];
            extracted.push({
              ...pax,
              orderId: order.id,
              customerEmail: order.customerEmail,
              packageName: order.packageName,
              targetVisitDate: order.ravzaVisitDate,
              preferredWindow: pref?.window || '08:00–10:00',
              appointmentTime: pax.appointmentTime || pref?.timeSlot || '08:00',
            });
          }
        }
        setPassengers(extracted);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  async function handleApproveVisa() {
    if (!selectedPassenger) return;
    setActiveActionId(selectedPassenger.id);
    const visaNo =
      visaNumberInput.trim() ||
      `VISA-${Math.floor(10000000 + Math.random() * 90000000)}`;
    try {
      const response = await fetch('/api/admin/customer-orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'update_visa',
          passengerId: selectedPassenger.id,
          visaStatus: 'approved',
          visaNumber: visaNo,
        }),
      });
      if (!response.ok) throw new Error('Vize onaylanamadı.');
      setActionSuccessMessage(
        `${selectedPassenger.firstName} ${selectedPassenger.lastName} için vize onaylandı (${visaNo}). Artık Rawdah randevusu kesilebilir.`,
      );
      setVisaDialogOpen(false);
      await loadCustomerOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'İşlem başarısız.');
    } finally {
      setActiveActionId('');
    }
  }

  function openQrDialog(pax: PassengerItem) {
    setSelectedPassenger(pax);
    setQrForm({
      permitId: '',
      qrPayload: '',
      appointmentDate: pax.targetVisitDate,
      appointmentTime: pax.appointmentTime || '',
      appointmentGate: '',
    });
    setQrDialogOpen(true);
  }

  /** RawdahBooking'de alınmış gerçek randevuyu yolcuya kaydeder; QR üretmez. */
  async function handleSaveRawdahBooking() {
    const pax = selectedPassenger;
    if (!pax) return;
    if (
      !qrForm.permitId.trim() ||
      !qrForm.qrPayload.trim() ||
      !qrForm.appointmentDate ||
      !qrForm.appointmentTime
    ) {
      alert('İzin numarası, QR bağlantısı, tarih ve saat zorunludur.');
      return;
    }

    setActiveActionId(pax.id);
    try {
      const response = await fetch('/api/admin/customer-orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'book_rawdah',
          passengerId: pax.id,
          appointmentDate: qrForm.appointmentDate,
          appointmentTime: qrForm.appointmentTime,
          appointmentGate: qrForm.appointmentGate.trim() || undefined,
          qrPayload: qrForm.qrPayload.trim(),
          permitId: qrForm.permitId.trim(),
        }),
      });

      if (!response.ok) throw new Error('Randevu bilgileri kaydedilemedi.');

      setQrDialogOpen(false);
      setActionSuccessMessage(
        `${pax.firstName} ${pax.lastName} için Ravza randevusu kaydedildi (İzin No: ${qrForm.permitId.trim()}). QR müşterinin Seyahatim ekranında görünür.`,
      );
      await loadCustomerOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Randevu bilgileri kaydedilemedi.');
    } finally {
      setActiveActionId('');
    }
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => {
      const entry = form.get(key);
      return typeof entry === 'string' ? entry : '';
    };
    setSaving(true);
    setCreated('');
    window.setTimeout(() => {
      const id = `REQ-DEMO-${String(Date.now()).slice(-4)}`;
      setRequests((current) => [
        {
          id,
          group: value('groupCode') || 'YENI-GRUP',
          gender: value('gender') === 'male' ? 'Erkek' : 'Kadın',
          dateRange: `${value('startDate')} – ${value('endDate')}`,
          timeRange: `${value('startHour')}–${value('endHour')}`,
          status: 'Talep alındı',
        },
        ...current,
      ]);
      setCreated(id);
      setSaving(false);
    }, 450);
  }

  return (
    <div className="space-y-6">
      {actionSuccessMessage && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/15 p-4 text-sm font-medium text-emerald-900 ring-1 ring-emerald-500/30">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <span>{actionSuccessMessage}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setActionSuccessMessage('')}
          >
            Kapat
          </Button>
        </div>
      )}

      {/* Web Sitesinden Gelen Rezervasyonlar ve Yolcu Randevu Masası */}
      <Card className="border-0 bg-white shadow-[0_18px_55px_rgba(20,38,28,.07)] ring-1 ring-black/5">
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Badge className="bg-[#0a2e1f] text-white hover:bg-[#0a2e1f]">
                Canlı Satış Operasyonu
              </Badge>
              <CardTitle className="mt-2 font-serif text-2xl">
                Müşteri Rezervasyonları & Ravza Randevu Masası
              </CardTitle>
              <CardDescription>
                Web sitesinden tur satın alan yolcuların vize kontrolleri, Rawdah
                kredi düşümü ve QR kod onay akışı.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={loadCustomerOrders}
              disabled={loadingPassengers}
              className="gap-2"
            >
              <RefreshCw
                className={`size-4 ${loadingPassengers ? 'animate-spin' : ''}`}
              />
              Yenile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {passengers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <UserCheck className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium">
                Henüz web sitesi üzerinden yapılmış müşteri rezervasyonu
                bulunmuyor.
              </p>
              <p className="mt-1 text-xs text-muted-foreground/75">
                Müşteriler /book üzerinden tur satın aldığında yolcular otomatik
                olarak bu listeye düşer.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-[.08em] text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Yolcu / Tur</th>
                    <th className="px-5 py-3 font-medium">Cinsiyet</th>
                    <th className="px-5 py-3 font-medium">
                      Hedef Ravza Tercihi
                    </th>
                    <th className="px-5 py-3 font-medium">Vize Durumu</th>
                    <th className="px-5 py-3 font-medium">
                      Ravza & QR Durumu
                    </th>
                    <th className="px-5 py-3 text-right font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {passengers.map((pax) => {
                    const isProcessing = activeActionId === pax.id;
                    return (
                      <tr key={pax.id} className="hover:bg-muted/20">
                        <td className="px-5 py-4">
                          <div className="font-medium text-foreground">
                            {pax.firstName} {pax.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {pax.packageName} · {pax.orderId}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline">
                            {pax.gender === 'female' ? 'Kadın' : 'Erkek'}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs">
                            {pax.targetVisitDate}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {pax.preferredWindow}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {pax.visaStatus === 'approved' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                              <ShieldCheck className="size-3.5 text-emerald-600" />
                              Onaylandı ({pax.visaNumber || 'Mevcut'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                              <ShieldAlert className="size-3.5 text-amber-600" />
                              Vize Bekliyor
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {pax.appointmentStatus === 'qr_ready' ? (
                            <div>
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                <QrCode className="size-3.5 text-emerald-600" />
                                QR Hazır ({pax.rawdahPermitId})
                              </span>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {pax.appointmentGate} · {pax.appointmentTime}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {pax.visaStatus === 'approved'
                                ? 'Randevu kesilmeye hazır'
                                : 'Vize onayı bekleniyor'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {pax.visaStatus !== 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isProcessing}
                                onClick={() => {
                                  setSelectedPassenger(pax);
                                  setVisaNumberInput('');
                                  setVisaDialogOpen(true);
                                }}
                              >
                                {isProcessing ? (
                                  <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                  'Vizeyi Onayla'
                                )}
                              </Button>
                            )}

                            {pax.visaStatus === 'approved' &&
                              pax.appointmentStatus !== 'qr_ready' && (
                                <Button
                                  size="sm"
                                  disabled={isProcessing}
                                  className="bg-[#0a2e1f] text-white hover:bg-[#144733]"
                                  onClick={() => openQrDialog(pax)}
                                >
                                  {isProcessing ? (
                                    <LoaderCircle className="size-4 animate-spin" />
                                  ) : (
                                    <QrCode className="mr-1.5 size-3.5" />
                                  )}
                                  Randevu ve QR Gir
                                </Button>
                              )}

                            {pax.appointmentStatus === 'qr_ready' && (
                              <a
                                href={pax.qrPayload}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                QR Görüntüle <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vize Onay Modal */}
      <Dialog open={visaDialogOpen} onOpenChange={setVisaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yolcu Vizesini Onayla</DialogTitle>
            <DialogDescription>
              {selectedPassenger?.firstName} {selectedPassenger?.lastName} için
              Suudi Arabistan vize numarasını girin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="visa-number-input">Vize Numarası / Border No</Label>
            <Input
              id="visa-number-input"
              value={visaNumberInput}
              onChange={(e) => setVisaNumberInput(e.target.value)}
              placeholder="Örn: VISA-29384812"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVisaDialogOpen(false)}
              disabled={Boolean(activeActionId)}
            >
              İptal
            </Button>
            <Button
              onClick={handleApproveVisa}
              disabled={Boolean(activeActionId)}
              className="bg-[#0a2e1f] text-white hover:bg-[#144733]"
            >
              {activeActionId ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                'Vizeyi Onayla'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ravza randevusu: RawdahBooking'de alınan gerçek bilgiler */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ravza randevusunu kaydet</DialogTitle>
            <DialogDescription>
              {selectedPassenger?.firstName} {selectedPassenger?.lastName} için
              randevuyu RawdahBooking&apos;de alın, ardından oradaki izin
              numarasını ve QR bağlantısını buraya girin. Bilgiler müşterinin
              Seyahatim ekranında görünür.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="rawdah-permit-input">İzin numarası</Label>
              <Input
                id="rawdah-permit-input"
                value={qrForm.permitId}
                onChange={(e) => setQrForm({ ...qrForm, permitId: e.target.value })}
                placeholder="RawdahBooking'deki izin numarası"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rawdah-qr-input">QR bağlantısı veya QR metni</Label>
              <Input
                id="rawdah-qr-input"
                value={qrForm.qrPayload}
                onChange={(e) => setQrForm({ ...qrForm, qrPayload: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="rawdah-date-input">Tarih</Label>
                <Input
                  id="rawdah-date-input"
                  type="date"
                  value={qrForm.appointmentDate}
                  onChange={(e) => setQrForm({ ...qrForm, appointmentDate: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rawdah-time-input">Saat (Medine)</Label>
                <Input
                  id="rawdah-time-input"
                  type="time"
                  value={qrForm.appointmentTime}
                  onChange={(e) => setQrForm({ ...qrForm, appointmentTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rawdah-gate-input">Giriş kapısı (isteğe bağlı)</Label>
              <Input
                id="rawdah-gate-input"
                value={qrForm.appointmentGate}
                onChange={(e) => setQrForm({ ...qrForm, appointmentGate: e.target.value })}
                placeholder="Boş bırakılırsa cinsiyete göre varsayılan kapı yazılır"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQrDialogOpen(false)}
              disabled={Boolean(activeActionId)}
            >
              İptal
            </Button>
            <Button
              onClick={handleSaveRawdahBooking}
              disabled={Boolean(activeActionId)}
              className="bg-[#0a2e1f] text-white hover:bg-[#144733]"
            >
              {activeActionId ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                'Kaydet'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acente Toplu Talep Formu ve Güvenli Kapsam */}
      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="overflow-hidden border-0 bg-[#071c14] text-white shadow-[0_24px_70px_rgba(7,28,20,.18)] ring-0">
          <CardHeader className="border-b border-white/10 px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge className="bg-[#d2b77b] text-[#071c14] hover:bg-[#d2b77b]">
                  Toplu Talep Masası
                </Badge>
                <CardTitle className="mt-4 font-serif text-3xl">
                  Grup bazlı randevu talebi
                </CardTitle>
                <CardDescription className="mt-2 max-w-xl text-white/55">
                  Özel kafileler ve grup operasyonları için tarih ve saat aralığı
                  belirterek kuyruğa talep gönderin.
                </CardDescription>
              </div>
              <CalendarRange className="size-9 text-[#d2b77b]" />
            </div>
          </CardHeader>
          <CardContent className="px-6 py-6 sm:px-8">
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="request-group" className="text-white/75">
                  Grup kodu
                </Label>
                <Input
                  id="request-group"
                  name="groupCode"
                  required
                  defaultValue="UMRE-EYLUL-C"
                  className="h-11 border-white/15 bg-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-start" className="text-white/75">
                  Başlangıç tarihi
                </Label>
                <Input
                  id="request-start"
                  name="startDate"
                  type="date"
                  required
                  defaultValue="2026-09-18"
                  className="h-11 border-white/15 bg-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-end" className="text-white/75">
                  Bitiş tarihi
                </Label>
                <Input
                  id="request-end"
                  name="endDate"
                  type="date"
                  required
                  defaultValue="2026-09-20"
                  className="h-11 border-white/15 bg-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-start-hour" className="text-white/75">
                  Başlangıç saati
                </Label>
                <Input
                  id="request-start-hour"
                  name="startHour"
                  type="time"
                  required
                  defaultValue="08:00"
                  className="h-11 border-white/15 bg-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-end-hour" className="text-white/75">
                  Bitiş saati
                </Label>
                <Input
                  id="request-end-hour"
                  name="endHour"
                  type="time"
                  required
                  defaultValue="20:00"
                  className="h-11 border-white/15 bg-white/10 text-white"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="request-gender" className="text-white/75">
                  Yolcu grubu
                </Label>
                <NativeSelect
                  id="request-gender"
                  name="gender"
                  className="h-11 w-full border-white/15 bg-white/10 text-white"
                >
                  <NativeSelectOption value="female">Kadın</NativeSelectOption>
                  <NativeSelectOption value="male">Erkek</NativeSelectOption>
                </NativeSelect>
              </div>
              <Button
                className="h-12 bg-[#d2b77b] text-[#071c14] hover:bg-[#e2cc99] sm:col-span-2"
                disabled={saving}
              >
                {saving ? <LoaderCircle className="animate-spin" /> : <Plus />}
                {saving ? 'Kaydediliyor' : 'Talep oluştur'}
              </Button>
              {created && (
                <p className="flex items-center gap-2 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200 sm:col-span-2">
                  <CheckCircle2 className="size-4" /> {created} yerel çalışma
                  alanına eklendi.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-0 bg-[#d8b873] text-[#071c14] shadow-lg ring-0">
            <CardHeader>
              <Info className="size-7" />
              <CardTitle className="font-serif text-2xl">
                İki akış neden ayrı?
              </CardTitle>
              <CardDescription className="text-[#071c14]/65">
                Hazır randevu anlık stoktan alınır; vize ile talep ise sıraya
                girer ve vize onayından sonra krediden düşülerek kesinleşir.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-0 bg-white/75 shadow-sm ring-1 ring-black/5 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">
                Güvenli kapsam & Kredi Kontrolü
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex gap-2">
                <UserRoundPlus className="mt-0.5 size-4 shrink-0 text-primary" />{' '}
                Vizesi olmayan yolcuya Rawdah randevusu kesilmez; kota korunur.
              </p>
              <p className="flex gap-2">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" /> Kadın
                ve erkek ziyaret saatleri ve giriş kapıları otomatik ayrılır.
              </p>
              <p className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#9f432b]" />{' '}
                Her randevu kesildiğinde randevu hakkı defterinden 1 kredi eksilir.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


