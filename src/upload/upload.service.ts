/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, BadRequestException } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  async uploadImage(file: Express.Multer.File): Promise<{
    url: string;
    fileName: string;
    publicId: string;
  }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
      );
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    try {
      const result = await this.uploadToCloudinary(file, 'testimonies/images');

      return {
        url: result.secure_url,
        fileName: file.originalname,
        publicId: result.public_id,
      };
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  async uploadAudio(file: Express.Multer.File): Promise<{
    url: string;
    fileName: string;
    duration: number;
    publicId: string;
  }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only MP3, WAV, OGG, and M4A audio files are allowed',
      );
    }

    // Validate file size (100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 100MB limit');
    }

    try {
      const result = await this.uploadToCloudinary(
        file,
        'testimonies/audio',
        'video',
      );

      return {
        url: result.secure_url,
        fileName: file.originalname,
        duration: Math.round(result.duration || 0),
        publicId: result.public_id,
      };
    } catch (error) {
      console.error('Error uploading audio to Cloudinary:', error);
      throw new BadRequestException('Failed to upload audio');
    }
  }

  async uploadVideo(file: Express.Multer.File): Promise<{
    url: string;
    fileName: string;
    duration: number;
    publicId: string;
  }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedTypes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only MP4, MPEG, MOV, AVI, and WebM video files are allowed',
      );
    }

    // Validate file size (500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 500MB limit');
    }

    try {
      const result = await this.uploadToCloudinary(
        file,
        'testimonies/video',
        'video',
      );

      return {
        url: result.secure_url,
        fileName: file.originalname,
        duration: Math.round(result.duration || 0),
        publicId: result.public_id,
      };
    } catch (error) {
      console.error('Error uploading video to Cloudinary:', error);
      throw new BadRequestException('Failed to upload video');
    }
  }

  private uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
    resourceType: 'image' | 'video' | 'raw' | 'auto' = 'image',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error)
            return reject(
              new Error(error.message || 'Cloudinary upload error'),
            );
          if (result) return resolve(result);
          reject(new Error('Upload failed'));
        },
      );

      const readable = Readable.from(file.buffer);
      readable.pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
    }
  }
}
