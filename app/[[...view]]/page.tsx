import { notFound } from 'next/navigation';
import { Views } from '@/components/views';

// every view is this one page: switching between them happens in the browser, with no trip
// to the server (the header's tabs only change the address)
const VIEWS = new Set(['', 'transfers', 'calculator', 'rncp']);

export default async function Page({ params }: { params: Promise<{ view?: string[] }> }) {
  const { view = [] } = await params;
  if (view.length > 1 || !VIEWS.has(view[0] ?? '')) notFound();
  return <Views />;
}
