import { campusId } from '@/lib/server/campuses';
import { apiRoute, fail, send } from '@/lib/server/http';
import { rankingNow } from '@/lib/server/ranking';

// a kept ranking goes out whole (json, compressed on the way); one still being fetched goes
// out line by line as 42 sends it, best students first, so the page fills from the top
export const GET = apiRoute<{ campus: string }>(async (_req, { params }) => {
  const id = await campusId((await params).campus);
  if (id == null) return fail(404, 'unknown campus');
  const now = await rankingNow(id);
  if ('ranking' in now) return send(now.ranking);
  const { feed } = now;
  const encoder = new TextEncoder();
  let flush = () => {};
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let sent = 0;
      flush = () => {
        while (sent < feed.lines.length) controller.enqueue(encoder.encode(feed.lines[sent++]));
        if (feed.done) {
          feed.listeners.delete(flush);
          controller.close();
        }
      };
      feed.listeners.add(flush);
      flush();
    },
    cancel() {
      feed.listeners.delete(flush);
    },
  });
  return new Response(body, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
});
