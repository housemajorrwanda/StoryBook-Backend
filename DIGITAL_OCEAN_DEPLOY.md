# 🚀 Digital Ocean Deployment Guide

## Quick Deploy to Digital Ocean App Platform

### Step 1: Prepare Your Repository

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Ready for Digital Ocean deployment"
   git push origin main
   ```

### Step 2: Create Digital Ocean App

1. **Go to Digital Ocean App Platform**
   - Visit: https://cloud.digitalocean.com/apps
   - Click **"Create App"**

2. **Connect Repository**
   - Choose **GitHub** (or GitLab)
   - Select your `housemajor` repository
   - Branch: `main`
   - Auto-deploy: ✅ **Enabled**

### Step 3: Configure App Settings

**App Info:**
- App Name: `housemajor-api`
- Region: `New York` (or closest to you)

**Service Configuration:**
- Service Name: `api`
- Environment Type: `Node.js`
- Instance Type: `Basic ($5/month)`
- Instance Count: `1`

**Build & Deploy Settings:**
- Build Command: `npm run build && npm run db:generate`
- Run Command: `npm run start:prod`
- HTTP Port: `3009`

### Step 4: Add Environment Variables

In the App Platform dashboard, add these environment variables:

```bash
NODE_ENV=production
PORT=3009
JWT_SECRET=your-super-secure-jwt-secret-change-this-in-production-123456789
JWT_EXPIRES_IN=24h
```

**⚠️ Important:** Change the JWT_SECRET to a secure random string!

### Step 5: Add Database (PostgreSQL)

1. **In App Platform, go to "Database" tab**
2. **Click "Add Database"**
3. **Choose "Dev Database" ($0/month for testing)**
   - Engine: PostgreSQL
   - Name: `housemajor-db`
   - Version: 15

4. **Digital Ocean will automatically add DATABASE_URL**

### Step 6: Deploy!

1. **Click "Create Resources"**
2. **Wait for deployment** (5-10 minutes)
3. **Your app will be available at**: `https://your-app-name.ondigitalocean.app`

---

## 🌐 Accessing Your Deployed API

### Your API URLs:
- **Base API**: `https://your-app-name.ondigitalocean.app/api/v1`
- **Swagger Docs**: `https://your-app-name.ondigitalocean.app/api/docs`
- **Health Check**: `https://your-app-name.ondigitalocean.app/api/v1/health`

### Test Your API:

1. **Health Check**:
   ```bash
   curl https://your-app-name.ondigitalocean.app/api/v1/health
   ```

2. **Register a User**:
   ```bash
   curl -X POST https://your-app-name.ondigitalocean.app/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "username": "testuser",
       "password": "password123",
       "firstName": "Test",
       "lastName": "User"
     }'
   ```

3. **Login**:
   ```bash
   curl -X POST https://your-app-name.ondigitalocean.app/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

---

## 📚 Swagger Documentation Access

**Visit**: `https://your-app-name.ondigitalocean.app/api/docs`

The Swagger UI provides:
- ✅ Interactive API testing
- ✅ Complete endpoint documentation
- ✅ Authentication testing
- ✅ Request/response examples
- ✅ Schema definitions

### Using Swagger UI:

1. **Open the Swagger URL** in your browser
2. **Register a new user** using the `/auth/register` endpoint
3. **Login** using the `/auth/login` endpoint
4. **Copy the JWT token** from the login response
5. **Click "Authorize"** button in Swagger
6. **Enter**: `Bearer YOUR_JWT_TOKEN`
7. **Test protected endpoints** like `/users/me`

---

## 🔧 Alternative: Manual Droplet Deployment

If you prefer a traditional server setup:

### 1. Create Ubuntu Droplet
- **Size**: Basic $6/month (1GB RAM)
- **Image**: Ubuntu 22.04 LTS
- **Add SSH Key**

### 2. Server Setup
```bash
# Connect to your droplet
ssh root@your_droplet_ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PostgreSQL
apt install postgresql postgresql-contrib -y

# Install PM2 for process management
npm install -g pm2

# Install Nginx
apt install nginx -y
```

### 3. Database Setup
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE housemajor;
CREATE USER housemajor WITH PASSWORD 'secure_password_123';
GRANT ALL PRIVILEGES ON DATABASE housemajor TO housemajor;
\q
```

### 4. Deploy Application
```bash
# Clone your repository
git clone https://github.com/yourusername/housemajor.git
cd housemajor

# Install dependencies
npm ci --production

# Create environment file
cat > .env << EOF
NODE_ENV=production
PORT=3009
DATABASE_URL="postgresql://housemajor:secure_password_123@localhost:5432/housemajor?schema=public"
JWT_SECRET=your-super-secure-jwt-secret-change-this
JWT_EXPIRES_IN=24h
EOF

# Build and setup
npm run build
npm run db:generate
npm run db:migrate

# Start with PM2
pm2 start dist/main.js --name housemajor-api
pm2 startup
pm2 save
```

### 5. Configure Nginx
```bash
# Create Nginx config
cat > /etc/nginx/sites-available/housemajor << EOF
server {
    listen 80;
    server_name your_domain_or_ip;
    
    location / {
        proxy_pass http://localhost:3009;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/housemajor /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 🔍 Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Check Node.js version (should be 18+)
   - Verify all dependencies are installed
   - Check build logs in Digital Ocean dashboard

2. **Database Connection Error**:
   - Verify DATABASE_URL format
   - Ensure database is created and accessible
   - Check environment variables

3. **JWT Errors**:
   - Ensure JWT_SECRET is set and secure
   - Check token format in Authorization header

4. **Port Issues**:
   - Verify PORT environment variable is set to 3009
   - Check if port is available

### Viewing Logs:

**Digital Ocean App Platform**:
- Go to your app dashboard
- Click "Runtime Logs" tab
- View real-time application logs

**Manual Deployment**:
```bash
# PM2 logs
pm2 logs housemajor-api

# Nginx logs
tail -f /var/log/nginx/error.log
```

---

## 💰 Cost Estimate

### Digital Ocean App Platform:
- **Basic App**: $5/month
- **Dev Database**: $0/month (limited)
- **Total**: ~$5/month

### Manual Droplet:
- **Basic Droplet**: $6/month
- **Managed Database**: $15/month (optional)
- **Total**: $6-21/month

---

## 🎉 Success!

Once deployed, your HouseMajor API will be live with:

✅ **Full REST API** with authentication  
✅ **Interactive Swagger documentation**  
✅ **PostgreSQL database** with Prisma ORM  
✅ **JWT-based security**  
✅ **Auto-scaling** (App Platform)  
✅ **SSL certificate** (automatic)  
✅ **Health monitoring**  

**Your Swagger documentation will be accessible at:**
`https://your-app-name.ondigitalocean.app/api/docs`

Happy coding! 🚀
