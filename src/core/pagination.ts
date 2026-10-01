import type { CursorPage } from './types.js';

/**
 * Walks a cursor-paginated list one page at a time, yielding every item.
 * Stops when a page comes back with `nextCursor: null`.
 */
export async function* iterateCursorPages<T>(
  fetchPage: (cursor: string | undefined) => PromiseLike<CursorPage<T>>,
  startCursor?: string,
): AsyncGenerator<T, void, undefined> {
  let cursor = startCursor;
  for (;;) {
    const page = await fetchPage(cursor);
    yield* page.data;
    if (!page.nextCursor) return;
    cursor = page.nextCursor;
  }
}
