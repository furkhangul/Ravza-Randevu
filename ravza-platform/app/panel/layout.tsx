import type { ReactNode } from 'react';
import { PanelProviders } from '@/components/panel-providers';

export default function PanelLayout({ children }: { children: ReactNode }) {
  return <PanelProviders>{children}</PanelProviders>;
}
