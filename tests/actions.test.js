import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('actions', () => {
  describe('runStep', () => {
    it('throws on unknown action', async () => {
      const { runStep } = await import('../src/actions.js');
      const page = { locator: () => ({ first: () => ({}) }) };
      const step = { action: 'unknown' };
      const ctx = { baseUrl: '' };

      await expect(runStep(page, step, ctx)).rejects.toThrow('Unknown action: unknown');
    });
  });
});