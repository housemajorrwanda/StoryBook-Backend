import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'your-super-secret-jwt-key-change-this-in-production',
    });
  }

  async validate(payload: {
    sub: number | string;
    email?: string;
    role?: string;
    fullName?: string | null;
  }) {
    try {
      const userId =
        typeof payload.sub === 'string'
          ? parseInt(payload.sub, 10)
          : payload.sub;

      if (!userId || isNaN(userId)) {
        throw new UnauthorizedException(
          `Invalid user ID in token: ${payload.sub}`,
        );
      }

      const user = await this.authService.validateUser(userId);
      return {
        ...user,
        userId: user.id,
        role: payload.role || user.role || 'user',
        fullName: payload.fullName || user.fullName,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Invalid token',
      );
    }
  }
}
