import React from 'react';

// Retro desktop icons drawn on a 32x32 grid with crisp edges, so they stay sharp at 16px and 32px.
export type IconId = 'info' | 'notes' | 'audit' | 'levels' | 'game' | 'mentors' | 'mines' | 'color' | 'invaders' | 'start' | 'logoff';

const K = '#000';
const W = '#fff';
const G = '#c2c6ca';
const D = '#85898d';

const glyphs: Record<IconId, React.ReactNode> = {
  // ID card with a portrait
  info: (
    <>
      <rect x="2" y="6" width="28" height="21" fill={K} />
      <rect x="3" y="7" width="26" height="19" fill="#fffbe6" />
      <rect x="3" y="7" width="26" height="4" fill="#0a246a" />
      <rect x="5" y="13" width="9" height="11" fill={D} />
      <rect x="7" y="14" width="5" height="5" fill="#f2c79b" />
      <rect x="6" y="19" width="7" height="5" fill="#1084d0" />
      <rect x="16" y="14" width="11" height="2" fill={K} />
      <rect x="16" y="18" width="9" height="2" fill={D} />
      <rect x="16" y="22" width="10" height="2" fill={D} />
    </>
  ),
  // Notepad with spiral binding
  notes: (
    <>
      <rect x="6" y="4" width="21" height="26" fill={K} />
      <rect x="7" y="5" width="19" height="24" fill={W} />
      <rect x="7" y="5" width="19" height="4" fill="#1084d0" />
      {[9, 13, 17, 21].map((x) => <rect key={x} x={x} y="2" width="2" height="5" fill={D} />)}
      {[12, 16, 20, 24].map((y) => <rect key={y} x="9" y={y} width="15" height="1" fill="#7ea7d8" />)}
      <rect x="22" y="22" width="4" height="7" fill={G} />
    </>
  ),
  // Horizontal up/down bars (audit ratio)
  audit: (
    <>
      <rect x="3" y="3" width="26" height="26" fill={K} />
      <rect x="4" y="4" width="24" height="24" fill={W} />
      <rect x="6" y="6" width="1" height="20" fill={K} />
      <rect x="7" y="9" width="17" height="5" fill="#2e8b57" />
      <rect x="7" y="18" width="11" height="5" fill="#c0392b" />
      <rect x="7" y="14" width="17" height="1" fill={D} />
      <rect x="7" y="23" width="11" height="1" fill={D} />
    </>
  ),
  // Vertical bar chart (levels)
  levels: (
    <>
      <rect x="3" y="3" width="26" height="26" fill={K} />
      <rect x="4" y="4" width="24" height="24" fill={W} />
      <rect x="6" y="25" width="20" height="1" fill={K} />
      <rect x="7" y="17" width="3" height="8" fill="#29353C" />
      <rect x="11" y="11" width="3" height="14" fill="#29353C" />
      <rect x="15" y="7" width="3" height="18" fill="#1084d0" />
      <rect x="19" y="13" width="3" height="12" fill="#29353C" />
      <rect x="23" y="19" width="3" height="6" fill="#29353C" />
    </>
  ),
  // Trophy
  game: (
    <>
      <rect x="8" y="4" width="16" height="12" fill="#b8860b" />
      <rect x="9" y="5" width="14" height="10" fill="#ffd700" />
      <rect x="10" y="6" width="3" height="7" fill="#fff4a3" />
      <rect x="4" y="6" width="4" height="2" fill="#b8860b" />
      <rect x="4" y="6" width="2" height="6" fill="#b8860b" />
      <rect x="4" y="11" width="5" height="2" fill="#b8860b" />
      <rect x="24" y="6" width="4" height="2" fill="#b8860b" />
      <rect x="26" y="6" width="2" height="6" fill="#b8860b" />
      <rect x="23" y="11" width="5" height="2" fill="#b8860b" />
      <rect x="10" y="16" width="12" height="2" fill="#b8860b" />
      <rect x="14" y="18" width="4" height="4" fill="#daa520" />
      <rect x="10" y="22" width="12" height="3" fill="#8b5a2b" />
      <rect x="8" y="25" width="16" height="4" fill="#5c3a1a" />
    </>
  ),
  // Medal on a ribbon
  mentors: (
    <>
      <polygon points="9,2 15,2 18,14 13,15" fill="#c0392b" />
      <polygon points="23,2 17,2 14,14 19,15" fill="#1f4fbf" />
      <circle cx="16" cy="21" r="9" fill="#8a6d00" />
      <circle cx="16" cy="21" r="7.5" fill="#ffd700" />
      <circle cx="16" cy="21" r="4.5" fill="#e0b400" />
      <rect x="15" y="17" width="2" height="8" fill="#8a6d00" />
      <rect x="14" y="18" width="2" height="1" fill="#8a6d00" />
      <rect x="14" y="24" width="4" height="1" fill="#8a6d00" />
    </>
  ),
  // Mine on a raised tile
  mines: (
    <>
      <rect x="2" y="2" width="28" height="28" fill={G} />
      <rect x="2" y="2" width="28" height="2" fill={W} />
      <rect x="2" y="2" width="2" height="28" fill={W} />
      <rect x="2" y="28" width="28" height="2" fill={D} />
      <rect x="28" y="2" width="2" height="28" fill={D} />
      <rect x="15" y="6" width="2" height="20" fill={K} />
      <rect x="6" y="15" width="20" height="2" fill={K} />
      <rect x="9" y="9" width="2" height="2" fill={K} />
      <rect x="21" y="9" width="2" height="2" fill={K} />
      <rect x="9" y="21" width="2" height="2" fill={K} />
      <rect x="21" y="21" width="2" height="2" fill={K} />
      <circle cx="16" cy="16" r="7" fill={K} />
      <rect x="12" y="12" width="3" height="3" fill={W} />
    </>
  ),
  // Paint palette
  color: (
    <>
      <path d="M16 3C8 3 3 8 3 15c0 7 5 13 12 13 3 0 4-2 3-4-1-2 0-4 3-4h3c4 0 6-2 6-6 0-6-6-11-14-11z" fill="#8b5a2b" />
      <path d="M16 5C9 5 5 9 5 15c0 6 4 11 10 11 2 0 2-1 1-2-2-3 0-6 4-6h4c3 0 4-1 4-4 0-5-5-9-12-9z" fill="#deb887" />
      <circle cx="10" cy="13" r="2.5" fill="#c0392b" />
      <circle cx="15" cy="9" r="2.5" fill="#ffd700" />
      <circle cx="21" cy="10" r="2.5" fill="#2e8b57" />
      <circle cx="10" cy="20" r="2.5" fill="#1f4fbf" />
      <circle cx="23" cy="15" r="2" fill="#008080" />
    </>
  ),
  // Pixel alien on a dark screen
  invaders: (
    <>
      <rect x="2" y="4" width="28" height="22" fill={K} />
      <rect x="3" y="5" width="26" height="20" fill="#0b1a10" />
      <g fill="#39ff14">
        <rect x="10" y="8" width="2" height="2" />
        <rect x="20" y="8" width="2" height="2" />
        <rect x="12" y="10" width="8" height="2" />
        <rect x="10" y="12" width="12" height="2" />
        <rect x="8" y="14" width="16" height="2" />
        <rect x="8" y="16" width="2" height="2" />
        <rect x="12" y="16" width="8" height="2" />
        <rect x="22" y="16" width="2" height="2" />
        <rect x="10" y="18" width="2" height="2" />
        <rect x="20" y="18" width="2" height="2" />
      </g>
      <rect x="11" y="12" width="2" height="2" fill="#0b1a10" />
      <rect x="19" y="12" width="2" height="2" fill="#0b1a10" />
      <rect x="10" y="26" width="12" height="2" fill={D} />
      <rect x="7" y="28" width="18" height="2" fill={G} />
    </>
  ),
  // Small monitor for the Start button
  start: (
    <>
      <rect x="3" y="4" width="26" height="19" fill={K} />
      <rect x="5" y="6" width="22" height="15" fill="#008080" />
      <rect x="7" y="8" width="8" height="5" fill="#1084d0" />
      <rect x="17" y="8" width="8" height="5" fill="#ffd700" />
      <rect x="7" y="14" width="8" height="5" fill="#2e8b57" />
      <rect x="17" y="14" width="8" height="5" fill="#c0392b" />
      <rect x="13" y="23" width="6" height="3" fill={D} />
      <rect x="8" y="26" width="16" height="3" fill={G} />
      <rect x="8" y="28" width="16" height="1" fill={D} />
    </>
  ),
  // Door with an arrow (log off)
  logoff: (
    <>
      <rect x="6" y="3" width="16" height="26" fill="#5c3a1a" />
      <rect x="8" y="5" width="12" height="24" fill="#8b5a2b" />
      <rect x="17" y="16" width="2" height="2" fill="#ffd700" />
      <rect x="18" y="14" width="10" height="4" fill="#2e8b57" />
      <polygon points="26,10 32,16 26,22" fill="#2e8b57" />
    </>
  ),
};

export default function Icon({ id, size = 32 }: { id: IconId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      {glyphs[id]}
    </svg>
  );
}
