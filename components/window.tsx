'use client';

import React, { useRef } from 'react';
import styles from '@/styles/window.module.css';

export interface WinState {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  open: boolean;
  max: boolean;
}

interface Props {
  title: string;
  state: WinState;
  active: boolean;
  desktop: { w: number; h: number };
  minW?: number;
  minH?: number;
  onChange: (patch: Partial<WinState>) => void;
  onFocus: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Window({ title, state, active, desktop, minW = 200, minH = 120, onChange, onFocus, onClose, children }: Props) {
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const size = useRef<{ px: number; py: number; w: number; h: number } | null>(null);

  if (!state.open) return null;

  const onTitleDown = (e: React.PointerEvent) => {
    onFocus();
    if (state.max || (e.target as HTMLElement).closest('button')) return;
    drag.current = { px: e.clientX, py: e.clientY, x: state.x, y: state.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onTitleMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    // keep the title bar reachable inside the desktop
    const x = Math.min(Math.max(d.x + e.clientX - d.px, 60 - state.w), desktop.w - 60);
    const y = Math.min(Math.max(d.y + e.clientY - d.py, 0), desktop.h - 24);
    onChange({ x, y });
  };
  const endDrag = () => { drag.current = null; };

  const onResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onFocus();
    size.current = { px: e.clientX, py: e.clientY, w: state.w, h: state.h };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent) => {
    const s = size.current;
    if (!s) return;
    onChange({
      w: Math.min(Math.max(s.w + e.clientX - s.px, minW), Math.max(minW, desktop.w - state.x)),
      h: Math.min(Math.max(s.h + e.clientY - s.py, minH), Math.max(minH, desktop.h - state.y)),
    });
  };
  const endResize = () => { size.current = null; };

  return (
    <div
      className={`${styles.win} ${state.max ? styles.maximized : ''} ${active ? '' : styles.inactive}`}
      style={{ left: state.x, top: state.y, width: state.w, height: state.h, zIndex: state.z }}
      onPointerDown={onFocus}
    >
      <div
        className={styles.title}
        onPointerDown={onTitleDown}
        onPointerMove={onTitleMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => onChange({ max: !state.max })}
      >
        <span className={styles.titleText}>{title}</span>
        <div className={styles.buttons}>
          <button className={styles.btn} onClick={onClose} aria-label="Minimize">_</button>
          <button className={styles.btn} onClick={() => onChange({ max: !state.max })} aria-label="Maximize">{state.max ? '❐' : '□'}</button>
          <button className={styles.btn} onClick={onClose} aria-label="Close">✕</button>
        </div>
      </div>
      <div className={styles.body}>{children}</div>
      {!state.max && (
        <div className={styles.resize} onPointerDown={onResizeDown} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} />
      )}
    </div>
  );
}
