import { apiRoute, fail } from '@/lib/server/http';
import { image, isPhotoPath, type Img } from '@/lib/server/images';

export const GET = apiRoute<{ path: string[] }>(async (_req, { params }) => {
  const p = '/' + (await params).path.join('/');
  if (!isPhotoPath(p)) return fail(404, 'not found');
  let img: Img;
  try {
    img = await image(p);
  } catch {
    return fail(404, 'no picture');
  }
  // nobody keeps it: not the browser, not a cache on the way
  return new Response(img.body, { headers: { 'Content-Type': img.type, 'Cache-Control': 'no-store' } });
});
