'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Music2, VolumeX } from 'lucide-react';

import { usePublicPreferences } from '@/components/public-preferences';

const copy = {
  tr: {
    announcement:
      'Yeni başlangıca özel kişi başı $2.50 USD',
    musicOn: 'Arka plan müziğini aç',
    musicOff: 'Müziği kapat',
    title: 'Ravza ziyareti için müzik',
  },
  en: {
    announcement:
      'Launch offer: $2.50 USD per person',
    musicOn: 'Turn on background music',
    musicOff: 'Turn off music',
    title: 'Music for your Rawdah visit',
  },
  ar: {
    announcement:
      'عرض البداية: 2.50 دولار أمريكي للشخص',
    musicOn: 'تشغيل موسيقى الخلفية',
    musicOff: 'إيقاف الموسيقى',
    title: 'موسيقى لزيارة الروضة',
  },
};

/** Yarım iz başına tekrar sayısı: kısa yazı 2560px ekranda bile boşluk bırakmaz. */
const MARQUEE_REPEAT = 8;

export function LaunchAnnouncement() {
  const { locale } = usePublicPreferences();
  const message = copy[locale].announcement;
  // Tekrarlar yalnız tarayıcıda eklenir; arama motoru yazıyı bir kez görür.
  const [repeat, setRepeat] = useState(1);
  useEffect(() => setRepeat(MARQUEE_REPEAT), []);

  return (
    <div className="overflow-hidden border-b border-[#d6bd83]/35 bg-[#0a2e1f] text-white">
      <div className="launch-marquee py-2.5" role="region" aria-label={message}>
        {/* Yazı, en geniş ekranı da boşluksuz dolduracak kadar tekrarlanır.
            İz iki eş yarıdan oluşur; -%50 kaydırma kesintisiz döngü sağlar. */}
        <div className="launch-marquee-track">
          {[0, 1].map((half) =>
            Array.from({ length: half === 0 || repeat > 1 ? repeat : 0 }, (_, index) => (
              <span
                key={`${half}-${index}`}
                className="px-8"
                aria-hidden={half === 0 && index === 0 ? undefined : true}
              >
                {message}
              </span>
            )),
          )}
        </div>
      </div>
    </div>
  );
}

const MUSIC_VIDEO_ID = 'fiEqx9pQNfs';
const MUSIC_PREFERENCE_KEY = 'ravza-music';

/**
 * Arka plan müziği: YouTube oynatıcısı görünmez durur, buton yalnız sesi açıp
 * kapatır. Tarayıcılar sesli otomatik oynatmayı ziyaretçi sayfaya ilk kez
 * dokunana kadar engelleyebilir; bu durumda müzik ilk tıklama veya tuşla başlar.
 * Ziyaretçi müziği kapatırsa tercih tarayıcıda hatırlanır.
 */
export function SiteMusicControl() {
  const { locale } = usePublicPreferences();
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(true);
  // Oynatıcı adresi yalnız ilk yüklemede belirlenir; aç/kapa oynatıcıyı yeniden yüklemez.
  const [autoplay, setAutoplay] = useState(true);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const playingRef = useRef(playing);
  const t = copy[locale];

  const command = useCallback((func: 'playVideo' | 'pauseVideo' | 'unMute') => {
    playerRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      'https://www.youtube.com',
    );
  }, []);

  const apply = useCallback(() => {
    if (playingRef.current) {
      command('unMute');
      command('playVideo');
    } else {
      command('pauseVideo');
    }
  }, [command]);

  // Tercih hidrasyondan sonra okunur; sunucu çıktısıyla uyuşmazlık olmasın.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem(MUSIC_PREFERENCE_KEY) === 'off') {
          setPlaying(false);
          setAutoplay(false);
        }
      } catch {
        // Depolama kapalıysa varsayılan: müzik açık.
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    playingRef.current = playing;
    apply();
  }, [playing, apply]);

  // Otomatik oynatma engellendiyse ilk etkileşimde başlat.
  useEffect(() => {
    if (!ready) return;
    const start = () => {
      apply();
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
  }, [ready, apply]);

  function toggle() {
    const next = !playing;
    setPlaying(next);
    try {
      window.localStorage.setItem(MUSIC_PREFERENCE_KEY, next ? 'on' : 'off');
    } catch {
      // Tercih kaydedilemese de düğme çalışır.
    }
  }

  return (
    <>
      <button
        type="button"
        aria-pressed={playing}
        aria-label={playing ? t.musicOff : t.musicOn}
        title={playing ? t.musicOff : t.musicOn}
        onClick={toggle}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        {playing ? <VolumeX className="size-4" /> : <Music2 className="size-4" />}
        <span className="hidden min-[1600px]:inline">{playing ? t.musicOff : t.musicOn}</span>
      </button>

      {/* YouTube 200x200 pikselden küçük oynatıcıda oynatmaz; oynatıcı görünmez ama ekranda durur. */}
      {ready ? (
        <iframe
          ref={playerRef}
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none fixed bottom-0 left-0 -z-10 size-[200px] opacity-0"
          src={`https://www.youtube.com/embed/${MUSIC_VIDEO_ID}?autoplay=${autoplay ? 1 : 0}&loop=1&playlist=${MUSIC_VIDEO_ID}&controls=0&playsinline=1&enablejsapi=1`}
          title={t.title}
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={apply}
        />
      ) : null}
    </>
  );
}
