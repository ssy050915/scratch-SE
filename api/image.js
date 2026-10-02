// Vercel serverless function: turns a worn / full-body photo into a clean product image
// of ONE garment, using OpenAI's image edit API.
// Set OPENAI_API_KEY in Vercel > Settings > Environment Variables.
// Optional: OPENAI_IMAGE_MODEL (default gpt-image-2), IMAGE_QUALITY (low|medium|high, default medium), APP_CODE.
const WHAT = {
  top: 'top (the shirt / t-shirt / knit / sweatshirt / blouse worn on the upper body, NOT the jacket or coat over it)',
  bottom: 'bottoms (the pants / jeans / skirt / shorts)',
  outer: 'outerwear (the jacket / coat / cardigan / padded jacket worn on the outside)',
  dress: 'dress (one-piece dress; if top and skirt are a matching set, show them together as one outfit piece)',
  shoes: 'pair of shoes, shown from a 3/4 side view',
  bag: 'bag / handbag',
  umbrella: 'umbrella, shown neatly folded and closed, standing upright',
};

module.exports = async (req, res) => {
  const key = process.env.OPENAI_API_KEY;
  const code = process.env.APP_CODE || '';
  if (req.method === 'GET') return res.status(200).json({ ok: !!key });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!key) return res.status(503).json({ error: 'not_configured' });
  if (code && req.headers['x-app-code'] !== code) return res.status(401).json({ error: 'bad_code' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { image, category, hint = '' } = body;
  if (typeof image !== 'string' || image.length > 4_000_000) return res.status(400).json({ error: 'bad_image' });
  const what = WHAT[category];
  if (!what) return res.status(400).json({ error: 'bad_category' });

  const prompt = [
    `The reference photo shows a person wearing several clothes. Create a brand-new e-commerce product image of ONLY the ${what} from the photo.`,
    'Show it as a professional catalog product shot: front view, garment fully visible, symmetrical, neatly laid out as if on an invisible ghost mannequin, sleeves and legs straight and not folded.',
    'Keep the exact same colors, fabric texture, fit, logos, letters, patches, stripes, buttons, zippers and details as in the photo. Do not invent new graphics.',
    'No person, no body parts, no face, no hair, no hanger, no other clothing items, no accessories, no text or watermark.',
    'Soft even studio lighting, centered, filling most of the frame.',
    hint ? `Extra note from the user: ${String(hint).slice(0, 200)}` : '',
  ].join(' ');
  const BG_TRANSPARENT = ' Transparent background, no shadow on the ground.';
  // fallback: a chroma-key green screen is easy to remove even for white or grey clothes
  const BG_GREEN = ' Place it on a completely flat, uniform chroma-key green background (#00B140), no gradient, no floor shadow, no green reflections on the garment.';

  const call = async (withTransparent) => {
    const fd = new FormData();
    fd.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2');
    fd.append('prompt', prompt + (withTransparent ? BG_TRANSPARENT : BG_GREEN));
    fd.append('image', new Blob([Buffer.from(image, 'base64')], { type: 'image/jpeg' }), 'photo.jpg');
    fd.append('size', '1024x1024');
    fd.append('quality', process.env.IMAGE_QUALITY || 'medium');
    fd.append('n', '1');
    if (withTransparent) { fd.append('background', 'transparent'); fd.append('output_format', 'png'); }
    const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd });
    return { r, j: await r.json().catch(() => ({})) };
  };

  try {
    let { r, j } = await call(true);
    // some models don't accept transparent backgrounds: retry on a green screen (the app removes it)
    if (!r.ok && r.status === 400) ({ r, j } = await call(false));
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: j?.error?.code || j?.error?.type || 'upstream_error', message: j?.error?.message || '' });
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ error: 'no_image' });
    return res.status(200).json({ b64 });
  } catch (e) {
    return res.status(502).json({ error: 'network_error' });
  }
};
