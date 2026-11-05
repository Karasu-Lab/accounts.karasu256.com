import { isAvatarCdnUrl, userIdFromAvatarPath } from './paths';

export function avatarSrc(url: string | null): string | null {
  if (!url || !isAvatarCdnUrl(url)) return url;
  const parsed = new URL(url);
  const userId = userIdFromAvatarPath(parsed.pathname.slice(1));
  if (!userId) return url;
  const version = parsed.searchParams.get('v');
  const query = version ? `?v=${encodeURIComponent(version)}` : '';
  return `/api/users/${encodeURIComponent(userId)}/avatar${query}`;
}
