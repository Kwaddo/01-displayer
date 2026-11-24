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
  min: boolean;
  max: boolean;
}

interface Props {
  title: string;
  icon?: React.ReactNode;
  state: WinState;
  active: boolean;
  desktop: { w: number; h: number };
  minW?: number;
  minH?: number;
  onChange: (patch: Partial<WinState>) => void;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

type Dir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const DIRS: Dir[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

export default function Window({ title, icon, state, active, desktop, minW = 200, minH = 120, onChange, onFocus, onMinimize, onClose, children }: Props) {
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const size = useRef<{ dir: Dir; px: number; py: number; x: number; y: number; w: number; h: number } | null>(null);

  if (!state.open) return null;

  // never ask for more room than the desktop has
  const mw = Math.min(minW, desktop.w);
  const mh = Math.min(minH, desktop.h);

  const onTitleDown = (e: React.PointerEvent) => {
    onFocus();
    if (state.max || (e.target as HTMLElement).closest('button')) return;
    drag.current = { px: e.clientX, py: e.clientY, x: state.x, y: state.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onTitleMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    // keep the title bar reachable inside the desktop (never under the taskbar)
    const x = Math.min(Math.max(d.x + e.clientX - d.px, 60 - state.w), desktop.w - 60);
    const y = Math.min(Math.max(d.y + e.clientY - d.py, 0), desktop.h - 24);
    onChange({ x, y });
  };
  const endDrag = () => { drag.current = null; };

  const onResizeDown = (dir: Dir) => (e: React.PointerEvent) => {
    e.stopPropagation();
    onFocus();
    size.current = { dir, px: e.clientX, py: e.clientY, x: state.x, y: state.y, w: state.w, h: state.h };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent) => {
    const s = size.current;
    if (!s) return;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    const patch: Partial<WinState> = {};
    if (s.dir.includes('e')) {
      patch.w = Math.min(Math.max(s.w + dx, mw), Math.max(mw, desktop.w - s.x));
    }
    if (s.dir.includes('s')) {
      patch.h = Math.min(Math.max(s.h + dy, mh), Math.max(mh, desktop.h - s.y));
    }
    if (s.dir.includes('w')) {
      const right = s.x + s.w;
      const x = Math.min(Math.max(s.x + dx, 0), right - mw);
      patch.x = x;
      patch.w = right - x;
    }
    if (s.dir.includes('n')) {
      const bottom = s.y + s.h;
      const y = Math.min(Math.max(s.y + dy, 0), bottom - mh);
      patch.y = y;
      patch.h = bottom - y;
    }
    onChange(patch);
  };
  const endResize = () => { size.current = null; };

  const cls = [styles.win, state.max ? styles.maximized : '', active ? '' : styles.inactive, state.min ? styles.minimized : ''].join(' ');

  return (
    <div
      className={cls}
      style={{ left: state.x, top: state.y, width: Math.max(state.w, mw), height: Math.max(state.h, mh), minWidth: mw, minHeight: mh, zIndex: state.z }}
      onPointerDown={onFocus}
      role="dialog"
      aria-label={title}
    >
      <div
        className={styles.title}
        onPointerDown={onTitleDown}
        onPointerMove={onTitleMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => onChange({ max: !state.max })}
      >
        <span className={styles.titleLeft}>
          {icon && <span className={styles.titleIcon}>{icon}</span>}
          <span className={styles.titleText}>{title}</span>
        </span>
        <div className={styles.buttons}>
          <button className={styles.btn} onClick={onMinimize} aria-label="Minimize">
            <svg width="8" height="7" viewBox="0 0 8 7" shapeRendering="crispEdges"><rect x="1" y="5" width="6" height="2" /></svg>
          </button>
          <button className={styles.btn} onClick={() => onChange({ max: !state.max })} aria-label={state.max ? 'Restore' : 'Maximize'}>
            {state.max ? (
              <svg width="9" height="9" viewBox="0 0 9 9" shapeRendering="crispEdges">
                <path d="M3 0h6v6h-2v-1h1v-3h-4v1h-1z" />
                <path d="M0 3h6v6h-6z M1 5h4v3h-4z" fillRule="evenodd" />
              </svg>
            ) : (
              <svg width="9" height="9" viewBox="0 0 9 9" shapeRendering="crispEdges">
                <path d="M0 0h9v9h-9z M1 2h7v6h-7z" fillRule="evenodd" />
              </svg>
            )}
          </button>
          <button className={`${styles.btn} ${styles.closeBtn}`} onClick={onClose} aria-label="Close">
            <svg width="8" height="7" viewBox="0 0 8 7" shapeRendering="crispEdges">
              {[[0, 6], [1, 5], [2, 4], [3, 3], [2, 4], [1, 5], [0, 6]].map(([a, b], y) => (
                <React.Fragment key={y}>
                  <rect x={a} y={y} width="2" height="1" />
                  {b !== a && <rect x={b} y={y} width="2" height="1" />}
                </React.Fragment>
              ))}
            </svg>
          </button>
        </div>
      </div>
      <div className={styles.body}>{children}</div>
      {!state.max && DIRS.map((dir) => (
        <div
          key={dir}
          className={`${styles.edge} ${styles['edge_' + dir]}`}
          onPointerDown={onResizeDown(dir)}
          onPointerMove={onResizeMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        />
      ))}
      {!state.max && <div className={styles.grip} aria-hidden="true" />}
    </div>
  );
}
