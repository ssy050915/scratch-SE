// Vercel serverless function: forwards AI requests to the Claude API.
// Set ANTHROPIC_API_KEY in Vercel > Project > Settings > Environment Variables.
// Optional: APP_CODE (a shared code users must enter before using AI), ANTHROPIC_MODEL.
module.exports = async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  const code = process.env.APP_CODE || '';
  if (req.method === 'GET') return res.status(200).json({ ok: !!key, needsCode: !!code });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!key) return res.status(503).json({ error: 'not_configured' });
  if (code && req.headers['x-app-code'] !== code) return res.status(401).json({ error: 'bad_code' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { prompt, images = [] } = body;
  if (typeof prompt !== 'string' || !prompt || prompt.length > 40000) return res.status(400).json({ error: 'bad_prompt' });
  if (!Array.isArray(images) || images.length > 2) return res.status(400).json({ error: 'too_many_images' });
  const okType = t => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(t);
  for (const im of images) if (!okType(im.media_type) || typeof im.data !== 'string' || im.data.length > 3_000_000) return res.status(400).json({ error: 'bad_image' });

  const content = [
    ...images.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.media_type, data: im.data } })),
    { type: 'text', text: prompt },
  ];
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5', max_tokens: 2000, messages: [{ role: 'user', content }] }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: j?.error?.type || 'upstream_error' });
    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ error: 'network_error' });
  }
};
