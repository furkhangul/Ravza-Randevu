import {
  BellRing,
  CircleAlert,
  CircleCheck,
  Clock,
  MailX,
  MessageSquare,
  Mail,
} from 'lucide-react';

import {
  countOutboxByStatus,
  listOutbox,
  type OutboxEntry,
} from '@/db/notifications';
import { getEmailConfig, getSmsConfig } from '@/lib/delivery-providers';
import {
  getNotification,
  notificationCatalog,
} from '@/lib/notification-catalog';
import { describeTiming } from '@/lib/notification-schedule';

const statusLabels: Record<OutboxEntry['status'], string> = {
  queued: 'Sırada',
  sent: 'Gönderildi',
  failed: 'Başarısız',
  cancelled: 'İptal edildi',
  skipped: 'Atlandı',
};

const statusStyles: Record<OutboxEntry['status'], string> = {
  queued: 'bg-amber-50 text-amber-800 border-amber-200',
  sent: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  failed: 'bg-red-50 text-red-800 border-red-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  skipped: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatMoment(value: number): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(value));
}

/**
 * Bildirim merkezi.
 *
 * İki şey gösterir: (1) hangi bildirimin ne zaman gittiğini anlatan takvim,
 * (2) gerçekte ne gönderildiğinin kaydı. Sağlayıcı bağlı değilse en üstte
 * bunu açıkça söyler — mesajların neden gitmediği tahmin işi olmasın.
 */
export async function NotificationCenter() {
  const emailReady = getEmailConfig() !== null;
  const smsReady = getSmsConfig() !== null;

  let entries: OutboxEntry[] = [];
  let counts = { queued: 0, sent: 0, failed: 0, cancelled: 0, skipped: 0 };
  let storeAvailable = true;

  try {
    [entries, counts] = await Promise.all([listOutbox(40), countOutboxByStatus()]);
  } catch {
    storeAvailable = false;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <ProviderCard
          ready={emailReady}
          icon={<Mail className="size-5" />}
          title="E-posta sağlayıcısı"
          readyText="Bağlı. Sırasi gelen e-postalar gönderiliyor."
          missingText="Bağlı değil. E-posta bildirimleri kuyruğa yazılıyor ama gönderilmiyor. EMAIL_API_KEY ve EMAIL_FROM_ADDRESS tanımlanmalı."
        />
        <ProviderCard
          ready={smsReady}
          icon={<MessageSquare className="size-5" />}
          title="SMS sağlayıcısı"
          readyText="Bağlı. Kısa mesajlar gönderiliyor."
          missingText="Bağlı değil. SMS bildirimleri gönderilmiyor; aynı bilgi e-postayla gidiyor. SMS_API_KEY ve SMS_SENDER_ID tanımlanmalı."
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sırada" value={counts.queued} icon={<Clock className="size-4" />} />
        <Stat label="Gönderildi" value={counts.sent} icon={<CircleCheck className="size-4" />} />
        <Stat label="Başarısız" value={counts.failed} icon={<CircleAlert className="size-4" />} />
        <Stat label="Atlandı" value={counts.skipped} icon={<MailX className="size-4" />} />
      </div>

      <section aria-labelledby="notification-schedule">
        <h3
          id="notification-schedule"
          className="mb-1 font-serif text-lg tracking-[-.02em]"
        >
          Gönderim takvimi
        </h3>
        <p className="mb-3 text-sm leading-6 text-muted-foreground">
          Aşağıdaki kurallar her rezervasyon için otomatik işler. Bir müşteriye
          aynı bildirim iki kez gitmez; durum değiştiğinde anlamsız kalan
          hatırlatmalar kendiliğinden iptal edilir.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[.1em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Bildirim</th>
                <th className="px-4 py-3 font-semibold">Ne zaman</th>
                <th className="px-4 py-3 font-semibold">Kanal</th>
                <th className="px-4 py-3 font-semibold">Kime</th>
              </tr>
            </thead>
            <tbody>
              {notificationCatalog.map((definition) => (
                <tr key={definition.key} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <strong className="block font-medium">
                      {definition.title}
                    </strong>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {definition.description}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {describeTiming(definition.key)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="flex gap-1.5">
                      {definition.channels.map((channel) => (
                        <span
                          key={channel}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px]"
                        >
                          {channel === 'email' ? (
                            <Mail className="size-3" />
                          ) : (
                            <MessageSquare className="size-3" />
                          )}
                          {channel === 'email' ? 'E-posta' : 'SMS'}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {definition.audience === 'customer' ? 'Müşteri' : 'Yönetim'}
                    {definition.transactional ? '' : ' · onaya bağlı'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="notification-log">
        <h3
          id="notification-log"
          className="mb-1 font-serif text-lg tracking-[-.02em]"
        >
          Gönderim kaydı
        </h3>
        <p className="mb-3 text-sm leading-6 text-muted-foreground">
          Son 40 kayıt. Alıcı adresleri kısmen gizlenir; gereken bilgi
          &quot;gitti mi&quot;dir, adresin tamamı değil.
        </p>

        {!storeAvailable ? (
          <p className="rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground">
            Bildirim kaydına şu an ulaşılamıyor. Veritabanı bağlantısı
            kurulduğunda kayıtlar burada görünür.
          </p>
        ) : entries.length === 0 ? (
          <p className="flex items-center gap-3 rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground">
            <BellRing className="size-5 shrink-0 text-[#c9a86a]" />
            Henüz bildirim gönderilmedi. İlk rezervasyon oluştuğunda takvim
            kendiliğinden kurulur ve kayıtlar burada birikir.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[.1em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Bildirim</th>
                  <th className="px-4 py-3 font-semibold">Alıcı</th>
                  <th className="px-4 py-3 font-semibold">Zaman</th>
                  <th className="px-4 py-3 font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <strong className="block font-medium">
                        {safeTitle(entry.notificationKey)}
                      </strong>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {entry.channel === 'email' ? 'E-posta' : 'SMS'}
                        {entry.lastError ? ` · ${entry.lastError}` : ''}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {entry.recipient}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatMoment(entry.sentAt ?? entry.sendAfter)}
                      {entry.attempts > 1 ? ` · ${entry.attempts}. deneme` : ''}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusStyles[entry.status]}`}
                      >
                        {statusLabels[entry.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Katalogdan kaldırılmış eski bir anahtar kayıtta durabilir; çökmemeli. */
function safeTitle(key: string): string {
  try {
    return getNotification(key as never).title;
  } catch {
    return key;
  }
}

function ProviderCard({
  ready,
  icon,
  title,
  readyText,
  missingText,
}: {
  ready: boolean;
  icon: React.ReactNode;
  title: string;
  readyText: string;
  missingText: string;
}) {
  return (
    <div
      className={`flex gap-3 rounded-2xl border p-4 ${ready ? 'border-emerald-200 bg-emerald-50' : 'border-[#d7c9ae] bg-[#f8f3e8]'}`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${ready ? 'bg-emerald-600 text-white' : 'bg-[#0a2e1f] text-[#d2b77b]'}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <strong className="block text-sm font-semibold">{title}</strong>
        <p
          className={`mt-1 text-xs leading-5 ${ready ? 'text-emerald-900' : 'text-[#5c4a22]'}`}
        >
          {ready ? readyText : missingText}
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      <strong className="mt-1 block font-serif text-2xl">{value}</strong>
    </div>
  );
}
