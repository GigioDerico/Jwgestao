import { describe, expect, it } from 'vitest';
import { getSafeReturnPath } from './auth-return-path';

const meeting = '/assignments/meetings/respond/123e4567-e89b-42d3-a456-426614174000?revision=123e4567-e89b-42d3-a456-426614174001';
describe('getSafeReturnPath', () => {
  it('preserves recognized assignment response routes and query', () => expect(getSafeReturnPath(meeting)).toBe(meeting));
  it.each(['//evil.test/path', 'https://evil.test', '/\\evil.test', '/%2f%2fevil.test', '/assignments/meetings/respond/%2f%2fevil?revision=x', 'javascript:alert(1)', null])('rejects unsafe return path %s', value => {
    expect(getSafeReturnPath(value)).toBe('/dashboard');
  });
  it('allows the RPC current-designation route using assignment and revision', () => expect(getSafeReturnPath('/assignments/meetings?assignment=123e4567-e89b-42d3-a456-426614174000&revision=123e4567-e89b-42d3-a456-426614174001')).toBe('/assignments/meetings?assignment=123e4567-e89b-42d3-a456-426614174000&revision=123e4567-e89b-42d3-a456-426614174001'));
  it('preserves personal recipient view only with a validated assignment and revision', () => {
    expect(getSafeReturnPath('/assignments/meetings?assignment=123e4567-e89b-42d3-a456-426614174000&revision=123e4567-e89b-42d3-a456-426614174001&view=personal')).toContain('view=personal');
    expect(getSafeReturnPath('/assignments/meetings?view=personal')).toBe('/dashboard');
  });
  it('retains backwards-compatible notificationId review paths', () => expect(getSafeReturnPath('/assignments/meetings?notificationId=123e4567-e89b-42d3-a456-426614174000&revision=123e4567-e89b-42d3-a456-426614174001')).toContain('assignment='));
  it('rejects conflicting or duplicate assignment identifiers', () => {
    expect(getSafeReturnPath('/assignments/meetings?assignment=123e4567-e89b-42d3-a456-426614174000&notificationId=123e4567-e89b-42d3-a456-426614174000&revision=123e4567-e89b-42d3-a456-426614174001')).toBe('/dashboard');
    expect(getSafeReturnPath('/assignments/meetings?assignment=123e4567-e89b-42d3-a456-426614174000&assignment=123e4567-e89b-42d3-a456-426614174002&revision=123e4567-e89b-42d3-a456-426614174001')).toBe('/dashboard');
  });
  it('rejects a response link without a valid revision', () => expect(getSafeReturnPath('/assignments/meetings/respond/123e4567-e89b-42d3-a456-426614174000')).toBe('/dashboard'));
});
