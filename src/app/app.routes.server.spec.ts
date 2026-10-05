import { RenderMode } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';

describe('server rendering routes', () => {
  it('renders live scan detail pages on the client without build-time scan IDs', () => {
    const scanRoute = serverRoutes.find(route => route.path === 'scan/:id');

    expect(scanRoute).toBeDefined();
    expect(scanRoute?.renderMode).toBe(RenderMode.Client);
  });

  it('matches the live scan route before the prerender fallback', () => {
    const scanIndex = serverRoutes.findIndex(route => route.path === 'scan/:id');
    const fallbackIndex = serverRoutes.findIndex(route => route.path === '**');

    expect(scanIndex).toBeGreaterThanOrEqual(0);
    expect(fallbackIndex).toBeGreaterThan(scanIndex);
  });

  it('preserves prerendering for the remaining static routes', () => {
    expect(serverRoutes.find(route => route.path === '**')?.renderMode)
      .toBe(RenderMode.Prerender);
  });
});
