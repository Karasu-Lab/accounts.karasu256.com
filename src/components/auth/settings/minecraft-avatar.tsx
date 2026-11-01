'use client';

import { useEffect, useRef } from 'react';

/**
 * A Minecraft avatar rendered from the player's skin texture.
 *
 * The Minecraft provider profile's `avatarUrl` is the public Mojang
 * texture URL, whose image is the raw UV-mapped skin texture — not an
 * avatar. The conversion therefore happens here, on the client: the
 * head's front region (base layer at (8, 8), overlay layer at (40, 8),
 * each 8×8) is drawn onto a canvas, which CSS then scales up with
 * pixelated rendering. The texture host serves
 * `Access-Control-Allow-Origin: *`, so the image can be drawn without
 * tainting the canvas.
 *
 * Legacy 64×32 textures get no overlay: their overlay region is
 * commonly opaque padding rather than a real hat layer, which would
 * cover the whole face. While the texture loads (or if it fails), the
 * canvas stays empty and the tile's provider icon shows through the
 * caller's fallback arrangement.
 */
export function MinecraftAvatar({ textureUrl }: { textureUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (cancelled) return;
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 8, 8, 8, 8, 0, 0, canvas.width, canvas.height);
      if (image.height >= 64) {
        context.drawImage(image, 40, 8, 8, 8, 0, 0, canvas.width, canvas.height);
      }
    };
    image.src = textureUrl;
    return () => {
      cancelled = true;
    };
  }, [textureUrl]);

  return <canvas ref={canvasRef} width={8} height={8} aria-hidden="true" className="size-full [image-rendering:pixelated]" />;
}
