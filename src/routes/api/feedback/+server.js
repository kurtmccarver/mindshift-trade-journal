import { json } from '@sveltejs/kit';
import { checkRateLimit } from '$lib/rateLimit.server.js';
import { insertFeedback } from '$lib/supabaseFeedback.server.js';

export async function POST({ request, getClientAddress }) {
  const clientAddress = getClientAddress();
  const limit = checkRateLimit(`feedback:${clientAddress}`, { windowMs: 60_000, max: 5 });
  if (!limit.allowed) {
    return json({ error: 'Too many feedback submissions. Please wait a minute and try again.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const name = cleanText(body.name, 80);
  const community = cleanText(body.community, 120);
  const heardFrom = cleanText(body.heardFrom, 140);
  const feedback = cleanText(body.feedback, 1200);

  if (!name || !feedback) {
    return json({ error: 'Name and feedback are required.' }, { status: 400 });
  }

  try {
    await insertFeedback({
      name,
      community,
      heard_from: heardFrom,
      feedback,
      page_url: cleanText(body.pageUrl, 500),
      user_agent: cleanText(request.headers.get('user-agent'), 500),
      ip_hash: await hashClient(clientAddress)
    });
    return json({ ok: true });
  } catch (error) {
    return json({ error: error.message || 'Feedback was not sent.' }, { status: 500 });
  }
}

function cleanText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

async function hashClient(value) {
  const text = String(value || 'unknown');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
