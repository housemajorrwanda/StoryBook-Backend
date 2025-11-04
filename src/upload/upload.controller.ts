import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
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
}
