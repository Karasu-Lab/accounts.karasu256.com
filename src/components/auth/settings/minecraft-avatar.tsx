'use client';

import { useEffect, useRef } from 'react';

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
