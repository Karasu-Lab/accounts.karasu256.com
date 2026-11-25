export function ProviderIcon({ iconUrl, className }: { iconUrl: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current ${className ?? ''}`}
      style={{
        maskImage: `url(${iconUrl})`,
        WebkitMaskImage: `url(${iconUrl})`,
        maskPosition: 'center',
        maskRepeat: 'no-repeat',
        maskSize: 'contain',
      }}
    />
  );
}
