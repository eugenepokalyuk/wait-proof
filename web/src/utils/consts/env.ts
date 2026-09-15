export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
).replace(/\/$/, '');

// Next сам префиксует Link и роутер, но не service worker, manifest и
// ссылки, которые уходят наружу (приглашения, пуши). Там — вручную.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
