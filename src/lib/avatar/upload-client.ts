import { ApiError } from '@karasu-lab/utils/client';

export async function uploadUserIcon(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const prepared = await fetch('/api/user/icon/prepare', { method: 'POST', body: form });
  if (!prepared.ok) throw ApiError.fromResponse(prepared);
  const { uploadUrl, intent } = (await prepared.json()) as { uploadUrl: string; intent: string };

  const uploaded = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  });
  if (!uploaded.ok) throw ApiError.fromResponse(uploaded);

  const completed = await fetch('/api/user/icon/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent }),
  });
  if (!completed.ok) throw ApiError.fromResponse(completed);
  const { photoURL } = (await completed.json()) as { photoURL: string };
  return photoURL;
}
