'use client';

import { useEffect, useState } from 'react';
import { Edit3, LoaderCircle, PackagePlus, Save } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

type PackageRecord = {
  id: string;
  productType: 'hajj' | 'umrah';
  slug: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  departureCity: string | null;
  departureDate: string | null;
  returnDate: string | null;
  makkahNights: number;
  medinaNights: number;
  priceMinor: number | null;
  currency: 'USD';
  includedServices: string[];
};

type PackageForm = {
  id: string;
  productType: PackageRecord['productType'];
  slug: string;
  name: string;
  status: PackageRecord['status'];
  departureCity: string;
  departureDate: string;
  returnDate: string;
  makkahNights: string;
  medinaNights: string;
  priceUsd: string;
  includedServices: string;
};

const defaultServices = [
  'Gidiş-dönüş uçuş planı',
  'Mekke ve Medine konaklaması',
  'Havalimanı ve şehir transferleri',
  'Ravza randevu operasyonu',
].join('\n');

const emptyForm: PackageForm = {
  id: '',
  productType: 'umrah',
  slug: '',
  name: '',
  status: 'draft',
  departureCity: 'İstanbul',
  departureDate: '',
  returnDate: '',
  makkahNights: '4',
  medinaNights: '4',
  priceUsd: '',
  includedServices: defaultServices,
};

function toForm(item: PackageRecord): PackageForm {
  return {
    id: item.id,
    productType: item.productType,
    slug: item.slug,
    name: item.name,
    status: item.status,
    departureCity: item.departureCity ?? '',
    departureDate: item.departureDate ?? '',
    returnDate: item.returnDate ?? '',
    makkahNights: String(item.makkahNights),
    medinaNights: String(item.medinaNights),
    priceUsd:
      item.priceMinor === null ? '' : (item.priceMinor / 100).toFixed(2),
    includedServices: item.includedServices.join('\n'),
  };
}

async function requestPackages() {
  const response = await fetch('/api/admin/packages', { cache: 'no-store' });
  const payload = (await response.json()) as {
    packages?: PackageRecord[];
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error || 'Paketler alınamadı.');
  return payload.packages ?? [];
}

