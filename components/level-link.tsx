import Link from 'next/link';
import { calcHref } from '@/lib/url-state';

export function LevelLink({ level }: { level: number }) {
  return (
    <Link href={calcHref(level)} prefetch={false} scroll={false} title="open in the calculator" className="hover:decoration-dotted">
      {level.toFixed(2)}
    </Link>
  );
}
