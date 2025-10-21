import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
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
    
    if (!user || !await this.userService.validatePassword(loginDto.password, user.password)) {
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
}
