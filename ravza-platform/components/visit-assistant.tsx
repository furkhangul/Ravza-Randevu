"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, MessageCircle, Mic, MicOff, Send, Volume2, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import {
  ChatAvailability,
  formatVisitDate,
  isSelectionComplete,
  type AvailabilitySelection,
} from "@/components/chat-availability";
import { OrderAssistant, type AssistantPackage } from "@/components/order-assistant";
import { usePublicPreferences } from "@/components/public-preferences";
import type { AppointmentPackageCode } from "@/lib/appointment-packages";
import {
  emptyVisit,
  respondToVisit,
  visitMissingFields,
  visitPrompt,
  visitProgress,
  visitStage,
  visitSuggestions,
  visitSummary,
  mixedSplitSuggestions,
  type VisitDetails,
} from "@/lib/visit-conversation";

type Message = { role: "assistant" | "user"; text: string; link?: { href: string; label: string }; requestQuestion?: string };
type AssistantResponse = {
  reply?: unknown;
  handoff?: unknown;
  details?: VisitDetails;
  link?: { href: string; label: string };
  availabilityDate?: string;
};
type SpeechTranscript = { transcript: string };
type SpeechRecognitionResultLike = { isFinal: boolean; 0?: SpeechTranscript };
type SpeechResultEvent = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function localizedVisitSummary(details: VisitDetails, locale: "tr" | "en" | "ar") {
  if (locale === "tr") return visitSummary(details);
  const labels = {
    en: { person: "visitors", women: "women", men: "men", flexible: "Flexible dates" },
    ar: { person: "زوار", women: "نساء", men: "رجال", flexible: "تواريخ مرنة" },
  }[locale];
  const parts: string[] = [];
  if (details.personCount) parts.push(`${details.personCount} ${labels.person}`);
  if (details.femaleCount !== null) parts.push(`${details.femaleCount} ${labels.women}`);
  if (details.maleCount !== null) parts.push(`${details.maleCount} ${labels.men}`);
  if (details.dateFrom) {
    const format = (value: string) =>
      new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ar-SA", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T12:00:00Z`));
    parts.push(
      details.dateFrom === details.dateTo
        ? format(details.dateFrom)
        : `${format(details.dateFrom)} – ${format(details.dateTo)}`,
    );
  }
  if (details.flexible) parts.push(labels.flexible);
  return parts.join(" · ");
}

function splitSpeechText(value: string): string[] {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= 420) return [clean];
  const sentences = clean.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? [clean];
  return sentences.flatMap((sentence) => {
    const trimmed = sentence.trim();
    if (trimmed.length <= 320) return [trimmed];
    return trimmed.split(/,\s+/).reduce<string[]>((parts, part) => {
      const previous = parts.at(-1);
      if (previous && previous.length + part.length < 320) parts[parts.length - 1] = `${previous}, ${part}`;
      else parts.push(part);
      return parts;
    }, []);
  });
}

