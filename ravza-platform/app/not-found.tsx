import Link from '@/components/safe-link';
export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-[#071c14] px-4 text-[#f8f5f0]">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#d2b77b]">
          404
        </p>
        <h1 className="mt-3 font-serif text-5xl">Bu rota bulunamadı.</h1>
        <p className="mt-4 text-sm leading-6 text-white/60">
          Bağlantı eski veya eksik olabilir. Ana sayfadan devam edebilirsiniz.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#d2b77b] px-5 text-sm font-semibold text-[#071c14]"
        >
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
