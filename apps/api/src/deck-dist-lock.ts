const tails = new Map<string, Promise<void>>();

/**
 * One writer of `dist/` and `.filmstrip-thumbs/` per deck.
 * An insert remaps filmstrip files after the build. A parallel static-player
 * rebuild used to restore the pre-insert backup on top of that remap, so two
 * slots showed the same shot.
 */
export function withDeckDistLock<T>(deckId: string, run: () => Promise<T>): Promise<T> {
  const prev = tails.get(deckId) ?? Promise.resolve();
  const gated = prev.then(
    () => run(),
    () => run(),
  );
  const tail = gated.then(
    () => {},
    () => {},
  );
  tails.set(deckId, tail);
  void tail.finally(() => {
    if (tails.get(deckId) === tail) tails.delete(deckId);
  });
  return gated;
}
