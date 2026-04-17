export interface BulkItemResult {
  id: string;
  ok: boolean;
  error?: string;
}

export interface BulkProgress {
  total: number;
  done: number;
  succeeded: number;
  failed: number;
  results: BulkItemResult[];
}

export interface RunBulkOptions<T> {
  items: T[];
  idOf: (item: T) => string;
  run: (item: T) => Promise<void>;
  concurrency?: number;
  onProgress?: (progress: BulkProgress) => void;
}

export async function runBulk<T>({
  items,
  idOf,
  run,
  concurrency = 8,
  onProgress,
}: RunBulkOptions<T>): Promise<BulkProgress> {
  const progress: BulkProgress = {
    total: items.length,
    done: 0,
    succeeded: 0,
    failed: 0,
    results: [],
  };

  const queue = items.slice();
  const workers: Promise<void>[] = [];

  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      const id = idOf(item);
      try {
        await run(item);
        progress.results.push({ id, ok: true });
        progress.succeeded += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        progress.results.push({ id, ok: false, error: message });
        progress.failed += 1;
      } finally {
        progress.done += 1;
        onProgress?.({ ...progress, results: progress.results.slice() });
      }
    }
  };

  const n = Math.max(1, Math.min(concurrency, items.length));
  for (let i = 0; i < n; i++) workers.push(worker());
  await Promise.all(workers);
  return progress;
}
