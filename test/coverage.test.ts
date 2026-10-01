import { describe, expect, it } from 'vitest';
import { blockchainCases } from './cases/blockchain.js';
import { cardCases } from './cases/card.js';
import { complianceCases } from './cases/compliance.js';
import { MANIFEST, makeClient } from './helpers.js';

const ALL_CASES = [...blockchainCases, ...cardCases, ...complianceCases];

/** Auto-paging helpers, exercised in pagination.test.ts rather than as endpoint cases. */
const ITERATOR_METHODS = ['compliance.sessions.iterate', 'compliance.monitoring.iterate'];

/** Every public method on every resource namespace, as `domain.resource.method`. */
function publicSdkMethods(): string[] {
  const client = makeClient();
  const names: string[] = [];
  for (const domain of ['blockchain', 'card', 'compliance'] as const) {
    for (const [resourceName, resource] of Object.entries(client[domain])) {
      for (const method of Object.getOwnPropertyNames(Object.getPrototypeOf(resource))) {
        if (method === 'constructor' || method.startsWith('_')) continue;
        names.push(`${domain}.${resourceName}.${method}`);
      }
    }
  }
  return names.sort();
}

describe('API surface coverage', () => {
  it('the manifest lists every operation from the API reference (80)', () => {
    expect(MANIFEST).toHaveLength(80);
    expect(new Set(MANIFEST.map((e) => e.operationId)).size).toBe(80);
  });

  it('every API operation has at least one endpoint test case', () => {
    const covered = new Set(ALL_CASES.map((c) => c.operationId));
    const missing = MANIFEST.map((e) => e.operationId).filter((id) => !covered.has(id));
    expect(missing).toEqual([]);
  });

  it('every endpoint test case targets a real API operation', () => {
    const known = new Set(MANIFEST.map((e) => e.operationId));
    expect(ALL_CASES.filter((c) => !known.has(c.operationId)).map((c) => c.operationId)).toEqual([]);
  });

  it('every public SDK method is exercised by a test', () => {
    const tested = new Set([...ALL_CASES.map((c) => c.sdkMethod), ...ITERATOR_METHODS]);
    const untested = publicSdkMethods().filter((m) => !tested.has(m));
    expect(untested).toEqual([]);
  });

  it('every endpoint case names an SDK method that exists', () => {
    const existing = new Set(publicSdkMethods());
    expect(ALL_CASES.filter((c) => !existing.has(c.sdkMethod)).map((c) => c.sdkMethod)).toEqual([]);
  });

  it('maps each API operation to exactly one SDK method', () => {
    const byOperation = new Map<string, Set<string>>();
    for (const c of ALL_CASES) {
      const set = byOperation.get(c.operationId) ?? new Set<string>();
      set.add(c.sdkMethod);
      byOperation.set(c.operationId, set);
    }
    const ambiguous = [...byOperation].filter(([, methods]) => methods.size !== 1).map(([id]) => id);
    expect(ambiguous).toEqual([]);
    // ...and there are exactly as many endpoint methods as operations.
    const endpointMethods = publicSdkMethods().filter((m) => !ITERATOR_METHODS.includes(m));
    expect(endpointMethods).toHaveLength(80);
  });
});
