'use client';

import { usePathname } from 'next/navigation';
import { Calculator } from '@/components/calculator/calculator';
import { RankingView } from '@/components/ranking/ranking-view';
import { RncpView } from '@/components/rncp/rncp-view';
import { TransfersView } from '@/components/transfers/transfers-view';

// the view for the address: picked here, in the browser, as the address changes
export function Views() {
  const path = usePathname();
  if (path.startsWith('/transfers')) return <TransfersView />;
  if (path.startsWith('/calculator')) return <Calculator />;
  if (path.startsWith('/rncp')) return <RncpView />;
  return <RankingView />;
}
