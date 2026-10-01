import { describe, expect, it } from 'vitest';
import { jsonResponse, makeClient, stubFetch } from './helpers.js';

const session = (n: number) => ({
  session_id: `s_${n}`,
  external_user_id: 'user_42',
  preset_id: 'preset_1',
  status: 'Approved',
  kind: 'kyc',
  created_at: '2026-09-18T10:51:32.000Z',
  updated_at: '2026-09-18T10:55:53.000Z',
});

const subscription = (id: string) => ({
  entity_kind: 'user',
  external_user_id: id,
  status: 'active',
  enabled_at: '2026-09-25T09:00:00.000Z',
  next_renewal_at: '2027-09-25T09:00:00.000Z',
  cancelled_at: null,
  created_at: '2026-09-25T09:00:00.000Z',
  updated_at: '2026-09-25T09:00:00.000Z',
});

describe('cursor pagination', () => {
  it('list() maps next_cursor to nextCursor', async () => {
    stubFetch(jsonResponse({ sessions: [session(1)], next_cursor: 'cur_2' }));
    const page = await makeClient().compliance.sessions.list({ limit: 1 });
    expect(page).toEqual({ data: [session(1)], nextCursor: 'cur_2' });
  });

  it('sessions.iterate() follows next_cursor across pages, keeping filters', async () => {
    const { requests } = stubFetch(
      jsonResponse({ sessions: [session(1), session(2)], next_cursor: 'cur_2' }),
      jsonResponse({ sessions: [session(3)], next_cursor: 'cur_3' }),
      jsonResponse({ sessions: [], next_cursor: null }),
    );
    const ids: string[] = [];
    for await (const s of makeClient().compliance.sessions.iterate({ status: 'Approved', limit: 2 })) ids.push(s.session_id);

    expect(ids).toEqual(['s_1', 's_2', 's_3']);
    expect(requests.map((r) => Object.fromEntries(r.url.searchParams))).toEqual([
      { status: 'Approved', limit: '2' },
      { status: 'Approved', limit: '2', cursor: 'cur_2' },
      { status: 'Approved', limit: '2', cursor: 'cur_3' },
    ]);
  });

  it('sessions.iterate() can resume from a cursor', async () => {
    const { requests } = stubFetch(jsonResponse({ sessions: [session(9)], next_cursor: null }));
    const items = [];
    for await (const s of makeClient().compliance.sessions.iterate({ cursor: 'resume_here' })) items.push(s);
    expect(items).toHaveLength(1);
    expect(requests[0]!.url.searchParams.get('cursor')).toBe('resume_here');
  });

  it('monitoring.iterate() walks every subscription and stops on a null cursor', async () => {
    const { requests } = stubFetch(
      jsonResponse({ subscriptions: [subscription('a')], next_cursor: 'c2' }),
      jsonResponse({ subscriptions: [subscription('b')], next_cursor: null }),
    );
    const ids: string[] = [];
    for await (const s of makeClient().compliance.monitoring.iterate({ status: 'active' })) ids.push(s.external_user_id);
    expect(ids).toEqual(['a', 'b']);
    expect(requests).toHaveLength(2);
    expect(requests[1]!.url.searchParams.get('cursor')).toBe('c2');
    expect(requests[1]!.url.searchParams.get('status')).toBe('active');
  });

  it('iteration is lazy: breaking early stops fetching', async () => {
    const { requests } = stubFetch(
      jsonResponse({ sessions: [session(1), session(2)], next_cursor: 'cur_2' }),
      jsonResponse({ sessions: [session(3)], next_cursor: null }),
    );
    for await (const s of makeClient().compliance.sessions.iterate()) {
      if (s.session_id === 's_1') break;
    }
    expect(requests).toHaveLength(1);
  });

  it('propagates API errors from a later page', async () => {
    stubFetch(
      jsonResponse({ subscriptions: [subscription('a')], next_cursor: 'bad' }),
      jsonResponse({ error: { code: 'invalid_request', message: 'bad cursor', requestId: 'r' } }, 400),
    );
    const seen: string[] = [];
    await expect(
      (async () => {
        for await (const s of makeClient().compliance.monitoring.iterate()) seen.push(s.external_user_id);
      })(),
    ).rejects.toMatchObject({ status: 400, code: 'invalid_request' });
    expect(seen).toEqual(['a']);
  });
});
