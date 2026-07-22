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

  describe('wait', () => {
    it('maps NETWORK_IDLE to Playwright networkidle', async () => {
      const { runStep } = await import('../src/actions.js');
      const waitForLoadState = vi.fn();
      const page = { waitForLoadState };

      await runStep(page, { action: 'wait', for: 'NETWORK_IDLE' }, { baseUrl: '' });

      expect(waitForLoadState).toHaveBeenCalledWith('networkidle', { timeout: 30000 });
    });

    it('maps LOAD and DOMCONTENTLOADED to Playwright load states', async () => {
      const { runStep } = await import('../src/actions.js');
      const waitForLoadState = vi.fn();
      const page = { waitForLoadState };

      await runStep(page, { action: 'wait', for: 'LOAD' }, { baseUrl: '' });
      await runStep(page, { action: 'wait', for: 'DOMCONTENTLOADED', timeout: 5000 }, { baseUrl: '' });

      expect(waitForLoadState).toHaveBeenNthCalledWith(1, 'load', { timeout: 30000 });
      expect(waitForLoadState).toHaveBeenNthCalledWith(2, 'domcontentloaded', { timeout: 5000 });
    });

    it('waits a number of milliseconds', async () => {
      const { runStep } = await import('../src/actions.js');
      const waitForTimeout = vi.fn();
      const page = { waitForTimeout };

      await runStep(page, { action: 'wait', for: 250 }, { baseUrl: '' });

      expect(waitForTimeout).toHaveBeenCalledWith(250);
    });
  });

  describe('geolocate', () => {
    function mockPage() {
      const grantPermissions = vi.fn();
      const setGeolocation = vi.fn();
      return {
        page: { context: () => ({ grantPermissions, setGeolocation }) },
        grantPermissions,
        setGeolocation,
      };
    }

    it('grants permission and sets coordinates', async () => {
      const { runStep } = await import('../src/actions.js');
      const { page, grantPermissions, setGeolocation } = mockPage();

      await runStep(
        page,
        { action: 'geolocate', latitude: 37.7749, longitude: -122.4194 },
        { baseUrl: 'https://example.com' }
      );

      expect(grantPermissions).toHaveBeenCalledWith(['geolocation'], { origin: 'https://example.com' });
      expect(setGeolocation).toHaveBeenCalledWith({ latitude: 37.7749, longitude: -122.4194 });
    });

    it('includes accuracy when provided', async () => {
      const { runStep } = await import('../src/actions.js');
      const { page, setGeolocation } = mockPage();

      await runStep(
        page,
        { action: 'geolocate', latitude: 40.7128, longitude: -74.006, accuracy: 100 },
        { baseUrl: '' }
      );

      expect(setGeolocation).toHaveBeenCalledWith({ latitude: 40.7128, longitude: -74.006, accuracy: 100 });
    });

    it('clears geolocation when clear is true', async () => {
      const { runStep } = await import('../src/actions.js');
      const { page, grantPermissions, setGeolocation } = mockPage();

      await runStep(page, { action: 'geolocate', clear: true }, { baseUrl: '' });

      expect(grantPermissions).toHaveBeenCalledWith(['geolocation'], undefined);
      expect(setGeolocation).toHaveBeenCalledWith(null);
    });

    it('skips grant when grant is false', async () => {
      const { runStep } = await import('../src/actions.js');
      const { page, grantPermissions, setGeolocation } = mockPage();

      await runStep(
        page,
        { action: 'geolocate', latitude: 51.5074, longitude: -0.1278, grant: false },
        { baseUrl: '' }
      );

      expect(grantPermissions).not.toHaveBeenCalled();
      expect(setGeolocation).toHaveBeenCalledWith({ latitude: 51.5074, longitude: -0.1278 });
    });

    it('throws when latitude and longitude are missing', async () => {
      const { runStep } = await import('../src/actions.js');
      const { page } = mockPage();

      await expect(runStep(page, { action: 'geolocate' }, { baseUrl: '' })).rejects.toThrow(
        "geolocate: 'latitude' and 'longitude' are required"
      );
    });
  });
});