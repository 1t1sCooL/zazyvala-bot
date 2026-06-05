import { canSummon, describePolicy, isCallPolicy } from './can-summon';

describe('canSummon', () => {
  it('allows everyone with policy "all"', () => {
    expect(canSummon('all', { isAdmin: false, isAssistant: false })).toBe(true);
  });

  it('policy "admins" allows only admins', () => {
    expect(canSummon('admins', { isAdmin: true, isAssistant: false })).toBe(
      true,
    );
    expect(canSummon('admins', { isAdmin: false, isAssistant: true })).toBe(
      false,
    );
  });

  it('policy "assistants" allows admins and assistants', () => {
    expect(canSummon('assistants', { isAdmin: false, isAssistant: true })).toBe(
      true,
    );
    expect(canSummon('assistants', { isAdmin: true, isAssistant: false })).toBe(
      true,
    );
    expect(
      canSummon('assistants', { isAdmin: false, isAssistant: false }),
    ).toBe(false);
  });

  it('unknown policy falls back to allow-all', () => {
    expect(canSummon('weird', { isAdmin: false, isAssistant: false })).toBe(
      true,
    );
  });
});

describe('isCallPolicy', () => {
  it('accepts known policies and rejects others', () => {
    expect(isCallPolicy('all')).toBe(true);
    expect(isCallPolicy('assistants')).toBe(true);
    expect(isCallPolicy('admins')).toBe(true);
    expect(isCallPolicy('nope')).toBe(false);
  });
});

describe('describePolicy', () => {
  it('returns human-readable text', () => {
    expect(describePolicy('admins')).toContain('администратор');
    expect(describePolicy('all')).toContain('все');
  });
});
