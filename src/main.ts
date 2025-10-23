import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  const config = new DocumentBuilder()
    .setTitle('StoryBook API - Testimony Management System')
    .setDescription(`
      ## StoryBook Backend API
      
      A comprehensive testimony management system with:
      - **Authentication**: Email/password and Google OAuth
      - **Testimonies**: Written, audio, and video testimonies with admin approval workflow
      - **File Upload**: Cloudinary integration for images, audio, and video
      - **Admin Actions**: Approve, reject, report, and request feedback
      
      ### Authentication
      Most endpoints require JWT authentication. Use the /auth/login or /auth/register endpoints to get a token.
      
      ### File Upload Flow
      1. Upload files to /upload/image, /upload/audio, or /upload/video
      2. Get Cloudinary URLs from response
      3. Submit testimony with URLs
      
      ### Admin Approval Workflow
      - Testimonies start as "pending"
      - Admins can approve, reject, report, or request feedback
      - All actions are tracked with reviewer info and timestamp
    `)
    .setVersion('1.0.0')
    .addTag('Authentication', 'User authentication and registration')
    .addTag('Users', 'User management endpoints')
    .addTag('Testimonies', 'Testimony CRUD and management')
    .addTag('Upload', 'File upload to Cloudinary')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(process.env.PORT ?? 3009);
  console.log(`🚀 Application is running on: http://localhost:${process.env.PORT ?? 3009}`);
  console.log(`📚 Swagger documentation: http://localhost:${process.env.PORT ?? 3009}/api`);
}
bootstrap();
