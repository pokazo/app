export type DebouncedSaver<T> = {
  schedule: (value: T) => void;
  flush: () => Promise<void>;
  cancel: () => void;
};

export function createDebouncedSaver<T>(
  save: (value: T) => Promise<void>,
  delayMs = 500,
): DebouncedSaver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | undefined;
  let chain: Promise<void> = Promise.resolve();

  function cancel() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function schedule(value: T) {
    pending = value;
    cancel();
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, delayMs);
  }

  async function flush() {
    cancel();
    if (pending === undefined) return;
    const value = pending;
    pending = undefined;
    chain = chain.then(() => save(value));
    await chain;
  }

  return { schedule, flush, cancel };
}
