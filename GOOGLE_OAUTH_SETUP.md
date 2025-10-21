# 🔐 Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your NestJS application.

## 📋 Prerequisites

1. **Install Required Packages**
   ```bash
   npm install passport-google-oauth20 @types/passport-google-oauth20
   ```

2. **Update Google Strategy Import**
   After installing the packages, uncomment the import in `src/auth/strategies/google.strategy.ts`:
   ```typescript
   import { Strategy, VerifyCallback } from 'passport-google-oauth20';
   ```
   And remove the temporary type declarations.

## 🚀 Google Console Setup

### Step 1: Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google+ API** and **Google OAuth2 API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**

### Step 2: Configure OAuth Consent Screen

1. Go to **OAuth consent screen**
2. Choose **External** user type
3. Fill in required information:
   - **App name**: HouseMajor
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
4. Add scopes: `email`, `profile`
5. Add test users if needed

### Step 3: Create OAuth 2.0 Client ID

1. **Application type**: Web application
2. **Name**: HouseMajor Backend
3. **Authorized redirect URIs**:
   - Development: `http://localhost:3009/auth/google/callback`
   - Production: `https://your-domain.com/auth/google/callback`

### Step 4: Get Credentials

Copy the **Client ID** and **Client Secret** from the credentials page.

## ⚙️ Environment Configuration

### Local Development (.env)
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-actual-google-client-id
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3009/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

### Production (Railway)
Set these environment variables in Railway:
```bash
railway variables --set "GOOGLE_CLIENT_ID=your-actual-google-client-id"
railway variables --set "GOOGLE_CLIENT_SECRET=your-actual-google-client-secret"
railway variables --set "GOOGLE_CALLBACK_URL=https://storybook-backend-production-574d.up.railway.app/auth/google/callback"
railway variables --set "FRONTEND_URL=https://your-frontend-domain.com"
```

## 🔧 Update Auth Module

Add GoogleStrategy to your auth module (`src/auth/auth.module.ts`):

```typescript
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  // ... existing imports
  providers: [AuthService, JwtStrategy, GoogleStrategy], // Add GoogleStrategy
  // ... rest of module
})
```

## 🌐 API Endpoints

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/google` | Initiate Google OAuth |
| `GET` | `/auth/google/callback` | OAuth callback (internal) |
| `GET` | `/auth/google/success` | Success endpoint (testing) |

### Frontend Integration

#### 1. **Redirect to Google OAuth**
```javascript
// Redirect user to Google OAuth
window.location.href = 'https://your-api-domain.com/auth/google';
```

#### 2. **Handle OAuth Success**
```javascript
// Your frontend should handle the redirect from /auth/google/callback
// The user will be redirected to: https://your-frontend.com/auth/success?token=JWT_TOKEN

// Extract token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (token) {
  // Store token and redirect to dashboard
  localStorage.setItem('authToken', token);
  window.location.href = '/dashboard';
}
```

#### 3. **Handle OAuth Error**
```javascript
// Handle error redirect: https://your-frontend.com/auth/error?message=error_message
const urlParams = new URLSearchParams(window.location.search);
const error = urlParams.get('message');

if (error) {
  console.error('OAuth Error:', error);
  // Show error message to user
}
```

## 🔄 User Flow

1. **User clicks "Login with Google"** → Frontend redirects to `/auth/google`
2. **Google OAuth consent** → User authorizes your app
3. **Google redirects back** → `/auth/google/callback` processes the response
4. **Success redirect** → User redirected to frontend with JWT token
5. **Frontend stores token** → User is logged in

## 🛡️ Security Features

- ✅ **Account Linking**: Existing users can link Google accounts
- ✅ **Automatic Registration**: New users created automatically
- ✅ **Secure Tokens**: JWT tokens with proper expiration
- ✅ **Error Handling**: Comprehensive error handling and redirects
- ✅ **Username Generation**: Automatic unique username creation

## 🧪 Testing

### Test Google OAuth Flow

1. Start your backend: `npm run start:dev`
2. Visit: `http://localhost:3009/auth/google`
3. Complete Google OAuth flow
4. Check if you're redirected properly

### Test with Frontend

```javascript
// Example React component
const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:3009/auth/google';
  };

  return (
    <button onClick={handleGoogleLogin}>
      Login with Google
    </button>
  );
};
```

## 🚨 Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch"**
   - Check that callback URL in Google Console matches your environment
   - Ensure no trailing slashes

2. **"invalid_client"**
   - Verify Client ID and Secret are correct
   - Check environment variables are loaded

3. **CORS Issues**
   - Ensure your frontend domain is allowed
   - Check CORS configuration in main.ts

### Debug Mode

Add logging to see OAuth flow:
```typescript
// In google.strategy.ts validate method
console.log('Google OAuth Profile:', profile);
console.log('Generated User:', user);
```

## 📝 Database Migration

Run the migration to add Google OAuth fields:
```bash
npx prisma migrate dev --name add_google_oauth_fields
npx prisma generate
```

## 🎯 Production Checklist

- [ ] Install passport-google-oauth20 packages
- [ ] Set up Google Cloud Console project
- [ ] Configure OAuth consent screen
- [ ] Create OAuth 2.0 credentials
- [ ] Set production environment variables
- [ ] Update callback URLs for production domain
- [ ] Test complete OAuth flow
- [ ] Update frontend redirect URLs

Your Google OAuth integration is now ready! 🎉
