import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UploadService } from './upload.service';

interface MultipleImagesUploadResponse {
  successful: Array<{
    url: string;
    fileName: string;
    publicId: string;
  }>;
  failed: Array<{
    fileName: string;
    error: string;
  }>;
}

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({ summary: 'Upload multiple images to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Images uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        successful: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              fileName: { type: 'string' },
              publicId: { type: 'string' },
            },
          },
        },
        failed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fileName: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid files' })
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<MultipleImagesUploadResponse> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    return await this.uploadService.uploadMultipleImages(files);
  }

  @Post('audio')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an audio file to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Audio uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        fileName: { type: 'string' },
        duration: { type: 'number' },
        publicId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file' })
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.uploadService.uploadAudio(file);
  }

  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a video file to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Video uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        fileName: { type: 'string' },
        duration: { type: 'number' },
        publicId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file' })
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.uploadService.uploadVideo(file);
  }

  @Post('virtual-tour')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary:
      'Upload a virtual tour file (360° image or 3D model) to Cloudinary',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        tourType: {
          type: 'string',
          enum: ['360_image', '3d_model', '360_video'],
          description:
            'Type of virtual tour: 360_image, 3d_model, or 360_video',
        },
      },
      required: ['file', 'tourType'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Virtual tour file uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        fileName: { type: 'string' },
        publicId: { type: 'string' },
        tourType: { type: 'string', enum: ['360_image', '3d_model'] },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file or type',
  })
  async uploadVirtualTour(
    @UploadedFile() file: Express.Multer.File,
    @Query('tourType') tourType: '360_image' | '3d_model' | '360_video',
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (
      !tourType ||
      !['360_image', '3d_model', '360_video'].includes(tourType)
    ) {
      throw new BadRequestException(
        'Invalid tourType. Must be "360_image", "3d_model", or "360_video"',
      );
    }
    return this.uploadService.uploadVirtualTour(file, tourType);
  }

  @Get('signature')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get a signed upload token for direct-to-Cloudinary uploads',
    description:
      'Returns a short-lived signature so the browser can POST a file directly to Cloudinary without routing the binary through this server. Eliminates 524 timeout errors on large files.',
  })
  @ApiQuery({
    name: 'tourType',
    enum: ['360_image', '360_video', '3d_model'],
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Signed upload params',
    schema: {
      type: 'object',
      properties: {
        signature: { type: 'string' },
        timestamp: { type: 'number' },
        folder: { type: 'string' },
        resourceType: { type: 'string' },
        apiKey: { type: 'string' },
        cloudName: { type: 'string' },
      },
    },
  })
  getUploadSignature(
    @Query('tourType') tourType: '360_image' | '360_video' | '3d_model',
  ) {
    if (!['360_image', '360_video', '3d_model'].includes(tourType)) {
      throw new BadRequestException(
        'tourType must be one of: 360_image, 360_video, 3d_model',
      );
    }
    return this.uploadService.generateUploadSignature(tourType);
  }
}
