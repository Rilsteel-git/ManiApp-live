/* ============================================================
   floating.ts — port dari positionPopover/positionFloatingMenu
   di js/ui.js. Popover tanggal & menu filter chip pakai
   position: fixed supaya tidak terpotong oleh kontainer yang
   di-scroll (modal, filter-chips overflow-x: auto).
   ============================================================ */

import { useLayoutEffect, type RefObject } from 'react';

const MARGIN = 12;
const GAP = 7;

export function computeFloatingPosition(
  anchor: DOMRect,
  boxWidth: number,
  boxHeight: number,
  align: 'left' | 'right'
): { left: number; top: number } {
  const maxLeft = Math.max(MARGIN, window.innerWidth - boxWidth - MARGIN);
  const rawLeft = align === 'right' ? anchor.right - boxWidth : anchor.left;
  const left = Math.min(Math.max(MARGIN, rawLeft), maxLeft);
  let top = anchor.bottom + GAP;
  if (top + boxHeight > window.innerHeight - MARGIN) {
    const above = anchor.top - GAP - boxHeight;
    top = above >= MARGIN ? above : Math.max(MARGIN, window.innerHeight - boxHeight - MARGIN);
  }
  return { left: Math.round(left), top: Math.round(top) };
}

/** Menempelkan popover ke posisi trigger dengan position: fixed selama `open`. */
export function useFloatingPopover(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  boxRef: RefObject<HTMLElement | null>,
  align: 'left' | 'right' = 'left'
) {
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const box = boxRef.current;
    if (!trigger || !box) return;

    function reposition() {
      if (!trigger || !box) return;
      box.style.position = 'fixed';
      box.style.top = '0px';
      box.style.left = '0px';
      const anchor = trigger.getBoundingClientRect();
      const rect = box.getBoundingClientRect();
      const pos = computeFloatingPosition(anchor, rect.width, rect.height, align);
      box.style.left = pos.left + 'px';
      box.style.top = pos.top + 'px';
    }

    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, triggerRef, boxRef, align]);
}
