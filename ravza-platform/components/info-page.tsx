import type { ReactNode } from "react";
import Link from "@/components/safe-link";
import { ArrowLeft } from "lucide-react";
import { PublicShell } from "@/components/public-shell";

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
      <section className="ravza-container ravza-info-page">
        <header className="ravza-info-head">
          <p className="ravza-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </header>
        <div className="ravza-info-body space-y-5">{children}</div>
        <Link href="/" className="ravza-text-link mt-9">
          <ArrowLeft className="size-4" />
          Ana sayfaya dön
        </Link>
      </section>
    </PublicShell>
  );
}
export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ravza-info-section">
      <h2>{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
