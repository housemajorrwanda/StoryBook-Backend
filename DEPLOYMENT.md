# Deployment Guide - HouseMajor Microservice

## 🚀 Digital Ocean Deployment

### Prerequisites
- Digital Ocean account
- Docker installed locally
- Git repository (GitHub/GitLab)

### Option 1: Digital Ocean App Platform

1. **Push to Git Repository**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Create App on Digital Ocean**
   - Go to [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Connect your GitHub/GitLab repository
   - Select the `housemajor` repository

3. **Configure App Settings**
   - **Name**: `housemajor-api`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Source Directory**: `/` (root)
   - **Build Command**: `npm run deploy:prepare`
   - **Run Command**: `npm run start:prod`

4. **Environment Variables**
   Add these in the App Platform dashboard:
   ```
   NODE_ENV=production
   PORT=3009
   JWT_SECRET=your-super-secure-production-jwt-secret
   JWT_EXPIRES_IN=24h
   DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
   ```

5. **Database Setup**
   - Create a Digital Ocean Managed PostgreSQL database
   - Copy the connection string to `DATABASE_URL`
   - Run migrations after deployment

### Option 2: Digital Ocean Droplet with Docker

1. **Create Droplet**
   - Ubuntu 22.04 LTS
   - At least 2GB RAM
   - Install Docker and Docker Compose

2. **Deploy Application**
   ```bash
   # On your droplet
   git clone https://github.com/yourusername/housemajor.git
   cd housemajor
   
   # Create environment file
   cp .env.production .env
   # Edit .env with your actual values
   
   # Build and run
   docker-compose up -d
   ```

3. **Run Database Migrations**
   ```bash
   docker-compose exec app npm run db:migrate
   ```

### Option 3: Manual Deployment

1. **Server Setup**
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   npm install -g pm2
   ```

2. **Application Deployment**
   ```bash
   # Clone and setup
   git clone https://github.com/yourusername/housemajor.git
   cd housemajor
   npm ci --production
   
   # Build application
   npm run build
   npm run db:generate
   
   # Start with PM2
   pm2 start dist/main.js --name housemajor-api
   pm2 startup
   pm2 save
   ```

## 🗄️ Database Setup

### Digital Ocean Managed Database

1. **Create Database**
   - Go to Digital Ocean Databases
   - Create PostgreSQL 15 cluster
   - Choose appropriate size (Basic $15/month for testing)

2. **Configure Connection**
   - Copy connection string
   - Update `DATABASE_URL` in environment variables
   - Ensure SSL mode is enabled

3. **Run Migrations**
   ```bash
   # After deployment
   npm run db:migrate
   ```

### Self-Hosted PostgreSQL

1. **Install PostgreSQL**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

2. **Create Database and User**
   ```sql
   sudo -u postgres psql
   CREATE DATABASE housemajor;
   CREATE USER housemajor WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE housemajor TO housemajor;
   \q
   ```

## 🌐 Domain and SSL Setup

### Configure Domain

1. **Point Domain to Droplet**
   - Add A record: `api.yourdomain.com` → `your_droplet_ip`

2. **Install Nginx**
   ```bash
   sudo apt install nginx
   ```

3. **Configure Nginx**
   ```nginx
   # /etc/nginx/sites-available/housemajor
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3009;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Enable Site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/housemajor /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Install SSL Certificate**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

## 📊 Monitoring and Logs

### Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs housemajor-api

# Docker logs
docker-compose logs -f app
```

### Health Checks
- **Health Endpoint**: `https://api.yourdomain.com/api/v1/health`
- **API Documentation**: `https://api.yourdomain.com/api/docs`

## 🔧 Environment Variables Reference

```bash
# Required
NODE_ENV=production
PORT=3009
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
JWT_SECRET=your-super-secure-secret-key

# Optional
JWT_EXPIRES_IN=24h
```

## 🚀 Accessing Your API

After successful deployment:

### API Endpoints
- **Base URL**: `https://api.yourdomain.com/api/v1`
- **Health Check**: `GET /health`
- **API Documentation**: `GET /api/docs` (Swagger UI)

### Authentication Endpoints
- **Register**: `POST /auth/register`
- **Login**: `POST /auth/login`
- **Profile**: `GET /auth/profile` (requires JWT)

### User Endpoints
- **Get Users**: `GET /users` (requires JWT)
- **Current User**: `GET /users/me` (requires JWT)

### Example API Usage
```bash
# Register a new user
curl -X POST https://api.yourdomain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "securepassword123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'

# Use JWT token for protected routes
curl -X GET https://api.yourdomain.com/api/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔍 Swagger Documentation

Access the interactive API documentation at:
**`https://api.yourdomain.com/api/docs`**

The Swagger UI provides:
- Complete API endpoint documentation
- Interactive testing interface
- Request/response examples
- Authentication testing
- Schema definitions

## 🛠️ Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check firewall settings
   - Ensure SSL mode for managed databases

3. **JWT Token Issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper Authorization header format

4. **Port Issues**
   - Ensure port 3009 is available
   - Check firewall rules
   - Verify nginx proxy configuration

### Logs and Debugging
```bash
# Application logs
tail -f /var/log/nginx/error.log
pm2 logs housemajor-api --lines 100

# Database connectivity test
npm run db:generate
```

## 📈 Scaling Considerations

For production use:
- Use Digital Ocean Load Balancer for multiple instances
- Implement Redis for session management
- Set up database read replicas
- Configure CDN for static assets
- Implement proper logging and monitoring (DataDog, New Relic)

Your HouseMajor API will be accessible at the configured domain with full Swagger documentation!
