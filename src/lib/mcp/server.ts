import { z } from 'zod';
import type { SessionUser } from '@/lib/session-user';
import { completeIconUpload, deleteIcon, getVerifiedAvatar, prepareIconUpload, setIconFromProvider, validateIconFile } from '@/lib/avatar/icon';
import { pollDeviceToken, startDeviceAuthorization } from './device';

export const MCP_PROTOCOL_VERSION = '2025-03-26';

const SUPPORTED_PROTOCOL_VERSIONS = new Set(['2025-03-26', '2025-06-18', '2024-11-05']);

const DEVICE_TOOL_NAMES = new Set(['start_device_authorization', 'poll_device_token']);

export interface McpContext {
  user: SessionUser | null;
  cookieHeader: string | null;
}

export interface McpResponse {
  status: number;
  body: Record<string, unknown> | null;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const emptySchema = { type: 'object', properties: {}, additionalProperties: false } as const;

const iconFileSchema = {
  type: 'object',
  properties: {
    contentBase64: { type: 'string', description: 'The icon image file encoded as base64.' },
    contentType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp'] },
  },
  required: ['contentBase64', 'contentType'],
  additionalProperties: false,
} as const;

export const MCP_TOOLS: ToolDefinition[] = [
  {
    name: 'start_device_authorization',
    description:
      'Starts device sign-in against auth.karasu256.com using the OAuth client ID configured for this MCP server. Returns a user code and verification URL for the user to approve. No authentication is required.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'poll_device_token',
    description:
      'Polls the device authorization started by start_device_authorization, exchanging the device code at the OAuth token endpoint. While the user has not approved yet, the result reports authorization_pending. Once approved, the result carries the OAuth access token and refresh token issued for this server\'s OAuth client; send the access token as a Bearer token on later MCP requests.',
    inputSchema: {
      type: 'object',
      properties: { deviceCode: { type: 'string', description: 'The device_code returned by start_device_authorization.' } },
      required: ['deviceCode'],
      additionalProperties: false,
    },
  },
  {
    name: 'prepare_icon_upload',
    description:
      'Equivalent of POST /api/user/icon/prepare: validates the icon image, computes its SHA-256 and returns a presigned storage URL plus a signed upload intent. Requires authentication.',
    inputSchema: iconFileSchema,
  },
  {
    name: 'complete_icon_upload',
    description:
      'Equivalent of POST /api/user/icon/complete: verifies the object uploaded to the presigned URL from prepare_icon_upload and sets it as the profile icon. Requires authentication.',
    inputSchema: {
      type: 'object',
      properties: { intent: { type: 'string', description: 'The intent returned by prepare_icon_upload.' } },
      required: ['intent'],
      additionalProperties: false,
    },
  },
  {
    name: 'upload_icon',
    description:
      'Uploads a profile icon end to end on the server, performing the same steps as the accounts.karasu256.com client: prepare a presigned upload, PUT the file to storage, then complete the upload so the stored icon becomes the profile icon. Requires authentication.',
    inputSchema: iconFileSchema,
  },
  {
    name: 'set_icon_from_provider',
    description: 'Equivalent of PUT /api/user/icon: sets the profile icon to the avatar of one of the linked providers. Requires authentication.',
    inputSchema: {
      type: 'object',
      properties: { providerId: { type: 'string', description: 'The linked provider ID, such as google, github, microsoft, xbox or minecraft.' } },
      required: ['providerId'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_icon',
    description: 'Equivalent of DELETE /api/user/icon: clears the profile icon. Requires authentication.',
    inputSchema: emptySchema,
  },
  {
    name: 'get_icon',
    description:
      'Equivalent of GET /api/users/{id}/avatar: returns the verified profile icon image. Defaults to the authenticated user when userId is omitted. Requires authentication.',
    inputSchema: {
      type: 'object',
      properties: { userId: { type: 'string', description: 'The user ID whose icon to fetch. Defaults to the authenticated user.' } },
      additionalProperties: false,
    },
  },
];

const iconFileArgs = z.object({
  contentBase64: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

function textResult(text: string, isError = false): Record<string, unknown> {
  return { content: [{ type: 'text', text }], isError };
}

function jsonResult(value: unknown): Record<string, unknown> {
  return textResult(JSON.stringify(value));
}

function errorResult(error: unknown): Record<string, unknown> {
  return textResult(error instanceof Error ? error.message : String(error), true);
}

async function callTool(name: string, args: unknown, context: McpContext): Promise<Record<string, unknown>> {
  if (name === 'start_device_authorization') {
    return jsonResult(await startDeviceAuthorization());
  }
  if (name === 'poll_device_token') {
    const parsed = z.object({ deviceCode: z.string().min(1) }).safeParse(args);
    if (!parsed.success) return textResult('poll_device_token requires a deviceCode argument.', true);
    const result = await pollDeviceToken(parsed.data.deviceCode);
    return jsonResult(result);
  }

  const user = context.user;
  if (!user) return textResult('Unauthorized', true);

  switch (name) {
    case 'prepare_icon_upload': {
      const parsed = iconFileArgs.safeParse(args);
      if (!parsed.success) return textResult('prepare_icon_upload requires contentBase64 and a supported contentType.', true);
      const bytes = Buffer.from(parsed.data.contentBase64, 'base64');
      const validationError = validateIconFile(parsed.data.contentType, bytes.byteLength);
      if (validationError) return textResult(validationError, true);
      return jsonResult(await prepareIconUpload(user.id, bytes, parsed.data.contentType));
    }
    case 'complete_icon_upload': {
      const parsed = z.object({ intent: z.string().min(1) }).safeParse(args);
      if (!parsed.success) return textResult('complete_icon_upload requires an intent argument.', true);
      const cdnUrl = process.env.CDN_URL;
      if (!cdnUrl) return textResult('image_api_not_configured', true);
      const result = await completeIconUpload(user.id, parsed.data.intent, cdnUrl);
      if (!result.ok) return textResult(result.error, true);
      return jsonResult({ photoURL: result.photoURL });
    }
    case 'upload_icon': {
      const parsed = iconFileArgs.safeParse(args);
      if (!parsed.success) return textResult('upload_icon requires contentBase64 and a supported contentType.', true);
      const bytes = Buffer.from(parsed.data.contentBase64, 'base64');
      const validationError = validateIconFile(parsed.data.contentType, bytes.byteLength);
      if (validationError) return textResult(validationError, true);
      const cdnUrl = process.env.CDN_URL;
      if (!cdnUrl) return textResult('image_api_not_configured', true);
      const prepared = await prepareIconUpload(user.id, bytes, parsed.data.contentType);
      const uploaded = await fetch(prepared.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': parsed.data.contentType },
        body: bytes,
      });
      if (!uploaded.ok) {
        const body = await uploaded.text().catch(() => '');
        return textResult(`Storage upload failed: HTTP ${uploaded.status} ${body}`.trim(), true);
      }
      const result = await completeIconUpload(user.id, prepared.intent, cdnUrl);
      if (!result.ok) return textResult(result.error, true);
      return jsonResult({ photoURL: result.photoURL });
    }
    case 'set_icon_from_provider': {
      const parsed = z.object({ providerId: z.string().min(1) }).safeParse(args);
      if (!parsed.success) return textResult('set_icon_from_provider requires a providerId argument.', true);
      const photoURL = await setIconFromProvider(user.id, parsed.data.providerId, context.cookieHeader);
      if (!photoURL) return textResult('Not found: the provider has no avatar available.', true);
      return jsonResult({ photoURL });
    }
    case 'delete_icon': {
      await deleteIcon(user.id, context.cookieHeader);
      return jsonResult({ photoURL: null });
    }
    case 'get_icon': {
      const parsed = z.object({ userId: z.string().min(1).optional() }).safeParse(args ?? {});
      if (!parsed.success) return textResult('get_icon takes an optional userId argument.', true);
      const cdnUrl = process.env.CDN_URL;
      if (!cdnUrl) return textResult('image_api_not_configured', true);
      const targetId = parsed.data.userId ?? user.id;
      const avatar = await getVerifiedAvatar(targetId, null, cdnUrl);
      if (!avatar) return textResult('Not found: no verified icon is stored for this user.', true);
      const bytes = Buffer.from(await new Response(avatar.body).arrayBuffer());
      return {
        content: [
          { type: 'image', data: bytes.toString('base64'), mimeType: avatar.contentType },
          { type: 'text', text: JSON.stringify({ userId: targetId, contentType: avatar.contentType, size: bytes.byteLength }) },
        ],
        isError: false,
      };
    }
    default:
      return textResult(`Unknown tool: ${name}`, true);
  }
}

function rpcResult(id: string | number | null, result: Record<string, unknown>): McpResponse {
  return { status: 200, body: { jsonrpc: '2.0', id, result } };
}

function rpcError(status: number, id: string | number | null, code: number, message: string): McpResponse {
  return { status, body: { jsonrpc: '2.0', id, error: { code, message } } };
}

export async function handleMcpMessage(message: unknown, context: McpContext): Promise<McpResponse> {
  if (typeof message !== 'object' || message === null || Array.isArray(message)) {
    return rpcError(400, null, -32600, 'Invalid Request');
  }
  const request = message as { id?: string | number | null; method?: unknown; params?: unknown };
  const isNotification = request.id === undefined || request.id === null;
  const id = isNotification ? null : (request.id as string | number);
  if (typeof request.method !== 'string') {
    return rpcError(400, id, -32600, 'Invalid Request');
  }

  if (isNotification) return { status: 202, body: null };

  switch (request.method) {
    case 'initialize': {
      const params = (request.params ?? {}) as { protocolVersion?: unknown };
      const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : null;
      return rpcResult(id, {
        protocolVersion: requested && SUPPORTED_PROTOCOL_VERSIONS.has(requested) ? requested : MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'accounts.karasu256.com', version: '0.1.0' },
      });
    }
    case 'ping':
      return rpcResult(id, {});
    case 'tools/list':
      return rpcResult(id, { tools: MCP_TOOLS });
    case 'tools/call': {
      const params = (request.params ?? {}) as { name?: unknown; arguments?: unknown };
      if (typeof params.name !== 'string') return rpcError(400, id, -32602, 'Invalid params: a tool name is required');
      if (!MCP_TOOLS.some((tool) => tool.name === params.name)) return rpcError(400, id, -32602, `Unknown tool: ${params.name}`);
      if (!DEVICE_TOOL_NAMES.has(params.name) && !context.user) {
        return rpcError(401, id, -32001, 'Unauthorized');
      }
      try {
        return rpcResult(id, await callTool(params.name, params.arguments ?? {}, context));
      } catch (error) {
        return rpcResult(id, errorResult(error));
      }
    }
    default:
      return rpcError(400, id, -32601, `Method not found: ${request.method}`);
  }
}
