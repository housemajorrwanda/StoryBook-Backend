import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import type { User } from '../user/user.types';
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
    const { ...userWithoutPassword } = user;

    const payload = {
      email: user.email,
      sub: user.id,
      fullName: user.fullName,
      role: user.role || 'user',
    };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: userWithoutPassword,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userService.findByEmail(loginDto.email);

    if (
      !user ||
      !user.password ||
      !(await this.userService.validatePassword(
        loginDto.password,
        user.password,
      ))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { ...userWithoutPassword } = user;
    const payload = {
      email: user.email,
      sub: user.id,
      fullName: user.fullName,
      role: user.role || 'user',
    };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: userWithoutPassword,
    };
  }

  async validateUser(userId: number) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException(`User not found for ID: ${userId}`);
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is not active');
    }
    const { ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return {
        message: 'If the email exists, a password reset link has been sent.',
      };
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Save reset token to user
    await this.userService.updateResetToken(
      user.id,
      resetToken,
      resetTokenExpiry,
    );

    // Send reset email
    try {
      await this.emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      console.error('Failed to send reset email:', error);
    }

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
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

  async validateGoogleUser(googleUser: {
    email?: string;
    googleId?: string;
    fullName?: string;
    avatar?: string;
  }): Promise<AuthResponseDto> {
    try {
      // Validate required Google user data
      if (!googleUser.email || !googleUser.googleId) {
        console.error('Invalid Google user data:', {
          hasEmail: !!googleUser.email,
          hasGoogleId: !!googleUser.googleId,
        });
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
          await this.userService.linkGoogleAccount(
            user.id,
            googleUser.googleId,
            googleUser.avatar,
          );
          // Fetch updated user
          user = await this.userService.findById(user.id);
          if (!user) {
            throw new UnauthorizedException(
              'User not found after linking Google account',
            );
          }
          return this.generateAuthResponse(user);
        } catch (linkError: unknown) {
          console.error('Error linking Google account:', linkError);
          if (
            linkError &&
            typeof linkError === 'object' &&
            'status' in linkError &&
            linkError.status === 409
          ) {
            throw linkError;
          }
          throw new UnauthorizedException('Failed to link Google account');
        }
      }

      // Create new user with Google account
      try {
        const newUser = await this.userService.createGoogleUser({
          email: googleUser.email,
          fullName: googleUser.fullName,
          googleId: googleUser.googleId,
          avatar: googleUser.avatar,
          provider: 'google',
        });

        return this.generateAuthResponse(newUser);
      } catch (createError: unknown) {
        console.error('Error creating Google user:', createError);
        if (
          createError &&
          typeof createError === 'object' &&
          'status' in createError &&
          createError.status === 409
        ) {
          throw createError;
        }
        throw new UnauthorizedException(
          'Failed to create user from Google account',
        );
      }
    } catch (error: unknown) {
      // Log the full error for debugging
      if (error instanceof Error) {
        console.error('Google OAuth validation error:', {
          message: error.message,
          name: error.name,
        });
      } else {
        console.error('Google OAuth validation error:', error);
      }

      // Re-throw known HTTP exceptions
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      // Throw generic unauthorized for unknown errors
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  private generateAuthResponse(user: User): AuthResponseDto {
    const payload = {
      email: user.email,
      sub: user.id,
      fullName: user.fullName,
      role: user.role || 'user',
    };
    const access_token = this.jwtService.sign(payload);

    // Create user object without sensitive fields
    const userWithoutSensitiveData: Omit<
      User,
      'password' | 'resetToken' | 'resetTokenExpiry'
    > = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      residentPlace: user.residentPlace,
      isActive: user.isActive,
      googleId: user.googleId,
      avatar: user.avatar,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      access_token,
      user: userWithoutSensitiveData,
    };
  }
}
