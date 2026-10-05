import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AUDIT_ACTION_LABELS } from './activity-format';

describe('libellés du journal d’activité', () => {
  it('nomme chaque action d’audit déclarée par le backend (sinon le citoyen voit un code brut)', () => {
    const schema = readFileSync(resolve(__dirname, '../../../../packages/backend/convex/schema.ts'), 'utf8');
    const block = schema.slice(schema.indexOf('export const AUDIT_ACTIONS = ['), schema.indexOf('] as const', schema.indexOf('export const AUDIT_ACTIONS = [')));
    const actions = [...block.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]!);
    expect(actions.length).toBeGreaterThan(20);
    expect(actions.filter((a) => !AUDIT_ACTION_LABELS[a])).toEqual([]);
  });
});
