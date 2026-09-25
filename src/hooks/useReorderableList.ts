/* ============================================================
   useReorderableList.ts — port dari bindCategoryDrag() di
   personal-wallet/js/main.js. Mouse/pointer men-drag langsung;
   sentuhan butuh tahan sebentar dulu (supaya swipe biasa tetap
   bisa men-scroll halaman); panah atas/bawah pada baris atau
   handle yang fokus juga memindah posisi.
   ============================================================ */

import { useEffect, useRef, useState } from 'react';

interface DragState {
  id: string;
  pointerId: number;
  mode: 'pointer' | 'touch';
  startY: number;
  y: number;
  active: boolean;
  original: string[];
  hold: number | null;
  frame: number | null;
}

const HOLD_MS = 250;
const POINTER_THRESHOLD = 5;
const TOUCH_CANCEL_THRESHOLD = 8;
const EDGE_SCROLL_PX = 64;

export function useReorderableList(ids: string[], onReorder: (ids: string[]) => void) {
  const [order, setOrder] = useState<string[]>(ids);
  const orderRef = useRef(order);
  orderRef.current = order;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const suppressedClick = useRef<{ id: string; timeout: number } | null>(null);

  // Kalau lagi nge-drag, jangan biarkan sync dari props menimpa urutan
  // sementara yang sedang diseret user.
  useEffect(() => {
    if (!drag.current) setOrder(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join('\0')]);

  function rows(): HTMLElement[] {
    const box = containerRef.current;
    if (!box) return [];
    return Array.from(box.querySelectorAll<HTMLElement>('[data-drag-id]'));
  }

  function draggableRow(target: EventTarget | null): { id: string; el: HTMLElement } | null {
    if (!(target instanceof Element)) return null;
    const row = target.closest<HTMLElement>('[data-drag-id]');
    if (!row || row.parentElement !== containerRef.current) return null;
    const control = target.closest('button, a, input, select, textarea');
    if (control && !control.hasAttribute('data-drag-handle')) return null;
    const id = row.dataset.dragId;
    return id ? { id, el: row } : null;
  }

  function updatePosition() {
    const current = drag.current;
    if (!current || !current.active) return;
    const list = rows();
    const target = list.find((item) => {
      if (item.dataset.dragId === current.id) return false;
      const rect = item.getBoundingClientRect();
      return current.y >= rect.top && current.y <= rect.bottom;
    });
    if (!target) return;
    const targetId = target.dataset.dragId!;
    setOrder((prev) => {
      const from = prev.indexOf(current.id);
      const to = prev.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      const rect = target.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (from < to && current.y <= midpoint) return prev;
      if (from > to && current.y >= midpoint) return prev;
      const next = prev.slice();
      next.splice(from, 1);
      next.splice(to, 0, current.id);
      return next;
    });
  }

  function scrollWhileDragging() {
    const current = drag.current;
    if (!current) return;
    if (current.active) {
      if (current.y < EDGE_SCROLL_PX) window.scrollBy(0, -12);
      else if (current.y > window.innerHeight - EDGE_SCROLL_PX) window.scrollBy(0, 12);
      updatePosition();
    }
    current.frame = window.requestAnimationFrame(scrollWhileDragging);
  }

  function startDrag(id: string, y: number, pointerId: number, mode: DragState['mode']) {
    const state: DragState = {
      id, pointerId, mode, startY: y, y,
      active: false, original: orderRef.current.slice(),
      hold: null, frame: null
    };
    drag.current = state;
    state.frame = window.requestAnimationFrame(scrollWhileDragging);
  }

  function activate() {
    const current = drag.current;
    if (!current) return;
    current.active = true;
    setDraggingId(current.id);
  }

  function finishDrag(pointerId: number, cancelled: boolean) {
    const current = drag.current;
    if (!current || pointerId !== current.pointerId) return;
    if (current.hold !== null) window.clearTimeout(current.hold);
    if (current.frame !== null) window.cancelAnimationFrame(current.frame);
    drag.current = null;
    setDraggingId(null);
    if (!current.active) return;
    if (suppressedClick.current) window.clearTimeout(suppressedClick.current.timeout);
    suppressedClick.current = {
      id: current.id,
      timeout: window.setTimeout(() => { suppressedClick.current = null; }, 500)
    };
    const finalOrder = orderRef.current;
    if (!cancelled && finalOrder.join('\0') !== current.original.join('\0')) {
      onReorder(finalOrder);
    } else if (cancelled) {
      setOrder(current.original);
    }
  }

  useEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    const dragContainer: HTMLDivElement = box;

    function onPointerDown(event: PointerEvent) {
      if (drag.current || !event.isPrimary || event.pointerType === 'touch' || event.button !== 0) return;
      const row = draggableRow(event.target);
      if (!row) return;
      startDrag(row.id, event.clientY, event.pointerId, 'pointer');
    }
    function onPointerMove(event: PointerEvent) {
      const current = drag.current;
      if (!current || current.mode !== 'pointer' || event.pointerId !== current.pointerId) return;
      current.y = event.clientY;
      if (!current.active && Math.abs(current.y - current.startY) >= POINTER_THRESHOLD) {
        activate();
        if (!dragContainer.hasPointerCapture(event.pointerId)) dragContainer.setPointerCapture(event.pointerId);
      }
      if (current.active) event.preventDefault();
      updatePosition();
    }
    function onPointerUp(event: PointerEvent) {
      if (drag.current?.mode === 'pointer') finishDrag(event.pointerId, false);
    }
    function onPointerCancel(event: PointerEvent) {
      if (drag.current?.mode === 'pointer') finishDrag(event.pointerId, true);
    }
    function onLostPointerCapture(event: PointerEvent) {
      if (drag.current?.mode === 'pointer') finishDrag(event.pointerId, true);
    }

    // Sentuh: tahan sebentar untuk mulai menyeret; geser langsung tetap men-scroll halaman.
    function onTouchStart(event: TouchEvent) {
      if (drag.current || event.touches.length !== 1) return;
      const row = draggableRow(event.target);
      if (!row) return;
      const touch = event.changedTouches[0];
      startDrag(row.id, touch.clientY, touch.identifier, 'touch');
      const current = drag.current!;
      current.hold = window.setTimeout(() => {
        if (drag.current?.pointerId !== touch.identifier) return;
        activate();
      }, HOLD_MS);
    }
    function onTouchMove(event: TouchEvent) {
      const current = drag.current;
      if (!current || current.mode !== 'touch') return;
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === current.pointerId);
      if (!touch) return;
      current.y = touch.clientY;
      if (!current.active && Math.abs(current.y - current.startY) > TOUCH_CANCEL_THRESHOLD) {
        finishDrag(touch.identifier, true);
        return;
      }
      if (current.active) {
        event.preventDefault();
        updatePosition();
      }
    }
    function endTouch(event: TouchEvent, cancelled: boolean) {
      const current = drag.current;
      if (!current || current.mode !== 'touch') return;
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === current.pointerId);
      if (touch) finishDrag(touch.identifier, cancelled);
    }
    function onTouchEnd(event: TouchEvent) { endTouch(event, false); }
    function onTouchCancel(event: TouchEvent) { endTouch(event, true); }

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const row = target.closest<HTMLElement>('[data-drag-id]');
      if (!row || row.parentElement !== box) return;
      if (target !== row && !target.hasAttribute('data-drag-handle')) return;
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      const id = row.dataset.dragId;
      if (!id) return;
      const current = orderRef.current;
      const from = current.indexOf(id);
      const to = from + (event.key === 'ArrowUp' ? -1 : 1);
      if (from === -1 || to < 0 || to >= current.length) return;
      const next = current.slice();
      next.splice(from, 1);
      next.splice(to, 0, id);
      setOrder(next);
      onReorder(next);
      requestAnimationFrame(() => {
        const movedRow = rows().find((item) => item.dataset.dragId === id);
        const focusTarget = movedRow?.querySelector<HTMLElement>('[data-drag-handle]') || movedRow;
        focusTarget?.focus({ preventScroll: true });
      });
    }
    function onClick(event: MouseEvent) {
      const pending = suppressedClick.current;
      if (!pending || !(event.target instanceof Element)) return;
      const row = event.target.closest<HTMLElement>('[data-drag-id]');
      if (row?.dataset.dragId !== pending.id && event.target !== box) return;
      event.preventDefault();
      event.stopPropagation();
      window.clearTimeout(pending.timeout);
      suppressedClick.current = null;
    }

    box.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    box.addEventListener('lostpointercapture', onLostPointerCapture);
    box.addEventListener('touchstart', onTouchStart, { passive: true });
    box.addEventListener('touchmove', onTouchMove, { passive: false });
    box.addEventListener('touchend', onTouchEnd);
    box.addEventListener('touchcancel', onTouchCancel);
    box.addEventListener('keydown', onKeyDown);
    box.addEventListener('click', onClick);
    return () => {
      box.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      box.removeEventListener('lostpointercapture', onLostPointerCapture);
      box.removeEventListener('touchstart', onTouchStart);
      box.removeEventListener('touchmove', onTouchMove);
      box.removeEventListener('touchend', onTouchEnd);
      box.removeEventListener('touchcancel', onTouchCancel);
      box.removeEventListener('keydown', onKeyDown);
      box.removeEventListener('click', onClick);
      if (suppressedClick.current) window.clearTimeout(suppressedClick.current.timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { order, containerRef, draggingId };
}