export function PackageCatalogWorkbench() {
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [form, setForm] = useState<PackageForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  async function loadPackages() {
    try {
      const result = await requestPackages();
      setPackages(result);
      if (result[0])
        setForm((current) => (current.id ? current : toForm(result[0])));
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'Paketler alınamadı.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void requestPackages()
      .then((result) => {
        setPackages(result);
        if (result[0]) setForm(toForm(result[0]));
      })
      .catch((error: unknown) =>
        setNotice({
          type: 'error',
          message:
            error instanceof Error ? error.message : 'Paketler alınamadı.',
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof PackageForm>(key: K, value: PackageForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function savePackage() {
    setSaving(true);
    setNotice(null);
    const numericPrice = Number(form.priceUsd.replace(',', '.'));
    try {
      const response = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          productType: form.productType,
          slug: form.slug,
          name: form.name,
          status: form.status,
          departureCity: form.departureCity,
          departureDate: form.departureDate,
          returnDate: form.returnDate,
          makkahNights: Number(form.makkahNights),
          medinaNights: Number(form.medinaNights),
          priceMinor:
            form.priceUsd && Number.isFinite(numericPrice)
              ? Math.round(numericPrice * 100)
              : null,
          includedServices: form.includedServices
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      const payload = (await response.json()) as {
        package?: PackageRecord;
        error?: string;
      };
      if (!response.ok || !payload.package)
        throw new Error(payload.error || 'Paket kaydedilemedi.');
      setForm(toForm(payload.package));
      setNotice({ type: 'success', message: 'Paket kaydedildi.' });
      await loadPackages();
    } catch (error) {
      setNotice({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Paket kaydedilemedi.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
      <Card className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Hac ve Umre paketleri</CardTitle>
              <CardDescription>
                Yayımlananlar müşteri kataloğunda görünür.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setForm(emptyForm);
                setNotice(null);
              }}
            >
              <PackagePlus className="size-4" /> Yeni
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Paketler
              yükleniyor
            </p>
          ) : packages.length ? (
            packages.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setForm(toForm(item));
                  setNotice(null);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted"
              >
                <span>
                  <strong className="block text-sm">{item.name}</strong>
                  <span className="text-xs text-muted-foreground">
                    {item.productType === 'hajj' ? 'Hac' : 'Umre'} ·{' '}
                    {item.departureDate || 'Tarih yok'} ·{' '}
                    {item.priceMinor
                      ? `${(item.priceMinor / 100).toFixed(2)} USD`
                      : 'Fiyat yok'}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge
                    variant={
                      item.status === 'published' ? 'default' : 'outline'
                    }
                  >
                    {item.status === 'published'
                      ? 'Yayında'
                      : item.status === 'archived'
                        ? 'Arşiv'
                        : 'Taslak'}
                  </Badge>
                  <Edit3 className="size-4 text-muted-foreground" />
                </span>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Henüz paket yok.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-[0_14px_48px_rgba(20,38,28,.07)] ring-1 ring-border">
        <CardHeader>
          <CardTitle>{form.id ? 'Paketi düzenle' : 'Yeni paket'}</CardTitle>
          <CardDescription>
            Taslak eksik kaydedilebilir. Yayın için şehir, tarihler, USD fiyat,
            gece ve en az bir hizmet zorunludur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {notice ? (
            <Alert
              variant={notice.type === 'error' ? 'destructive' : 'default'}
            >
              <AlertTitle>
                {notice.type === 'error' ? 'Kaydedilemedi' : 'Tamamlandı'}
              </AlertTitle>
              <AlertDescription>{notice.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-type">Paket türü</Label>
              <NativeSelect
                className="w-full"
                id="product-type"
                value={form.productType}
                onChange={(event) =>
                  update(
                    'productType',
                    event.target.value as PackageForm['productType'],
                  )
                }
              >
                <NativeSelectOption value="umrah">Umre</NativeSelectOption>
                <NativeSelectOption value="hajj">Hac</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="package-name">Paket adı</Label>
              <Input
                id="package-name"
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                placeholder={
                  form.productType === 'hajj'
                    ? 'Hac Yolculuğu'
                    : 'Umre Yolculuğu'
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package-slug">Paket kodu</Label>
              <Input
                id="package-slug"
                value={form.slug}
                onChange={(event) =>
                  update('slug', event.target.value.toLowerCase())
                }
                placeholder="umre-yolculugu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package-status">Durum</Label>
              <NativeSelect
                className="w-full"
                id="package-status"
                value={form.status}
                onChange={(event) =>
                  update('status', event.target.value as PackageForm['status'])
                }
              >
                <NativeSelectOption value="draft">Taslak</NativeSelectOption>
                <NativeSelectOption value="published">
                  Yayında
                </NativeSelectOption>
                <NativeSelectOption value="archived">Arşiv</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="departure-city">Çıkış şehri</Label>
              <Input
                id="departure-city"
                value={form.departureCity}
                onChange={(event) =>
                  update('departureCity', event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departure-date">Gidiş tarihi</Label>
              <Input
                id="departure-date"
                type="date"
                value={form.departureDate}
                onChange={(event) =>
                  update('departureDate', event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-date">Dönüş tarihi</Label>
              <Input
                id="return-date"
                type="date"
                value={form.returnDate}
                onChange={(event) => update('returnDate', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="makkah-nights">Mekke gecesi</Label>
              <Input
                id="makkah-nights"
                type="number"
                min="0"
                max="60"
                value={form.makkahNights}
                onChange={(event) => update('makkahNights', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medina-nights">Medine gecesi</Label>
              <Input
                id="medina-nights"
                type="number"
                min="0"
                max="60"
                value={form.medinaNights}
                onChange={(event) => update('medinaNights', event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="price-usd">Kişi başı USD fiyat</Label>
              <Input
                id="price-usd"
                inputMode="decimal"
                value={form.priceUsd}
                onChange={(event) => update('priceUsd', event.target.value)}
                placeholder="1890.00"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="included-services">
                Dahil hizmetler (satır başına bir hizmet)
              </Label>
              <Textarea
                id="included-services"
                rows={6}
                value={form.includedServices}
                onChange={(event) =>
                  update('includedServices', event.target.value)
                }
              />
            </div>
          </div>
          <Button onClick={() => void savePackage()} disabled={saving}>
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? 'Kaydediliyor' : 'Paketi kaydet'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
