# OAuth Authentication Setup & Troubleshooting

## 🔧 **What We Fixed**

### ❌ **Previous Issues**
- Google/Apple OAuth was redirecting to non-existent `/auth/callback` route
- No proper handling of OAuth redirects
- Missing error handling for OAuth failures
- App was running on port 8080 but callback URLs weren't configured properly

### ✅ **Solutions Implemented**

1. **Created AuthCallback Page** (`src/pages/AuthCallback.tsx`)
   - Handles OAuth redirects from Google/Apple
   - Properly processes authentication tokens
   - Redirects to intended destination after successful auth
   - Handles errors gracefully

2. **Added Auth Callback Route**
   - Added `/auth/callback` route to `App.tsx`
   - Public route that handles OAuth redirects

3. **Fixed OAuth Configuration**
   - Updated redirect URLs to use `window.location.origin`
   - Added proper error handling
   - Improved loading states
   - Added loading indicators during OAuth flows

4. **Enhanced Both Login & Sign-up Pages**
   - Added OAuth buttons to both pages
   - Consistent user experience
   - Proper loading states
   - Better error messages

## 🚀 **How OAuth Now Works**

### **OAuth Flow:**
1. User clicks "Continue with Google/Apple"
2. App redirects to OAuth provider
3. User authenticates with provider
4. Provider redirects back to `/auth/callback`
5. `AuthCallback` page processes the authentication
6. User is redirected to intended destination

### **Redirect URLs:**
- **Development:** `http://localhost:8080/auth/callback`
- **Production:** `https://yourdomain.com/auth/callback`

## ⚙️ **Supabase Configuration Required**

### **1. Google OAuth Setup**

In your Supabase dashboard:

1. Go to **Authentication** → **Providers**
2. Enable **Google** provider
3. Add these **Authorized redirect URLs**:
   ```
   http://localhost:8080/auth/callback
   https://yourdomain.com/auth/callback
   ```
4. Configure Google Client ID and Secret:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     ```
     https://vttanwzodshofhycuqjr.supabase.co/auth/v1/callback
     ```

### **2. Apple OAuth Setup**

In your Supabase dashboard:

1. Go to **Authentication** → **Providers**
2. Enable **Apple** provider
3. Add the same **Authorized redirect URLs**:
   ```
   http://localhost:8080/auth/callback
   https://yourdomain.com/auth/callback
   ```
4. Configure Apple credentials:
   - Apple Developer Account required
   - Create App ID and Service ID
   - Add redirect URI:
     ```
     https://vttanwzodshofhycuqjr.supabase.co/auth/v1/callback
     ```

## 🐛 **Troubleshooting**

### **Common Issues & Solutions**

#### **1. "Invalid redirect URL" Error**
**Problem:** Supabase rejects the redirect URL
**Solution:**
- Check Supabase dashboard → Authentication → URL Configuration
- Add your domain to "Site URL" and "Redirect URLs"
- Ensure URLs match exactly (including http/https)

#### **2. OAuth Redirects to Wrong URL**
**Problem:** App redirects to wrong callback URL
**Solution:**
- Verify `window.location.origin` in browser console
- Check if app is running on expected port (8080)
- Update Supabase redirect URLs to match

#### **3. Callback Page Shows Indefinite Loading**
**Problem:** `AuthCallback` page doesn't complete authentication
**Solution:**
- Check browser console for errors
- Verify Supabase session is being created
- Check if OAuth provider returned proper tokens

#### **4. "Provider not configured" Error**
**Problem:** Google/Apple providers not properly set up
**Solution:**
- Enable providers in Supabase dashboard
- Add valid client ID/secret for Google
- Configure proper Apple credentials

#### **5. CORS Errors**
**Problem:** Cross-origin requests blocked
**Solution:**
- Check Supabase CORS settings
- Verify domain is whitelisted
- Use HTTPS in production

## 🔍 **Testing OAuth**

### **Testing Steps:**

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test Google OAuth**
   - Click "Continue with Google" on login page
   - Should redirect to Google sign-in
   - After authentication, should return to `/auth/callback`
   - Should then redirect to `/home` (or intended page)

3. **Test Apple OAuth**
   - Click "Continue with Apple" on login page
   - Should redirect to Apple sign-in
   - Follow same flow as Google

4. **Check Browser Console**
   - Look for any error messages
   - Verify OAuth flow completes successfully
   - Check network requests for failures

### **Development URLs to Test:**
- Login: `http://localhost:8080/`
- Sign-up: `http://localhost:8080/signup`
- Callback: `http://localhost:8080/auth/callback` (should not be accessed directly)

## 🛠️ **Development vs Production**

### **Development (localhost:8080)**
- OAuth redirects to `http://localhost:8080/auth/callback`
- Supabase needs this URL in redirect settings
- Use for local testing

### **Production (your-domain.com)**
- OAuth redirects to `https://your-domain.com/auth/callback`
- Must use HTTPS in production
- Update Supabase settings before deploying

## 📋 **Environment Variables**

Ensure these are set in your environment:

```env
VITE_SUPABASE_URL=https://vttanwzodshofhycuqjr.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 🔒 **Security Notes**

1. **HTTPS Required in Production**
   - OAuth providers require HTTPS
   - Never use HTTP in production

2. **Validate Redirect URLs**
   - Always validate callback URLs
   - Use exact URL matching in Supabase

3. **Token Security**
   - Tokens are handled by Supabase automatically
   - Never expose client secrets in frontend

## 🎯 **Next Steps**

1. **Configure Supabase OAuth providers** (Google & Apple)
2. **Test OAuth flows** in development
3. **Update production URLs** when deploying
4. **Monitor error logs** for OAuth issues
5. **Add more OAuth providers** if needed (GitHub, Discord, etc.)

---

Your OAuth authentication should now work properly! The key was creating the callback route and properly configuring the redirect URLs.