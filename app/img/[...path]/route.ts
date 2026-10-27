import { apiRoute, fail, send } from '@/lib/server/http';
import { image, isKnownImage, type Img } from '@/lib/server/images';

export const GET = apiRoute<{ path: string[] }>(async (req, { params }) => {
  const p = '/' + (await params).path.join('/');
  if (!isKnownImage(p)) return fail(404, 'not found');
  let img: Img;
  try {
    img = await image(p);
  } catch {
    return fail(404, 'no picture');
  }
  // the url holds a content hash, so browsers may keep it for a week
  return send(req, img, img.type, 'private, max-age=604800, immutable');
});
