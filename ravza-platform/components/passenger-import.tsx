'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
  UserRoundPlus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function PassengerImport() {
  const [fileName, setFileName] = useState('');
  const [previewed, setPreviewed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imported, setImported] = useState(0);
  const [manualSaved, setManualSaved] = useState(false);
  const [manualAddedCount, setManualAddedCount] = useState(0);
  const [passengers, setPassengers] = useState<
    Array<{ id: string; displayName: string; source: string; status: string }>
  >([]);

  useEffect(() => {
    fetch('/api/demo/state')
      .then((response) => response.json())
      .then((value: unknown) => {
        const state = value as {
          passengers?: Array<{
            id: string;
            displayName: string;
            source: string;
            status: string;
          }>;
        };
        if (state.passengers) setPassengers(state.passengers);
      })
      .catch(() => undefined);
  }, []);

  async function saveDemoRows() {
    setSaving(true);
    try {
      const response = await fetch('/api/demo/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'import_passengers', count: 18 }),
      });
      const result = (await response.json()) as {
        imported?: number;
        state?: {
          passengers?: Array<{
            id: string;
            displayName: string;
            source: string;
            status: string;
          }>;
        };
      };
      if (response.ok) {
        setImported(result.imported ?? 18);
        if (result.state?.passengers) setPassengers(result.state.passengers);
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveManualDemo() {
    setSaving(true);
    try {
      const response = await fetch('/api/demo/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'import_passengers', count: 1 }),
      });
      const result = (await response.json()) as {
        state?: {
          passengers?: Array<{
            id: string;
            displayName: string;
            source: string;
            status: string;
          }>;
        };
      };
      if (response.ok) {
        setManualSaved(true);
        setManualAddedCount((count) => count + 1);
        if (result.state?.passengers) setPassengers(result.state.passengers);
        window.setTimeout(() => setManualSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card className="border-0 bg-[#d8b873] text-[#071c14] shadow-lg ring-0">
        <CardHeader>
          <div className="mb-2 grid size-11 place-items-center rounded-2xl bg-white text-primary">
            <FileSpreadsheet />
          </div>
          <CardTitle className="font-serif text-2xl">
            Excel ile toplu ekle
          </CardTitle>
          <CardDescription>
            Yalnız `.xlsx`; dosya henüz sunucuya gönderilmez.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept=".xlsx"
            className="h-11 bg-white file:mr-3"
            onChange={(event) => {
              setFileName(event.target.files?.[0]?.name ?? '');
              setPreviewed(false);
              setImported(0);
            }}
          />
          <Button
            className="h-11 w-full"
            disabled={!fileName}
            onClick={() => setPreviewed(true)}
          >
            <Upload /> Güvenli önizleme
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            MIME, boyut, zip bombası, formül enjeksiyonu ve tekrar alan
            kontrolleri gerçek yükleme servisinde zorunludur.
          </p>
        </CardContent>
      </Card>
      <Card className="border-0 bg-[#071c14] text-white shadow-xl ring-0">
        <CardHeader>
          <div className="mb-2 grid size-11 place-items-center rounded-2xl bg-white/10 text-[#e6ce98]">
            <UserRoundPlus />
          </div>
          <CardTitle className="font-serif text-2xl">
            Tekli yolcu ekle
          </CardTitle>
          <CardDescription className="text-white/55">
            Toplu dosya gerekmeyen kayıtlar için ayrı ve hızlı akış.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4 text-sm text-white/60">
            Canlı sürümde ad, ülke, doğum tarihi, cinsiyet ve doğrulanmış
            zorunlu alanlar burada alınır. Bu ekran pasaport görseli veya kimlik
            belgesi istemez.
          </div>
          <Button
            className="h-11 w-full bg-white text-[#071c14] hover:bg-white/90"
            disabled={saving}
            onClick={saveManualDemo}
          >
            {saving ? (
              <LoaderCircle className="animate-spin" />
            ) : manualSaved ? (
              <CheckCircle2 />
            ) : (
              <UserRoundPlus />
            )}
            {manualSaved ? 'Yolcu eklendi' : 'Yolcu ekle'}
          </Button>
          {manualAddedCount > 0 ? (
            <p className="text-center text-xs text-white/50">
              Bu oturumda {manualAddedCount} yolcu eklendi.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card className="border-0 bg-white/80 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-black/5 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">
            Satır doğrulama sonucu
          </CardTitle>
          <CardDescription>
            {previewed
              ? `${fileName} için doğrulama önizlemesi`
              : 'Bir dosya seçtiğinizde hata raporu burada görünür.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {previewed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-[#e8f2ed] p-4 text-sm text-[#19613f]">
                <FileCheck2 className="size-5" />
                <strong>18 geçerli satır</strong>
              </div>
              <div className="rounded-xl border border-[#e3c8ba] bg-[#fbf3ef] p-4 text-sm">
                <strong className="text-[#9f432b]">
                  2 satır kontrol gerekli
                </strong>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>Satır 7 · BirthDate · tarih biçimi geçersiz</li>
                  <li>Satır 14 · PassportNo · yinelenen değer</li>
                </ul>
              </div>
              {imported ? (
                <div className="flex items-center gap-2 rounded-xl bg-[#e8f2ed] p-3 text-sm font-medium text-[#19613f]">
                  <CheckCircle2 className="size-4" />
                  {imported} yolcu kaydedildi.
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={saving}
                  onClick={saveDemoRows}
                >
                  {saving ? <LoaderCircle className="animate-spin" /> : null}
                  {saving
                    ? 'Kaydediliyor'
                    : 'Geçerli 18 satırı kaydet'}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-border text-center text-sm text-muted-foreground">
              <div>
                <FileSpreadsheet className="mx-auto mb-3 size-8 opacity-55" />
                Hatalı satırlar sessizce atlanmaz.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-0 bg-white/80 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-black/5 backdrop-blur-xl xl:col-span-3">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">
            Yolcu listesi
          </CardTitle>
          <CardDescription>
            Ad ve doğrulama durumu gösterilir; pasaport veya
            vize alanı tutulmaz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passengers.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[.1em] text-muted-foreground">
                    <th className="pb-3 font-medium">Kayıt kodu</th>
                    <th className="pb-3 font-medium">Görünen ad</th>
                    <th className="pb-3 font-medium">Kaynak</th>
                    <th className="pb-3 font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {passengers.slice(0, 30).map((passenger) => (
                    <tr
                      key={passenger.id}
                      className="border-b border-border/70 last:border-0"
                    >
                      <td className="py-3 font-mono text-xs">{passenger.id}</td>
                      <td className="py-3">{passenger.displayName}</td>
                      <td className="py-3 text-muted-foreground">
                        {passenger.source === 'excel_demo'
                          ? 'Excel içe aktarma'
                          : 'Manuel'}
                      </td>
                      <td className="py-3 text-[#19613f]">Doğrulandı</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {passengers.length > 30 ? (
                <p className="pt-3 text-center text-xs text-muted-foreground">
                  +{passengers.length - 30} yolcu daha listelenmiyor.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Henüz kayıtlı yolcu yok.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
