import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Защита админских эндпоинтов токеном из ADMIN_TOKEN.
 * Если токен не задан в окружении — админка считается отключённой (401).
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('ADMIN_TOKEN');
    if (!expected) {
      throw new UnauthorizedException(
        'Admin panel is disabled (no ADMIN_TOKEN)',
      );
    }

    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const provided = req.headers['x-admin-token'];
    if (provided !== expected) {
      throw new UnauthorizedException('Invalid admin token');
    }
    return true;
  }
}
