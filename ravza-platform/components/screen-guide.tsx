import { CircleHelp, TriangleAlert } from 'lucide-react';

export type ScreenGuideContent = {
  /** Bu ekran ne işe yarar — tek cümlede. */
  purpose: string;
  /** Buradan yapılabilecek somut işler. */
  actions: string[];
  /** Bu ekrandaki işlemin sistemde ne değiştirdiği. */
  effect: string;
  /** Yapılamayan veya kapalı olan şey; boş bırakılabilir. */
  limit?: string;
};

/**
 * Panelin her ekranının başında duran açıklama bloğu. Ekrana ilk kez giren
 * yöneticinin "burası ne, ne yaparsam ne olur" sorusunu, ekranı kurcalamadan
 * yanıtlamasını sağlar.
 */
export function ScreenGuide({ purpose, actions, effect, limit }: ScreenGuideContent) {
  return (
    <section
      aria-label="Bu ekran hakkında"
      className="mb-6 overflow-hidden rounded-2xl border border-[#d7c9ae] bg-[#f8f3e8]"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:gap-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0a2e1f] text-[#d2b77b]">
          <CircleHelp className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-6 font-medium text-[#3f3320]">
            {purpose}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[.14em] text-[#80652f]">
                Buradan yapabilecekleriniz
              </p>
              <ul className="mt-2 space-y-1.5">
                {actions.map((action) => (
                  <li
                    key={action}
                    className="flex gap-2 text-xs leading-5 text-[#5c4a22]"
                  >
                    <span aria-hidden="true" className="mt-[.45rem] size-1 shrink-0 rounded-full bg-[#c9a86a]" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[.14em] text-[#80652f]">
                Yaptığınız işlem neyi değiştirir
              </p>
              <p className="mt-2 text-xs leading-5 text-[#5c4a22]">{effect}</p>
            </div>
          </div>

          {limit ? (
            <p className="mt-4 flex gap-2 border-t border-[#d7c9ae] pt-3 text-xs leading-5 text-[#9f432b]">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {limit}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
