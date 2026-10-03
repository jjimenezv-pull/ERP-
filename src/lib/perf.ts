// TEMPORAL: mediciones para diagnosticar latencia en producción (se borra tras el diagnóstico).
export async function timed<T>(label: string, fn: () => PromiseLike<T>): Promise<T> {
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    console.log(`[perf] ${label} ${Math.round(performance.now() - t0)}ms`);
  }
}
