type BrandLogoProps = {
  variant?: 'mark' | 'wordmark';
  className?: string;
};

export function BrandLogo({ variant = 'wordmark', className = '' }: BrandLogoProps) {
  const prefix = variant === 'mark' ? 'calistrack-mark' : 'calistrack-logo';
  return (
    <span className={`inline-flex shrink-0 items-center ${className}`} role="img" aria-label="CalisTrack">
      <img
        src={`/brand/${prefix}-light.svg`}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain dark:hidden"
      />
      <img
        src={`/brand/${prefix}-dark.svg`}
        alt=""
        aria-hidden="true"
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
}
