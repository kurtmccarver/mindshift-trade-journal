import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { listFeedback } from '$lib/supabaseFeedback.server.js';

export async function GET({ params, request, setHeaders }) {
  setHeaders({
    'cache-control': 'no-store, no-cache, must-revalidate',
    'x-robots-tag': 'noindex, nofollow'
  });

  const token = request.headers.get('x-admin-token') || '';
  const slugMatches = env.ADMIN_PANEL_SLUG && params.slug === env.ADMIN_PANEL_SLUG;
  const tokenMatches = env.FEEDBACK_ADMIN_TOKEN && token === env.FEEDBACK_ADMIN_TOKEN;

  if (!slugMatches || !tokenMatches) {
    return json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    return json({ feedback: await listFeedback() });
  } catch (error) {
    return json({ error: error.message || 'Feedback could not be loaded.' }, { status: 500 });
  }
}
