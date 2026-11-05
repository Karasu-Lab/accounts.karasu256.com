import { ApiError } from '@karasu-lab/utils/client';
import { completeOAuthClientIcon, prepareOAuthClientIcon } from '@/lib/actions/developer';

export async function uploadOAuthClientIcon(clientId: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { uploadUrl, intent } = await prepareOAuthClientIcon(clientId, form);

  const uploaded = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  });
  if (!uploaded.ok) throw ApiError.fromResponse(uploaded);

  return completeOAuthClientIcon(clientId, intent);
}
