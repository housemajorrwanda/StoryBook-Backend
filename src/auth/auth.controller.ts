import { Controller, Post, Body, UseGuards, Get, Request, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) 
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ 
    status: 201, 
    description: 'User successfully registered',
    type: AuthResponseDto
  })
  @ApiResponse({ 
    status: 409, 
    description: 'User with this email or username already exists'
  })
  @ApiResponse({ 
    status: 429, 
    description: 'Too many requests'
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) 
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User successfully logged in',
    type: AuthResponseDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid credentials'
  })
  @ApiResponse({ 
    status: 429, 
    description: 'Too many requests'
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully'
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized'
  })
  getProfile(@Request() req) {
    return req.user;
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 300000 } }) 
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset email sent if email exists'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid email format'
  })
  @ApiResponse({ 
    status: 429, 
    description: 'Too many requests'
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) 
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ 
    status: 200, 
    description: 'Password successfully reset'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid or expired reset token'
  })
  @ApiResponse({ 
    status: 429, 
    description: 'Too many requests'
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirects to Google OAuth consent screen'
  })

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint() 
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    try {
      const authResult = req.user;
      
      if (!authResult || !authResult.access_token) {
        throw new Error('No authentication result received');
      }
      
      // In production, redirect to your frontend with the token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/success?token=${authResult.access_token}`;
      
      return res.redirect(redirectUrl);
    } catch (error: any) {
      console.error('Google OAuth callback error:', {
        message: error?.message,
        status: error?.status,
        name: error?.name,
      });
      
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // Provide more specific error messages
      let errorMessage = 'Authentication failed';
      if (error?.status === 409) {
        errorMessage = 'Account already exists with different provider';
      } else if (error?.status === 400) {
        errorMessage = 'Invalid authentication data';
      } else if (error?.message) {
        errorMessage = encodeURIComponent(error.message);
      }
      
      const errorUrl = `${frontendUrl}/auth/error?message=${errorMessage}`;
      
      return res.redirect(errorUrl);
    }
  }

  @Get('google/success')
  @ApiOperation({ summary: 'Google OAuth success endpoint (for testing)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns authentication result for successful Google OAuth'
  })
  async googleAuthSuccess(@Request() req) {
    return {
      message: 'Google authentication successful',
      user: req.user,
    };
  }
}
