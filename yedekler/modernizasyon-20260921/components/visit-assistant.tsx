'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, MessageCircle, Send, X } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { OrderAssistant, type AssistantPackage } from '@/components/order-assistant';
import { usePublicPreferences } from '@/components/public-preferences';
import type { AppointmentPackageCode } from '@/lib/appointment-packages';
import { emptyVisit, respondToVisit, visitPrompt, visitStage, visitSuggestions, visitSummary, type VisitDetails } from '@/lib/visit-conversation';

type Message = { role: 'assistant' | 'user'; text: string; link?: { href: string; label: string } };

export function VisitAssistant({ packages, initialPackageCode, variant = 'panel', onClose }: {
  packages: AssistantPackage[]; initialPackageCode?: AppointmentPackageCode;
  variant?: 'page' | 'panel'; onClose?: () => void;
}) {
  const { locale } = usePublicPreferences();
  const personCount = packages.find(item => item.code === initialPackageCode)?.personCount ?? null;
  const initialDetails = { ...emptyVisit, personCount };
  const [details, setDetails] = useState<VisitDetails>(initialDetails);
  const [messages, setMessages] = useState<Message[]>([{ role:'assistant', text:`Merhaba, ben Ravza ziyaret asistanınız. Sorularınızı yanıtlayabilir, ziyaret bilgilerinizi birlikte hazırlayabilirim.\n\n${visitPrompt(initialDetails)}` }]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'chat' | 'form'>(initialPackageCode || locale !== 'tr' ? 'form' : 'chat');
  const [formDetails, setFormDetails] = useState<VisitDetails>(initialDetails);
  const [formKey, setFormKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ready = visitStage(details) === 'ready';
  const showForm = mode === 'form' || locale !== 'tr';
  const labels = {
    tr: { title:'Ravza asistanı', subtitle:'Ziyaretinizi birlikte planlayalım', chat:'Sohbet', form:'Talep formu', close:'Asistanı kapat' },
    en: { title:'Rawdah assistant', subtitle:'Plan your visit, step by step', chat:'Türkçe sohbet', form:'Request form', close:'Close assistant' },
    ar: { title:'مساعد الروضة', subtitle:'لنخطط لزيارتك معًا', chat:'Türkçe sohbet', form:'نموذج الطلب', close:'إغلاق المساعد' },
  }[locale];

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [messages, mode]);

  function send(text: string) {
    if (!text.trim()) return;
    const result = respondToVisit(text, details);
    setDetails(result.details);
    setDirty(true);
    setMessages(current => [...current, { role:'user', text:text.trim().slice(0, 1000) }, { role:'assistant', text:result.text, link:result.link }].slice(-60));
    setInput('');
    inputRef.current?.focus();
  }
  function toForm() {
    // A form stays mounted when chatting, preserving entered contact details.
    // Re-seed it only when the conversation actually changed visit details.
    if (dirty && JSON.stringify(formDetails) !== JSON.stringify(details)) {
      setFormDetails(details); setFormKey(value => value + 1);
    }
    setDirty(false); setMode('form');
  }
  return (
    <div className={`visit-assistant ${variant === 'page' ? 'visit-assistant-page' : ''}`}>
      <header className="visit-assistant-header">
        <span className="assistant-brand"><BrandMark className="size-8" /></span>
        <div><h2>{labels.title}</h2><p>{labels.subtitle}</p></div>
        {onClose ? <button type="button" className="assistant-close" onClick={onClose} aria-label={labels.close}><X className="size-5" /></button> : null}
      </header>
      <div className="assistant-tabs" aria-label="Asistan görünümü">
        {locale === 'tr' ? <button type="button" aria-pressed={!showForm} onClick={() => setMode('chat')}><MessageCircle className="size-4" />{labels.chat}</button> : null}
        <button type="button" aria-pressed={showForm} onClick={toForm}>{labels.form}<ArrowRight className="size-4 rtl:rotate-180" /></button>
      </div>
      <div className="assistant-form-panel" hidden={!showForm}>
        <OrderAssistant key={formKey} packages={packages} initialPackageCode={initialPackageCode} initialDetails={formDetails} embedded />
      </div>
      {!showForm ? <>
        <div ref={logRef} className="conversation-log" role="log" aria-label="Ravza asistanıyla sohbet" aria-live="polite" aria-relevant="additions">
          <p className="conversation-date">RAVZA ZİYARETİNİZ İÇİN</p>
          {messages.map((message, index) => <div key={index} className={`conversation-message conversation-${message.role}`}>
            {message.role === 'assistant' ? <span className="conversation-avatar" aria-hidden="true"><BrandMark className="size-6" tone="onLight" /></span> : null}
            <div className="conversation-bubble"><p>{message.text}</p>{message.link ? <a href={message.link.href} target={message.link.href.startsWith('https:') ? '_blank' : undefined} rel={message.link.href.startsWith('https:') ? 'noopener noreferrer' : undefined}>{message.link.label}<ArrowRight className="size-3.5" /></a> : null}</div>
          </div>)}
        </div>
        {details.personCount ? <div className="conversation-summary"><Check className="size-4 shrink-0" /><p>{visitSummary(details)}</p></div> : null}
        <div className="conversation-actions">
          <div className="conversation-suggestions">{visitSuggestions(details).map(suggestion => <button type="button" key={suggestion} onClick={() => send(suggestion)}>{suggestion}</button>)}</div>
          {ready ? <button type="button" className="ravza-button conversation-transfer" onClick={toForm}>Talep formuna aktar<ArrowRight className="size-4" /></button> : null}
          <form className="conversation-composer" onSubmit={event => { event.preventDefault(); send(input); }}>
            <label htmlFor={`visit-chat-${variant}`} className="sr-only">Mesajınız</label>
            <input ref={inputRef} id={`visit-chat-${variant}`} value={input} onChange={event => setInput(event.target.value)} maxLength={1000} autoComplete="off" placeholder="Sorunuzu veya ziyaret bilgilerinizi yazın…" />
            <button type="submit" disabled={!input.trim()} aria-label="Mesajı gönder"><Send className="size-4" /></button>
          </form>
          <p className="conversation-note">Talep, formu onaylayıp gönderdiğinizde kaydedilir.</p>
        </div>
      </> : null}
    </div>
  );
}