export function VisitAssistant({
  packages,
  initialPackageCode,
  variant = "panel",
  onClose,
}: {
  packages: AssistantPackage[];
  initialPackageCode?: AppointmentPackageCode;
  variant?: "page" | "panel";
  onClose?: () => void;
}) {
  const { locale } = usePublicPreferences();
  const personCount =
    packages.find((item) => item.code === initialPackageCode)?.personCount ?? null;
  const initialDetails = { ...emptyVisit, personCount };
  const [details, setDetails] = useState<VisitDetails>(initialDetails);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text:
        locale === "en"
          ? "Hello, I’m the Rawdah visit assistant. Ask me about the visit, or tell me your group size and dates so we can prepare a request together."
          : locale === "ar"
            ? "مرحبًا، أنا مساعد زيارة الروضة. اسألني عن الزيارة أو اذكر عدد الزوار والتواريخ لنجهز طلبك معًا."
            : `Merhaba, ben Ravza ziyaret asistanınız. Sorularınızı yanıtlayabilir, ziyaret bilgilerinizi birlikte hazırlayabilirim.\n\n${visitPrompt(initialDetails)}`,
    },
  ]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"chat" | "form">(
    initialPackageCode ? "form" : "chat",
  );
  const [formDetails, setFormDetails] = useState<VisitDetails>(initialDetails);
  const [supportQuestion, setSupportQuestion] = useState("");
  const [dirty, setDirty] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [voiceDraft, setVoiceDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalVoiceRef = useRef("");
  const speechTokenRef = useRef(0);
  const ready = visitStage(details) === "ready";
  const progress = visitProgress(details);
  const missing = visitMissingFields(details);
  const missingLabels = {
    tr: { personCount: "kişi sayısı", distribution: "kadın/erkek dağılımı", dates: "Medine tarihleri" },
    en: { personCount: "visitor count", distribution: "women/men distribution", dates: "visit dates" },
    ar: { personCount: "عدد الزوار", distribution: "عدد النساء والرجال", dates: "تواريخ الزيارة" },
  }[locale];
  const progressCopy = {
    tr: { aria: "Ziyaret hazırlığı yüzde", title: "Ziyaret hazırlığı", next: "Sıradaki bilgiler", ready: "Özet hazır. İletişim bilgilerinizi ekleyip talep formunu gönderin." },
    en: { aria: "Visit preparation", title: "Visit preparation", next: "Next details", ready: "Summary ready. Add your contact details in the request form." },
    ar: { aria: "اكتمال تجهيز الزيارة", title: "تجهيز الزيارة", next: "المعلومات التالية", ready: "الملخص جاهز. أضف بيانات التواصل في نموذج الطلب." },
  }[locale];
  const showForm = mode === "form";
  const [pickedSlot, setPickedSlot] = useState<AvailabilitySelection | null>(null);
  const [mixedAsked, setMixedAsked] = useState(false);
  // Asistanın boş saatlerini söylediği gün; saat paneli bu güne açılır.
  const [focusDate, setFocusDate] = useState("");
  // Sohbette tarih değişirse eski saat seçimi geçersiz sayılır.
  const selectedSlot =
    pickedSlot && pickedSlot.date === details.dateFrom && pickedSlot.date === details.dateTo
      ? pickedSlot
      : null;
  const showAvailability = visitStage(details) === "dates" || ready;
  const genderLabels = { tr: ["Kadın", "Erkek"], en: ["Women", "Men"], ar: ["نساء", "رجال"] }[locale];
  const slotTimes = (selection: AvailabilitySelection, withCounts = false) =>
    (
      [
        [genderLabels[0], selection.female],
        [genderLabels[1], selection.male],
      ] as const
    )
      .filter(([, pick]) => pick)
      .map(
        ([label, pick]) =>
          `${label} ${pick!.window.replace("-", "–")}${withCounts ? ` (${pick!.available} ${locale === "tr" ? "boş" : locale === "en" ? "open" : "متاح"})` : ""}`,
      )
      .join(" · ");
  const slotComplete = selectedSlot ? isSelectionComplete(selectedSlot, details) : false;
  const slotNote = selectedSlot && slotComplete
    ? {
        tr: `Seçilen randevu saati: ${selectedSlot.date} · ${slotTimes(selectedSlot)} (Medine saati)`,
        en: `Selected appointment time: ${selectedSlot.date} · ${slotTimes(selectedSlot)} (Medina time)`,
        ar: `الموعد المختار: ${selectedSlot.date} · ${slotTimes(selectedSlot)} (توقيت المدينة)`,
      }[locale]
    : "";
  const formNote = [slotNote, supportQuestion].filter(Boolean).join("\n\n");
  const suggestionCopy = {
    en: {
      people: ["I’m visiting alone", "We are a family", "We are a group", "How do I get a permit?"],
      distribution: ["Women", "Men", "Mixed", "Why is this needed?"],
      dates: ["Tomorrow", "1–5 October 2026", "I don’t know the dates yet", "Is a visit guaranteed?"],
      ready: ["Summarize my details", "What happens after approval?", "When do I get a QR code?", "Start over"],
    },
    ar: {
      people: ["أنا وحدي", "نحن عائلة", "نحن مجموعة", "كيف أحصل على تصريح؟"],
      distribution: ["نساء", "رجال", "مختلط", "لماذا هذا مطلوب؟"],
      dates: ["غدًا", "١–٥ أكتوبر ٢٠٢٦", "لا أعرف التواريخ بعد", "هل الزيارة مضمونة؟"],
      ready: ["لخّص بياناتي", "ماذا بعد الموافقة؟", "متى أحصل على رمز QR؟", "ابدأ من جديد"],
    },
  } as const;
  // "Karışık" seçildiyse dağılım aşamasında hazır sayı seçenekleri gösterilir.
  const mixed = mixedAsked && visitStage(details) === "distribution" && (details.personCount ?? 0) > 1;
  const splitLabel = (women: number, men: number) =>
    locale === "en" ? `${women} women, ${men} men` : `${women} نساء و${men} رجال`;
  const suggestions = locale === "tr"
    ? visitSuggestions(details, { mixed })
    : mixed
      ? mixedSplitSuggestions(details.personCount ?? 0).map((label) => {
          const [women, , men] = label.split(" ");
          return splitLabel(Number(women), Number(men));
        })
      : visitStage(details) === "distribution" && details.personCount === 1
        ? suggestionCopy[locale].distribution.filter((_, index) => index !== 2)
        : suggestionCopy[locale][visitStage(details)];
  const statusLabel = {
    tr: "Yapay zekâ · canlı randevu verisi",
    en: "AI · live appointment data",
    ar: "ذكاء اصطناعي · بيانات المواعيد المباشرة",
  }[locale];
  const labels = {
    tr: {
      title: "Ravza asistanı",
      subtitle: "Ziyaretinizi birlikte planlayalım",
      chat: "Yapay zekâ talep formu",
      form: "Manuel talep formu",
      close: "Asistanı kapat",
      reset: "Yeni sohbet",
    },
    en: {
      title: "Rawdah assistant",
      subtitle: "Plan your visit, step by step",
      chat: "AI request form",
      form: "Manual request form",
      close: "Close assistant",
      reset: "New chat",
    },
    ar: {
      title: "مساعد الروضة",
      subtitle: "لنخطط لزيارتك معًا",
      chat: "نموذج الطلب بالذكاء الاصطناعي",
      form: "نموذج الطلب اليدوي",
      close: "إغلاق المساعد",
      reset: "محادثة جديدة",
    },
  }[locale];

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, mode, typingText]);

  useEffect(
    () => () => {
      if (typingDelayRef.current) clearTimeout(typingDelayRef.current);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      recognitionRef.current?.stop();
      if (typeof window !== "undefined") {
        speechTokenRef.current += 1;
        window.speechSynthesis?.cancel();
      }
    },
    [],
  );

  function speak(text: string, index: number) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const synthesis = window.speechSynthesis;
    if (speakingIndex === index) {
      speechTokenRef.current += 1;
      synthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    speechTokenRef.current += 1;
    const token = speechTokenRef.current;
    synthesis.cancel();
    const chunks = splitSpeechText(text);
    const speechLocale = { tr: "tr-TR", en: "en-US", ar: "ar-SA" }[locale];
    const selectedVoice = synthesis
      .getVoices()
      .filter((voice) => voice.lang.toLowerCase().startsWith(speechLocale.slice(0, 2)))
      .sort((a, b) => {
        const score = (name: string) =>
          (/natural|online/i.test(name) ? 4 : 0) +
          (/emel|google|microsoft/i.test(name) ? 2 : 0) +
          (/female|kadın/i.test(name) ? 1 : 0);
        return score(b.name) - score(a.name);
      })[0];
    let chunkIndex = 0;
    const speakNext = () => {
      if (token !== speechTokenRef.current || chunkIndex >= chunks.length) {
        if (token === speechTokenRef.current) setSpeakingIndex(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      utterance.lang = speechLocale;
      utterance.voice = selectedVoice ?? null;
      utterance.rate = 0.98;
      utterance.pitch = 1.01;
      utterance.volume = 1;
      utterance.onend = () => {
        chunkIndex += 1;
        window.setTimeout(speakNext, 12);
      };
      utterance.onerror = () => {
        if (token === speechTokenRef.current) setSpeakingIndex(null);
      };
      synthesis.speak(utterance);
    };
    setSpeakingIndex(index);
    speakNext();
  }

  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceNotice(locale === "en" ? "This browser does not support voice input; you can type your message." : locale === "ar" ? "هذا المتصفح لا يدعم الإدخال الصوتي؛ يمكنك كتابة رسالتك." : "Bu tarayıcı sesli girişi desteklemiyor; mesajınızı yazabilirsiniz.");
      return;
    }
    setVoiceNotice("");
    setVoiceDraft("");
    finalVoiceRef.current = "";
    const recognition = new Recognition();
    recognition.lang = { tr: "tr-TR", en: "en-US", ar: "ar-SA" }[locale];
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript ?? "";
        if (result?.isFinal) finalTranscript += `${transcript} `;
        else interimTranscript += transcript;
      }
      const newFinal = finalTranscript.trim().startsWith(finalVoiceRef.current)
        ? finalTranscript.trim().slice(finalVoiceRef.current.length).trim()
        : finalTranscript.trim();
      if (newFinal) setInput((current) => `${current} ${newFinal}`.trim());
      finalVoiceRef.current = finalTranscript.trim();
      setVoiceDraft(interimTranscript.trim());
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceDraft("");
      finalVoiceRef.current = "";
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  async function send(text: string) {
    if (!text.trim() || isTyping) return;
    if (visitStage(details) !== "dates" && visitStage(details) !== "ready")
      setMixedAsked(/kar[ıi][sş][ıi][kğ]|karma|hem kad[ıi]n|mixed|مختلط/i.test(text));
    const localResult = respondToVisit(text, details);
    setDirty(true);
    setMessages((current) => [...current, { role: "user" as const, text: text.trim().slice(0, 1000) }].slice(-60));
    setInput("");
    setTypingText("");
    setIsTyping(true);
    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text.trim().slice(0, 1000),
          history: messages.slice(-8).map(({ role, text: content }) => ({ role, content })),
          // Sunucu mesajı kendi kural motoruyla işler; önceki bilgiler gönderilir.
          details,
          locale,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error("assistant_unavailable");
      const generated = (await response.json()) as AssistantResponse;
      const reply = typeof generated.reply === "string" ? generated.reply.trim() : "";
      if (!reply) throw new Error("assistant_unavailable");
      const nextDetails = generated.details ?? (locale === "tr" ? localResult.details : details);
      setDetails(nextDetails);
      if (typeof generated.availabilityDate === "string") setFocusDate(generated.availabilityDate);
      const handoffQuestion =
        generated.handoff === true ? text.trim().slice(0, 1000) : undefined;
      setMessages((current) =>
        [
          ...current,
          {
            role: "assistant" as const,
            text: reply.slice(0, 2400),
            link: generated.link ?? (localResult.requestQuestion && !handoffQuestion ? undefined : localResult.link),
            requestQuestion: handoffQuestion,
          },
        ].slice(-60),
      );
    } catch {
      const fallback = locale === "en"
        ? "I can’t reach the live assistant right now. Please use the request form and our team will follow up."
        : locale === "ar"
          ? "يتعذر الاتصال بالمساعد الآن. أرسل طلبًا عبر النموذج وسيتابع فريقنا معك."
          : localResult.text;
      setDetails(locale === "tr" ? localResult.details : details);
      setMessages((current) =>
        [
          ...current,
          {
            role: "assistant" as const,
            text: fallback,
            link: localResult.link ?? { href: "/siparis", label: locale === "en" ? "Open manual request form" : locale === "ar" ? "افتح نموذج الطلب اليدوي" : "Manuel talep formunu aç" },
            requestQuestion: localResult.requestQuestion,
          },
        ].slice(-60),
      );
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }
  function selectSlot(selection: AvailabilitySelection) {
    const first = selection.female ?? selection.male;
    const hour = Number(first?.timeSlot.slice(0, 2) ?? 0);
    const timePreference =
      hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 16 ? "afternoon" : hour >= 16 && hour < 20 ? "evening" : "night";
    setPickedSlot(selection);
    setDetails((current) => ({
      ...current,
      dateFrom: selection.date,
      dateTo: selection.date,
      flexible: false,
      timePreference,
    }));
    setDirty(true);
    // Karma grupta iki saat de seçilince onay mesajı yazılır.
    if (!isSelectionComplete(selection, details)) return;
    const day = formatVisitDate(selection.date, locale);
    const times = slotTimes(selection, true);
    const text = {
      tr: `Seçiminiz: ${day}\n${times} (Medine saati)\n\nBu saati talebinize ekledim. Bilgileriniz tamamsa "Manuel talep formuna aktar" ile iletişim bilgilerinizi ekleyip gönderin. Boş yer bilgisi anlıktır; randevu, ekibimiz onayladığında kesinleşir.`,
      en: `Your choice: ${day}\n${times} (Medina time)\n\nI added this time to your request. If your details are complete, continue to the manual request form, add your contact details and submit. Availability is live and may change; the appointment is final once our team confirms it.`,
      ar: `اختيارك: ${day}\n${times} (توقيت المدينة)\n\nأضفت هذا الموعد إلى طلبك. إذا اكتملت بياناتك فتابع إلى نموذج الطلب اليدوي وأضف بيانات التواصل ثم أرسل. التوفر لحظي وقد يتغير؛ يُعتمد الموعد بعد تأكيد فريقنا.`,
    }[locale];
    setMessages((current) => [...current, { role: "assistant" as const, text }].slice(-60));
  }
  function toForm(requestQuestion?: string) {
    if (requestQuestion) setSupportQuestion(requestQuestion);
    // A form stays mounted when chatting, preserving entered contact details.
    // Re-seed it only when the conversation actually changed visit details.
    if (dirty && JSON.stringify(formDetails) !== JSON.stringify(details)) {
      setFormDetails(details);
    }
    setDirty(false);
    setMode("form");
  }
  return (
    <div className={`visit-assistant ${variant === "page" ? "visit-assistant-page" : ""}`}>
      <header className="visit-assistant-header">
        <span className="assistant-brand">
          <BrandMark className="size-8" />
        </span>
        <div>
          <h2>{labels.title}</h2>
          <p>{labels.subtitle}</p>
          <span className="assistant-status"><i /> {statusLabel}</span>
        </div>
        {onClose ? (
          <button
            type="button"
            className="assistant-close"
            onClick={onClose}
            aria-label={labels.close}
          >
            <X className="size-5" />
          </button>
        ) : null}
      </header>
      <div className="assistant-tabs" aria-label="Asistan görünümü">
        <button type="button" aria-pressed={!showForm} onClick={() => setMode("chat")}>
          <MessageCircle className="size-4" />
          {labels.chat}
        </button>
        <button type="button" aria-pressed={showForm} onClick={() => toForm()}>
          {labels.form}
          <ArrowRight className="size-4 rtl:rotate-180" />
        </button>
      </div>
      <div className="assistant-form-panel" hidden={!showForm}>
        <OrderAssistant
          packages={packages}
          initialPackageCode={initialPackageCode}
          initialDetails={formDetails}
          initialNote={formNote || undefined}
          initialSelection={selectedSlot && slotComplete ? selectedSlot : null}
          idPrefix={`ravza-${variant}`}
          onVisitDetailsChange={(value) => {
            setDetails(value);
            setDirty(false);
          }}
          embedded
        />
      </div>
      {!showForm ? (
        <>
          <div
            ref={logRef}
            className="conversation-log"
            role="log"
            aria-label="Ravza asistanıyla sohbet"
            aria-live="polite"
            aria-relevant="additions"
          >
            <p className="conversation-date">{locale === "en" ? "FOR YOUR RAWDAH VISIT" : locale === "ar" ? "لزيارتك إلى الروضة" : "RAVZA ZİYARETİNİZ İÇİN"}</p>
            {messages.map((message, index) => (
              <div key={index} className={`conversation-message conversation-${message.role}`}>
                {message.role === "assistant" ? (
                  <span className="conversation-avatar" aria-hidden="true">
                    <BrandMark className="size-6" tone="onLight" />
                  </span>
                ) : null}
                <div className="conversation-bubble">
                  <p>{message.text}</p>
                  {message.role === "assistant" && message.text ? (
                    <button
                      type="button"
                      className="conversation-speak"
                      onClick={() => speak(message.text, index)}
                      aria-label={speakingIndex === index ? (locale === "en" ? "Stop speaking" : locale === "ar" ? "إيقاف القراءة" : "Sesi durdur") : (locale === "en" ? "Listen to reply" : locale === "ar" ? "استمع إلى الرد" : "Yanıtı sesli dinle")}
                    >
                      <Volume2 className="size-3.5" />
                      {speakingIndex === index ? (locale === "en" ? "Stop" : locale === "ar" ? "إيقاف" : "Durdur") : (locale === "en" ? "Listen" : locale === "ar" ? "استمع" : "Dinle")}
                    </button>
                  ) : null}
                  {message.requestQuestion ? (
                    <button
                      type="button"
                      className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                      onClick={() => toForm(message.requestQuestion ?? "")}
                    >
                      {message.link?.label ?? (locale === "en" ? "Send this question to support" : locale === "ar" ? "أرسل السؤال إلى الدعم" : "Soruyu ekibe ilet")}
                      <ArrowRight className="size-3.5" />
                    </button>
                  ) : message.link ? (
                    <a
                      href={message.link.href}
                      target={message.link.href.startsWith("https:") ? "_blank" : undefined}
                      rel={
                        message.link.href.startsWith("https:") ? "noopener noreferrer" : undefined
                      }
                    >
                      {message.link.label}
                      <ArrowRight className="size-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
            {isTyping ? (
              <div className="conversation-message conversation-assistant conversation-typing-message">
                <span className="conversation-avatar" aria-hidden="true">
                  <BrandMark className="size-6" tone="onLight" />
                </span>
                <div className="conversation-bubble" aria-label="Asistan yazıyor">
                  {typingText ? (
                    <p>{typingText}<span className="typing-caret" aria-hidden="true" /></p>
                  ) : (
                    <span className="typing-dots" aria-hidden="true"><i /><i /><i /></span>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <div
            className="conversation-progress"
            aria-label={`${progressCopy.aria} ${progress}%`}
          >
            <div className="conversation-progress-top">
              <span>{progressCopy.title}</span>
              <strong>{progress}%</strong>
            </div>
            <div className="conversation-progress-track" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>
              {missing.length
                ? `${progressCopy.next}: ${missing.map((field) => missingLabels[field]).join(" · ")}`
                : progressCopy.ready}
            </p>
          </div>
          {details.personCount ? (
            <div className="conversation-summary">
              <Check className="size-4 shrink-0" />
              <p>
                {localizedVisitSummary(details, locale)}
                {selectedSlot && slotComplete ? ` · ${slotTimes(selectedSlot)}` : ""}
              </p>
            </div>
          ) : null}
          {showAvailability ? (
            <ChatAvailability
              details={details}
              focusDate={focusDate}
              locale={locale}
              selected={selectedSlot}
              onSelect={selectSlot}
              disabled={isTyping}
            />
          ) : null}
          <div className="conversation-actions">
            <div className="conversation-suggestions">
              {suggestions.map((suggestion) => (
                <button type="button" key={suggestion} disabled={isTyping} onClick={() => send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
            {ready ? (
              <button type="button" className="ravza-button conversation-transfer" onClick={() => toForm()}>
                {locale === "en" ? "Continue to manual request form" : locale === "ar" ? "تابع إلى نموذج الطلب اليدوي" : "Manuel talep formuna aktar"}
                <ArrowRight className="size-4" />
              </button>
            ) : null}
            <button
              type="button"
              className="conversation-reset"
              onClick={() => send("Yeni baştan başlayalım")}
              disabled={isTyping}
            >
              {labels.reset}
            </button>
            <form
              className="conversation-composer"
              onSubmit={(event) => {
                event.preventDefault();
                send(input);
              }}
            >
              <label htmlFor={`visit-chat-${variant}`} className="sr-only">
                {locale === "en" ? "Your message" : locale === "ar" ? "رسالتك" : "Mesajınız"}
              </label>
              <input
                ref={inputRef}
                id={`visit-chat-${variant}`}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={1000}
                autoComplete="off"
                placeholder={locale === "en" ? "Ask a question or share visit details…" : locale === "ar" ? "اكتب سؤالك أو تفاصيل الزيارة…" : "Sorunuzu veya ziyaret bilgilerinizi yazın…"}
              />
              <button
                type="button"
                className={`conversation-voice ${isListening ? "is-listening" : ""}`}
                onClick={toggleListening}
                disabled={isTyping}
                aria-label={isListening ? "Sesli girişi durdur" : "Sesli mesaj yazdır"}
              >
                {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
              <button type="submit" disabled={!input.trim() || isTyping} aria-label="Mesajı gönder">
                <Send className="size-4" />
              </button>
            </form>
            {isListening ? (
              <p className="conversation-voice-note conversation-listening-note">
                <span className="listening-pulse" /> Dinliyorum… {voiceDraft}
              </p>
            ) : voiceNotice ? (
              <p className="conversation-voice-note">{voiceNotice}</p>
            ) : null}
            <p className="conversation-note">{locale === "en"
              ? "Messages are sent to Cloudflare Workers AI to generate replies. Don’t share passport, ID, card, password, or health information. A request is saved only after you review and submit the form."
              : locale === "ar"
                ? "تُرسل الرسائل إلى Cloudflare Workers AI لإنشاء الردود. لا تشارك بيانات جواز السفر أو الهوية أو البطاقة أو كلمة المرور أو الصحة. لا يُحفظ الطلب إلا بعد مراجعة النموذج وإرساله."
                : "Yanıt oluşturmak için mesajlar Cloudflare Workers AI’ye iletilir. Pasaport, kimlik, kart, parola veya sağlık bilgisi paylaşmayın. Talep, formu inceleyip gönderdiğinizde kaydedilir."}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}

