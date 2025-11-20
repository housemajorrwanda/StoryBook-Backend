import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as GoogleOAuthStrategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(
  GoogleOAuthStrategy,
  'google',
) {
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

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
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

    const validatedUser = await this.authService.validateGoogleUser(user);
    return validatedUser;
  }
}
