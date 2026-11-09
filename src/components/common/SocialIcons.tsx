import type { SVGProps } from 'react';

/**
 * Íconos SVG livianos para redes sociales.
 * Evitan depender de exportaciones de marcas eliminadas de lucide-react.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function InstagramIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="2.7" y="2.7" width="18.6" height="18.6" rx="5.3" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.55" cy="6.55" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M15.4 21V12.7h2.8l.5-3.3h-3.3V7.3c0-1 .3-1.6 1.7-1.6h1.8V2.8c-.3-.1-1.4-.2-2.6-.2-2.7 0-4.6 1.7-4.6 4.9v1.9H8.6v3.3h3.1V21h3.7Z" />
    </svg>
  );
}
