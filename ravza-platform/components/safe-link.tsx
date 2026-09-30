import type { AnchorHTMLAttributes, ReactNode } from 'react';

type SafeLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  children?: ReactNode;
};

/**
 * Cloudflare Workers üzerindeki Vinext sürümünde Next Link'in RSC prefetch
 * katmanı bazı tarayıcılarda bozulabildiği için menü ve CTA'larda tarayıcının
 * güvenilir yerel bağlantı davranışını kullanır.
 */
export default function SafeLink({ href, children, ...props }: SafeLinkProps) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
