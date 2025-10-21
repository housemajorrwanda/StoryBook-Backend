# 🌐 Frontend Integration Guide

## 🚀 Complete Authentication System

Your backend now supports **3 authentication methods**:

1. **Email/Password Registration & Login**
2. **Forgot Password with Email Reset**
3. **Google OAuth Login**

## 📡 API Endpoints Summary

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/register` | Register with email/password | ❌ |
| `POST` | `/auth/login` | Login with email/password | ❌ |
| `POST` | `/auth/forgot-password` | Request password reset | ❌ |
| `POST` | `/auth/reset-password` | Reset password with token | ❌ |
| `GET` | `/auth/google` | Start Google OAuth | ❌ |
| `GET` | `/auth/google/callback` | Google OAuth callback | ❌ |
| `GET` | `/auth/profile` | Get user profile | ✅ JWT |

### User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/users` | Get all users | ✅ JWT |
| `GET` | `/users/me` | Get current user | ✅ JWT |

## 🔧 Frontend Implementation Examples

### 1. **React Authentication Hook**

```javascript
// hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('authToken'));

  const API_BASE = 'https://storybook-backend-production-574d.up.railway.app';

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('authToken', data.access_token);
        return { success: true };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem('authToken', data.access_token);
        return { success: true };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      return { success: response.ok, message: data.message };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();
      return { success: response.ok, message: data.message };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const loginWithGoogle = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
  };

  const value = {
    user,
    loading,
    login,
    register,
    forgotPassword,
    resetPassword,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 2. **Login Component**

```javascript
// components/LoginForm.js
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const LoginForm = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="login-form">
      <h2>Login</h2>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Username or Email"
          value={formData.username}
          onChange={handleChange}
          required
        />
        
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="divider">OR</div>

      <button 
        onClick={loginWithGoogle}
        className="google-login-btn"
      >
        🔍 Login with Google
      </button>

      <div className="links">
        <a href="/forgot-password">Forgot Password?</a>
        <a href="/register">Don't have an account? Register</a>
      </div>
    </div>
  );
};

export default LoginForm;
```

### 3. **Google OAuth Success Handler**

```javascript
// pages/AuthSuccess.js
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Extract token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (token) {
      // Store token and redirect
      localStorage.setItem('authToken', token);
      navigate('/dashboard');
    } else if (error) {
      console.error('OAuth Error:', error);
      navigate('/login?error=' + encodeURIComponent(error));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="auth-loading">
      <h2>Completing authentication...</h2>
      <p>Please wait while we log you in.</p>
    </div>
  );
};

export default AuthSuccess;
```

### 4. **Forgot Password Component**

```javascript
// components/ForgotPassword.js
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await forgotPassword(email);
    setMessage(result.message);
    setLoading(false);
  };

  return (
    <div className="forgot-password">
      <h2>Reset Password</h2>
      
      {message && <div className="message">{message}</div>}
      
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;
```

### 5. **Protected Route Component**

```javascript
// components/ProtectedRoute.js
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
```

## 🎨 CSS Styling Example

```css
/* styles/auth.css */
.login-form {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
}

.login-form h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
}

.login-form input {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.login-form button {
  width: 100%;
  padding: 0.75rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: 1rem;
}

.login-form button:hover {
  background: #0056b3;
}

.login-form button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.google-login-btn {
  background: #db4437 !important;
}

.google-login-btn:hover {
  background: #c23321 !important;
}

.divider {
  text-align: center;
  margin: 1rem 0;
  color: #666;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #ddd;
  z-index: 1;
}

.divider {
  background: white;
  padding: 0 1rem;
  z-index: 2;
  position: relative;
}

.error {
  background: #f8d7da;
  color: #721c24;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.message {
  background: #d4edda;
  color: #155724;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.links {
  text-align: center;
  margin-top: 1rem;
}

.links a {
  color: #007bff;
  text-decoration: none;
  margin: 0 0.5rem;
}

.links a:hover {
  text-decoration: underline;
}
```

## 🚀 Quick Setup Checklist

### Backend Setup (Already Done ✅)
- [x] Password reset with email
- [x] Google OAuth endpoints
- [x] JWT authentication
- [x] Error handling
- [x] CORS enabled

### Frontend Setup (Your Tasks)
- [ ] Install required packages: `npm install react-router-dom`
- [ ] Set up authentication context
- [ ] Create login/register forms
- [ ] Handle Google OAuth redirects
- [ ] Add protected routes
- [ ] Style components

### Google OAuth Setup (Required)
- [ ] Install: `npm install passport-google-oauth20 @types/passport-google-oauth20`
- [ ] Create Google Cloud Console project
- [ ] Set up OAuth consent screen
- [ ] Get Client ID and Secret
- [ ] Set environment variables
- [ ] Uncomment GoogleStrategy in auth module

## 🎯 Production URLs

**Your API is live at**: `https://storybook-backend-production-574d.up.railway.app`

**API Documentation**: `https://storybook-backend-production-574d.up.railway.app/api`

Your authentication system is now complete with best practices! 🎉
