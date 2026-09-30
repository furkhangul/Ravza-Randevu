import { BrandMark } from '@/components/brand-mark';

export default function Loading() {
  return (
    <main className="grid min-h-svh place-items-center bg-background">
      <div className="text-center">
        <span className="mx-auto grid size-14 animate-pulse place-items-center rounded-2xl bg-primary">
          <BrandMark className="size-10" tone="onDark" />
        </span>
        <p className="mt-4 text-sm text-muted-foreground">
          Ravza Randevu hazırlanıyor…
        </p>
      </div>
    </main>
  );
}
