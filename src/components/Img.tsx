import { useState, type ImgHTMLAttributes } from 'react';
import { IconCamera } from './icons';

/** Image with a calm fallback when the photo host is unreachable (offline). */
export function Img({ room, className = '', ...props }: ImgHTMLAttributes<HTMLImageElement> & { room?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div role="img" aria-label={props.alt} className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-[#E9EEF2] text-ink-faint ${className}`}>
        <IconCamera size={24} />
        <span className="text-xs">{room ?? 'Photo'} unavailable offline</span>
      </div>
    );
  }
  return <img {...props} onError={() => setFailed(true)} className={`h-full w-full object-cover ${className}`} decoding="async" />;
}
