"use client";

import { useEffect, useEffectEvent, useState } from "react";

/**
 * Run an async loader whenever `key` changes.
 * `data` is only returned when it belongs to the current key; `last` keeps
 * the previous result so UIs can avoid flashing empty while reloading.
 */
export function useAsync<T>(key: string, load: () => Promise<T>) {
  const [res, setRes] = useState<{ key: string; data: T } | null>(null);
  const run = useEffectEvent(load);

  useEffect(() => {
    let cancelled = false;
    run().then((data) => {
      if (!cancelled) setRes({ key, data });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const fresh = res?.key === key;
  return { data: fresh ? res.data : undefined, last: res?.data, loading: !fresh };
}
