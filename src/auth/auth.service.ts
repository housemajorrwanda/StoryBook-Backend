import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.userService.create(registerDto);
    const { password, ...userWithoutPassword } = user;
    
    const payload = { username: user.username, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: userWithoutPassword,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userService.findByUsername(loginDto.username);
    
    if (!user || !user.password || !await this.userService.validatePassword(loginDto.password, user.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password, ...userWithoutPassword } = user;
    const payload = { username: user.username, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: userWithoutPassword,
    };
  }

  async validateUser(userId: number) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;
    
    // Find user by email
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save reset token to user
    await this.userService.updateResetToken(user.id, resetToken, resetTokenExpiry);

    // Send reset email
    try {
      await this.emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      // Log error but don't expose it to user
      console.error('Failed to send reset email:', error);
    }

    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Find user by reset token
    const user = await this.userService.findByResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token is expired
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Update password and clear reset token
    await this.userService.updatePassword(user.id, newPassword);
    await this.userService.clearResetToken(user.id);

    return { message: 'Password has been successfully reset' };
  }

  async validateGoogleUser(googleUser: any): Promise<any> {
    try {
      // Validate required Google user data
      if (!googleUser?.email || !googleUser?.googleId) {
        console.error('Invalid Google user data:', { hasEmail: !!googleUser?.email, hasGoogleId: !!googleUser?.googleId });
        throw new BadRequestException('Invalid Google user data received');
      }

      // Check if user already exists with this Google ID
      let user = await this.userService.findByGoogleId(googleUser.googleId);
      
      if (user) {
        // User exists with Google ID - return auth response
        return this.generateAuthResponse(user);
      }

      // Check if user exists with this email (linking accounts)
      user = await this.userService.findByEmail(googleUser.email);
      
      if (user) {
        // Link Google account to existing user
        try {
          await this.userService.linkGoogleAccount(user.id, googleUser.googleId, googleUser.avatar);
          // Fetch updated user
          user = await this.userService.findById(user.id);
          return this.generateAuthResponse(user);
        } catch (linkError: any) {
          console.error('Error linking Google account:', linkError);
          if (linkError.status === 409) {
            throw linkError; // Re-throw ConflictException
          }
          throw new UnauthorizedException('Failed to link Google account');
        }
      }

      // Create new user with Google account
      try {
        const newUser = await this.userService.createGoogleUser({
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          googleId: googleUser.googleId,
          avatar: googleUser.avatar,
          provider: 'google',
          username: this.generateUsernameFromEmail(googleUser.email),
        });

        return this.generateAuthResponse(newUser);
      } catch (createError: any) {
        console.error('Error creating Google user:', createError);
        if (createError.status === 409) {
          throw createError; // Re-throw ConflictException
        }
        throw new UnauthorizedException('Failed to create user from Google account');
      }
    } catch (error: any) {
      // Log the full error for debugging
      console.error('Google OAuth validation error:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      
      // Re-throw known HTTP exceptions
      if (error.status) {
        throw error;
      }
      
      // Throw generic unauthorized for unknown errors
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  private generateAuthResponse(user: any): AuthResponseDto {
    const { password, resetToken, resetTokenExpiry, ...userWithoutSensitiveData } = user;
    const payload = { username: user.username, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: userWithoutSensitiveData,
    };
  }

  private generateUsernameFromEmail(email: string): string {
    const baseUsername = email.split('@')[0];
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseUsername}_${randomSuffix}`;
  }
}
