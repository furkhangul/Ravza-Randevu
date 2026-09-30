"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, ArrowUpRight } from "lucide-react";
import { VisitAssistant } from "@/components/visit-assistant";
import type { AssistantPackage } from "@/components/order-assistant";
import { usePublicPreferences } from "@/components/public-preferences";

export function OrderAssistantLauncher({
  packages,
}: {
  packages: AssistantPackage[];
  phone: string;
}) {
  const { locale } = usePublicPreferences();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const label = { tr: "Ravza asistanı", en: "Rawdah assistant", ar: "مساعد الروضة" }[locale];
  useEffect(() => {
    function launch() {
      setOpen(true);
    }
    window.addEventListener("ravza:open-assistant", launch);
    return () => window.removeEventListener("ravza:open-assistant", launch);
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  if (pathname === "/siparis") return null;
  return (
    <>
      <dialog
        ref={dialog}
        className="ravza-chat-dialog"
        aria-label={label}
        onCancel={() => setOpen(false)}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
      >
        <VisitAssistant packages={packages} onClose={() => setOpen(false)} />
      </dialog>
      <button
        ref={trigger}
        type="button"
        className="ravza-chat-launcher"
        aria-label={`${label} — ${locale === "tr" ? "sohbeti aç" : "open"}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="size-5" />
        <span>{label}</span>
        <ArrowUpRight className="size-4" />
      </button>
    </>
  );
}
