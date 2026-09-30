/**
 * Ravza Randevu markası.
 *
 * Biçim: sivri İslami kemer (Ravza'ya açılan kapı) ve içinde hilal. Gerçek
 * bir yapının veya resmî bir kurumun taklidi değildir; soyut bir mimari
 * göndermedir. İki öğeye indirgenmiştir; 24 px'te de okunur.
 *
 * `tone` yüzeye göre renk verir: koyu zeminde altın, açık zeminde yeşil.
 */
export function BrandMark({
  className = 'size-9',
  tone = 'onDark',
}: {
  className?: string;
  tone?: 'onDark' | 'onLight' | 'inherit';
}) {
  const arch =
    tone === 'onDark'
      ? '#d2b77b'
      : tone === 'onLight'
        ? '#0a2e1f'
        : 'currentColor';
  const crescent =
    tone === 'onDark'
      ? '#f4e3bd'
      : tone === 'onLight'
        ? '#c9a86a'
        : 'currentColor';

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      <path
        d="M13.5 40.5V27A13.5 13.5 0 0 1 24 13a13.5 13.5 0 0 1 10.5 14v13.5"
        stroke={arch}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24.6 21.4A7 7 0 1 0 30 33a5.6 5.6 0 1 1-5.4-11.6Z"
        fill={crescent}
      />
    </svg>
  );
}
