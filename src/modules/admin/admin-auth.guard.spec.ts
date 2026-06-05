import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminAuthGuard } from './admin-auth.guard';

function ctxWithHeader(token?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { 'x-admin-token': token } }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminAuthGuard', () => {
  function guardWith(adminToken?: string) {
    const config = {
      get: jest.fn().mockReturnValue(adminToken),
    } as unknown as ConfigService;
    return new AdminAuthGuard(config);
  }

  it('denies when ADMIN_TOKEN is not configured', () => {
    expect(() => guardWith(undefined).canActivate(ctxWithHeader('x'))).toThrow(
      UnauthorizedException,
    );
  });

  it('denies on wrong token', () => {
    expect(() =>
      guardWith('secret').canActivate(ctxWithHeader('nope')),
    ).toThrow(UnauthorizedException);
  });

  it('allows on matching token', () => {
    expect(guardWith('secret').canActivate(ctxWithHeader('secret'))).toBe(true);
  });
});
