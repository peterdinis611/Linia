"use client";

import { useEffect, useRef } from "react";

/** Abortable plan generation token — cancels in-flight /api/plan when a newer search starts. */
export function usePlanGeneration() {
  const planGen = useRef(0);
  const planAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      planAbort.current?.abort();
    };
  }, []);

  function begin() {
    planAbort.current?.abort();
    const controller = new AbortController();
    planAbort.current = controller;
    const gen = ++planGen.current;
    return {
      gen,
      signal: controller.signal,
      isCurrent: () => gen === planGen.current,
    };
  }

  function isCurrent(gen: number) {
    return gen === planGen.current;
  }

  return { begin, isCurrent, planGen };
}
