// TEMPORAL: mediciones para diagnosticar latencia en producción (se borra tras el diagnóstico).
export async function timed<T>(label: string, fn: () => PromiseLike<T>): Promise<T> {
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    console.log(`[perf] ${label} ${Math.round(performance.now() - t0)}ms`);
  }
}

// TEMPORAL: registra cada llamada de red a Supabase (método, ruta sin query, status, ms).
export const timedFetch: typeof fetch = async (input, init) => {
  const t0 = performance.now();
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const res = await fetch(input, init);
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {}
  console.log(`[perf] fetch ${init?.method ?? "GET"} ${path} ${res.status} ${Math.round(performance.now() - t0)}ms`);
  return res;
};
