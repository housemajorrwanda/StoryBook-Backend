# HouseMajor Microservice

A NestJS microservice with PostgreSQL + Prisma, JWT authentication, and Swagger documentation.

## Features

- 🔐 **JWT Authentication** - Register, login, and protected routes
- 📚 **Swagger Documentation** - Interactive API documentation
- 🐘 **PostgreSQL + Prisma** - Modern database setup with type safety
- 🛡️ **Guards & Validation** - Request validation and route protection
- 🚀 **Modern Stack** - NestJS, TypeScript, Prisma

## Quick Start

### 1. Environment Setup

Copy the environment example file:
```bash
cp .env.example .env
```

Update `.env` with your PostgreSQL connection:

**Local Development:**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/housemajor?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
PORT=3009
NODE_ENV=development
AI_EMBEDDING_URL=http://localhost:8085/embeddings
AI_EMBEDDING_MODEL=nomic-embed-text
AI_TRANSCRIBE_URL=http://localhost:8084/transcribe
AI_TRANSCRIBE_MODEL=faster-whisper-large-v3
AI_HTTP_TIMEOUT=120000  # 120 seconds default (2 minutes). Timeout is auto-calculated based on file duration (2x real-time + 120s buffer)
```

**Railway Production:**
```env
DATABASE_URL="postgresql://user:password@your-postgres.up.railway.app:5432/railway"
JWT_SECRET=your-production-jwt-secret
JWT_EXPIRES_IN=24h
PORT=3009
NODE_ENV=production
AI_EMBEDDING_URL=https://your-embedding-service.up.railway.app/embeddings
AI_EMBEDDING_MODEL=nomic-embed-text
AI_TRANSCRIBE_URL=https://your-transcription-service.up.railway.app/transcribe
AI_TRANSCRIBE_MODEL=large-v3
AI_HTTP_TIMEOUT=300000  # 5 minutes for production (or higher for longer files)
```

**Note:** The embedding server service on Railway also needs its own environment variable:
```env
OLLAMA_URL=http://ollama.railway.internal:11434  # or your Ollama service URL
```

### 2. Database Setup

Make sure PostgreSQL is running, then:
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Seed database
npx prisma db seed
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

## API Documentation

Once running, visit:
- **API Documentation**: http://localhost:3009/api
- **Health Check**: http://localhost:3009

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/profile` - Get current user profile (protected)

### Users
- `GET /users` - Get all users (protected)
- `GET /users/me` - Get current user info (protected)

## Database Management

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset

# Deploy migrations to production
npx prisma migrate deploy
```

## Development

```bash
# Watch mode
npm run start:dev

# Debug mode
npm run start:debug

# Run tests
npm run test

# Run e2e tests
npm run test:e2e
```

## Project Structure

```
src/
├── auth/           # Authentication module
│   ├── dto/        # Data transfer objects
│   ├── guards/     # Auth guards
│   └── strategies/ # Passport strategies
├── user/           # User module
├── prisma/         # Prisma service
└── main.ts         # Application entry point

prisma/
└── schema.prisma   # Database schema
```

## Technologies Used

- **NestJS** - Progressive Node.js framework
- **PostgreSQL** - Relational database
- **Prisma** - Next-generation ORM
- **JWT** - JSON Web Tokens for authentication
- **Swagger** - API documentation
- **TypeScript** - Type-safe JavaScript

## License

MIT
