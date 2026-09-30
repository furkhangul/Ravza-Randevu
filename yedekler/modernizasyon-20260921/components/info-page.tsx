import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { PublicShell } from '@/components/public-shell';

export function InfoPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <PublicShell>
      <section className="px-4 py-14 sm:px-7 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#80652f]">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-serif text-[clamp(2.8rem,6vw,5rem)] leading-[.95] tracking-[-.04em]">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            {intro}
          </p>
          <div className="mt-10 space-y-5">{children}</div>
          <Link
            href="/"
            className="mt-10 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Ana sayfaya dön <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}

export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
