/* ============================================================
   useIncrementalList.ts — daftar panjang dimuat bertahap saat
   di-scroll, bukan sekaligus. Sentinel di ujung daftar dipantau
   IntersectionObserver; begitu kelihatan, batch berikutnya
   ditambahkan.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react';

interface IncrementalListOptions {
  /** Jeda singkat agar state loading terlihat sebelum batch baru dirender. */
  delayMs?: number;
  /** Kunci tambahan untuk mengulang daftar, misalnya ketika tab/filter berubah. */
  resetKey?: unknown;
  rootMargin?: string;
}

export function useIncrementalList(
  total: number,
  step = 10,
  { delayMs = 0, resetKey, rootMargin = '120px' }: IncrementalListOptions = {}
) {
  const [visible, setVisible] = useState(step);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // Daftar berganti (filter/tab/data baru) → mulai lagi dari batch pertama.
  useEffect(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    loadingRef.current = false;
    setLoading(false);
    setVisible(step);
  }, [total, step, resetKey]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const hasMore = visible < total;

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const revealNextBatch = () => {
      setVisible((current) => Math.min(current + step, total));
      setLoading(false);
      loadingRef.current = false;
      timerRef.current = null;
    };

    if (delayMs > 0) {
      timerRef.current = window.setTimeout(revealNextBatch, delayMs);
    } else {
      revealNextBatch();
    }
  }, [delayMs, step, total]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    }, { rootMargin });
    observer.observe(node);
    return () => observer.disconnect();
  // `visible` sengaja menjadi dependency: setelah satu batch ditambahkan,
  // observer perlu di-arm ulang bila sentinel masih berada di viewport.
  }, [hasMore, loadMore, rootMargin, visible]);

  return { visible, hasMore, loading, sentinel };
}
