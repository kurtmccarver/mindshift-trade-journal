import { env } from '$env/dynamic/private';

const FEEDBACK_TABLE = 'feedback';

export function isSupabaseConfigured() {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function insertFeedback(payload) {
  const response = await supabaseFetch(FEEDBACK_TABLE, {
    method: 'POST',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify([payload])
  });

  if (!response.ok) {
    throw new Error(await getSupabaseError(response));
  }
}

export async function listFeedback() {
  const response = await supabaseFetch(`${FEEDBACK_TABLE}?select=*&order=created_at.desc&limit=200`, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(await getSupabaseError(response));
  }

  return response.json();
}

async function supabaseFetch(path, options = {}) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase feedback storage is not configured.');
  }

  return fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function getSupabaseError(response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    return json.message || json.error || 'Supabase request failed.';
  } catch {
    return text || 'Supabase request failed.';
  }
}
