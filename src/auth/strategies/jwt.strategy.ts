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
    sub: number;
    email?: string;
    role?: string;
    fullName?: string | null;
  }) {
    try {
      const user = await this.authService.validateUser(payload.sub);
      return {
        ...user,
        userId: user.id,
        role: payload.role || user.role || 'user',
        fullName: payload.fullName || user.fullName,
      };
    } catch (error) {
      console.error('Error validating user:', error);
      if (error instanceof Error) {
        throw new UnauthorizedException(
          error instanceof Error ? error.message : 'Invalid token',
        );
      }
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Invalid token',
      );
    }
  }
}
