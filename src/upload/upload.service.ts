import { Injectable, BadRequestException } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  async uploadMultipleImages(files: Express.Multer.File[]): Promise<{
    successful: Array<{
      url: string;
      fileName: string;
      publicId: string;
    }>;
    failed: Array<{
      fileName: string;
      error: string;
    }>;
  }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const successful: Array<{
      url: string;
      fileName: string;
      publicId: string;
    }> = [];

    const failed: Array<{
      fileName: string;
      error: string;
    }> = [];

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    // Process each file
    for (const file of files) {
      try {
        // Validate file type
        if (!allowedTypes.includes(file.mimetype)) {
          failed.push({
            fileName: file.originalname,
            error:
              'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
          });
          continue;
        }

        // Validate file size
        if (file.size > maxSize) {
          failed.push({
            fileName: file.originalname,
            error: 'File size exceeds 5MB limit',
          });
          continue;
        }

        // Upload to Cloudinary
        const result = await this.uploadToCloudinary(
          file,
          'testimonies/images',
        );

        successful.push({
          url: result.secure_url,
          fileName: file.originalname,
          publicId: result.public_id,
        });
      } catch (error) {
        console.error(
          `Error uploading ${file.originalname} to Cloudinary:`,
          error,
        );
        failed.push({
          fileName: file.originalname,
          error: 'Failed to upload image',
        });
      }
    }

    return { successful, failed };
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
      'audio/x-m4a',
      'audio/aac',
      'audio/webm',
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
        duration: Math.round(
          typeof result.duration === 'number' ? result.duration : 0,
        ),
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
        duration: Math.round(
          typeof result.duration === 'number' ? result.duration : 0,
        ),
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

  async uploadVirtualTour(
    file: Express.Multer.File,
    tourType: '360_image' | '3d_model' | '360_video',
  ): Promise<{
    url: string;
    fileName: string;
    publicId: string;
    tourType: string;
  }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (tourType === '360_image') {
      // Validate 360° image types
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/webp',
        'image/heic',
        'image/heif',
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG, WebP, HEIC, and HEIF images are allowed for 360° images',
        );
      }

      // Validate file size (20MB for 360° images)
      const maxSize = 20 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException(
          'File size exceeds 20MB limit for 360° images',
        );
      }

      try {
        const result = await this.uploadToCloudinary(
          file,
          'testimonies/virtual-tours/360',
          'image',
        );

        return {
          url: result.secure_url,
          fileName: file.originalname,
          publicId: result.public_id,
          tourType: '360_image',
        };
      } catch (error) {
        console.error('Error uploading 360° image to Cloudinary:', error);
        throw new BadRequestException('Failed to upload 360° image');
      }
    } else if (tourType === '3d_model') {
      // Validate 3D model types
      const allowedTypes = [
        'model/gltf-binary', // GLB
        'model/gltf+json', // GLTF
        'application/octet-stream', // Sometimes GLB files are detected as this
      ];

      // Check file extension as fallback for 3D models
      const fileName = file.originalname.toLowerCase();
      const hasValidExtension =
        fileName.endsWith('.glb') ||
        fileName.endsWith('.gltf') ||
        fileName.endsWith('.obj');

      if (!allowedTypes.includes(file.mimetype) && !hasValidExtension) {
        throw new BadRequestException(
          'Invalid file type. Only GLB, GLTF, and OBJ 3D model files are allowed',
        );
      }

      // Validate file size (100MB for 3D models)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException(
          'File size exceeds 100MB limit for 3D models',
        );
      }

      try {
        const result = await this.uploadToCloudinary(
          file,
          'testimonies/virtual-tours/3d-models',
          'raw', // Use 'raw' for 3D model files
        );

        return {
          url: result.secure_url,
          fileName: file.originalname,
          publicId: result.public_id,
          tourType: '3d_model',
        };
      } catch (error) {
        console.error('Error uploading 3D model to Cloudinary:', error);
        throw new BadRequestException('Failed to upload 3D model');
      }
    } else if (tourType === '360_video') {
      // Validate 360° video types
      const allowedTypes = [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/webm',
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only MP4, MPEG, MOV, and WebM video files are allowed for 360° videos',
        );
      }

      // Validate file size (500MB for 360° videos)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException(
          'File size exceeds 500MB limit for 360° videos',
        );
      }

      try {
        const result = await this.uploadToCloudinary(
          file,
          'virtual-tours/360-video',
          'video',
        );

        return {
          url: result.secure_url,
          fileName: file.originalname,
          publicId: result.public_id,
          tourType: '360_video',
        };
      } catch (error) {
        console.error('Error uploading 360° video to Cloudinary:', error);
        throw new BadRequestException('Failed to upload 360° video');
      }
    } else {
      throw new BadRequestException(
        'Invalid tour type. Must be "360_image", "3d_model", or "360_video"',
      );
    }
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
    }
  }
}
