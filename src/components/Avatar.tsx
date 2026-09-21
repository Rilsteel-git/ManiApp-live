/* ============================================================
   Avatar.tsx — padanan PW.render.paintAvatar().
   Tanpa foto, avatar menampilkan inisial nama (fallback 'M').
   ============================================================ */

import type { CSSProperties } from 'react';

export function Avatar({
  name,
  photo,
  className,
  id,
  style
}: {
  name?: string;
  photo?: string;
  className: string;
  id?: string;
  style?: CSSProperties;
}) {
  const initial = (name || 'M').trim().charAt(0).toUpperCase() || 'M';
  if (photo) {
    return (
      <span
        id={id}
        className={`${className} has-photo`}
        style={{ ...style, backgroundImage: `url("${photo}")` }}
      />
    );
  }
  return <span id={id} className={className} style={style}>{initial}</span>;
}
