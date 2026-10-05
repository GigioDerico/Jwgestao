import { describe, expect, it } from 'vitest';
import { getPublicAppOriginForEnvironment } from './public-url';

describe('public app origin selection', () => {
  it('uses the configured public origin for a native development build', () => {
    expect(getPublicAppOriginForEnvironment({ configured: undefined, production: false, native: true, windowOrigin: 'capacitor://localhost' }))
      .toBe('https://jwgestao.vercel.app');
  });
  it('keeps local web development on its current origin', () => {
    expect(getPublicAppOriginForEnvironment({ configured: undefined, production: false, native: false, windowOrigin: 'http://localhost:5173' }))
      .toBe('http://localhost:5173');
  });
});
