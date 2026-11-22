'use server';

export async function loadMinecraftServerAddress(): Promise<string | null> {
  return process.env.MC_AUTH_ADDRESS || null;
}
