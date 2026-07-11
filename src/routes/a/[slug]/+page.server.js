import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

export function load({ params, setHeaders }) {
  setHeaders({
    'cache-control': 'no-store, no-cache, must-revalidate',
    'x-robots-tag': 'noindex, nofollow'
  });

  if (!env.ADMIN_PANEL_SLUG || params.slug !== env.ADMIN_PANEL_SLUG) {
    throw error(404, 'Not found');
  }

  return {
    adminSlug: params.slug
  };
}
