import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

interface VerifyCallback {
  (error: any, user?: any, info?: any): void;
}

declare class Strategy {
  constructor(
    options: {
      clientID: string;
      clientSecret: string;
      callbackURL: string;
      scope: string[];
    },
    verify: (profile: any, done: VerifyCallback) => Promise<any>,
  );
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
    });
  }

  async validate(profile: any, done: VerifyCallback): Promise<any> {
    const { id, name, emails, photos } = profile as {
      id: string;
      name: { givenName: string; familyName: string };
      emails: { value: string }[];
      photos: { value: string }[];
    };

    const user: {
      googleId: string;
      email: string;
      fullName: string;
      avatar: string;
      provider: string;
    } = {
      googleId: id,
      email: emails[0].value || '',
      fullName:
        name.givenName && name.familyName
          ? `${name.givenName} ${name.familyName}`
          : name.givenName || name.familyName || '',
      avatar: photos[0].value,
      provider: 'google',
    };

    const validatedUser: unknown =
      await this.authService.validateGoogleUser(user);
    done(null, validatedUser);
  }
}
