import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { listFeedback } from '$lib/supabaseFeedback.server.js';

export async function GET({ request }) {
  const token = request.headers.get('x-admin-token') || new URL(request.url).searchParams.get('token');

  if (!env.FEEDBACK_ADMIN_TOKEN || token !== env.FEEDBACK_ADMIN_TOKEN) {
    return json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    return json({ feedback: await listFeedback() });
  } catch (error) {
    return json({ error: error.message || 'Feedback could not be loaded.' }, { status: 500 });
  }
}
