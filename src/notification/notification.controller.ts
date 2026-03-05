import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { NotificationDto } from './dto/notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface RequestWithUser {
  user: { userId: number; role: string };
}

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ─── Admin endpoints ────────────────────────────────────────────────────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List notifications (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Notifications with pagination + unread count',
    type: NotificationDto,
    isArray: true,
  })
  async listNotifications(@Query() query: NotificationQueryDto) {
    return this.notificationService.listNotifications(query);
  }

  @Patch('read-all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Mark all admin notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'Count of updated notifications + new unread count',
  })
  async markAllAsRead() {
    return this.notificationService.markAllAsRead('admin');
  }

  @Patch(':id/read')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({
    status: 200,
    description: 'Updated notification + new unread count',
    type: NotificationDto,
  })
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.markAsRead(id);
  }

  // ─── User endpoints ─────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'List my notifications' })
  @ApiResponse({
    status: 200,
    description: 'User notifications with pagination + unread count',
    type: NotificationDto,
    isArray: true,
  })
  async listMyNotifications(@Query() query: NotificationQueryDto) {
    return this.notificationService.listNotifications({
      ...query,
      audience: 'user',
    });
  }

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Get my unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Unread notification count for the current user',
  })
  async getMyUnreadCount(@Request() req: RequestWithUser) {
    const count = await this.notificationService.getUnreadCount(
      'user',
      req.user.userId,
    );
    return { unreadCount: count };
  }

  @Patch('me/read-all')
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'Count of updated notifications + new unread count',
  })
  async markAllMyAsRead(@Request() req: RequestWithUser) {
    return this.notificationService.markAllAsRead('user', req.user.userId);
  }

  @Patch('me/:id/read')
  @ApiOperation({ summary: 'Mark one of my notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'Updated notification + new unread count',
    type: NotificationDto,
  })
  async markMyAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.markAsRead(id);
  }
}
