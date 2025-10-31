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

  async validate(payload: any) {
    try {
      const user = await this.authService.validateUser(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        payload.sub as number,
      );
      return { ...user, userId: user.id, role: user.role || 'user' };
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
