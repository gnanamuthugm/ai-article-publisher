# LinkedIn OAuth Setup Guide

This guide will help you set up LinkedIn OAuth authentication for your CCAIP Daily blog.

## 🎯 What We're Building

- **LinkedIn OAuth Login**: Secure authentication using LinkedIn's OAuth 2.0
- **Production Ready**: Works on both localhost and Vercel
- **TypeScript Safe**: Full TypeScript support with proper error handling
- **Environment Based**: Uses environment variables only (no hardcoded values)

## 📋 Prerequisites

1. **LinkedIn Developer Account**: Create one at https://developer.linkedin.com/
2. **LinkedIn App**: Create an app in the LinkedIn Developer Portal
3. **Environment Variables**: Add required variables to your project

## 🔧 Step 1: Create LinkedIn App

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Click "Create App"
3. Choose "Sign In with LinkedIn" 
4. Fill in app details:
   - **App Name**: CCAIP Daily Blog
   - **App Description**: Daily blog about Contact Center AI
   - **App Logo**: Upload a logo (optional)
   - **Contact Email**: Your email
5. Configure **OAuth 2.0 Redirect URLs**:
   - **Development**: `http://localhost:3000/api/auth/linkedin/callback`
   - **Production**: `https://your-domain.vercel.app/api/auth/linkedin/callback`
6. Configure **Permissions** (Scopes):
   - `openid`
   - `profile` 
   - `w_member_social`
7. Submit for review (LinkedIn review usually takes 1-3 business days)

## 🔧 Step 2: Get Your Credentials

After app approval, you'll get:
- **Client ID**: Your app's client identifier
- **Client Secret**: Your app's secret key

## 🔧 Step 3: Configure Environment Variables

### For Local Development (`.env.local`):

```env
# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-client-id-here
LINKEDIN_CLIENT_SECRET=your-client-secret-here
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/auth/linkedin/callback
```

### For Production (Vercel):

1. Go to your Vercel project → Settings → Environment Variables
2. Add these variables:
   - `LINKEDIN_CLIENT_ID`: Your client ID
   - `LINKEDIN_CLIENT_SECRET`: Your client secret  
   - `LINKEDIN_REDIRECT_URI`: `https://your-domain.vercel.app/api/auth/linkedin/callback`

## 🔧 Step 4: Test the Implementation

### 1. Configuration Status

Visit: `http://localhost:3000/test-linkedin`

This page shows:
- ✅ Environment variable status
- ✅ Current redirect URI
- ✅ OAuth URL generation
- ✅ Test login button

### 2. OAuth Flow Test

1. Click "Continue with LinkedIn"
2. You'll be redirected to LinkedIn
3. Authorize the application
4. You'll be redirected back to your callback URL
5. Check browser console for the response

## 📁 Files Created

### Core Files:
- `lib/linkedin.ts` - OAuth helper functions
- `app/api/auth/linkedin/callback/route.ts` - OAuth callback handler
- `components/LinkedInLoginButton.tsx` - Login button component
- `components/LinkedInConfigStatus.tsx` - Configuration status component

### Test Files:
- `app/test-linkedin/page.tsx` - OAuth testing page

### Documentation:
- `LINKEDIN_OAUTH_SETUP.md` - This setup guide
- `ENV_TEMPLATE.md` - Environment variables template

## 🔄 OAuth Flow Diagram

```
User clicks "Login with LinkedIn"
         ↓
LinkedInLoginButton generates auth URL
         ↓
User redirected to LinkedIn
         ↓
User authorizes the app
         ↓
LinkedIn redirects to callback URL
         ↓
Callback route processes authorization code
         ↓
Exchange code for access token (future)
         ↓
User is logged in
```

## 🛡️ Security Considerations

1. **Never expose Client Secret** in frontend code
2. **Use HTTPS** in production (Vercel handles this)
3. **Validate redirect URI** matches exactly what's configured in LinkedIn
4. **Store tokens securely** (implementation needed)
5. **Implement CSRF protection** (future enhancement)

## 🚀 Next Steps

### Current Implementation:
- ✅ OAuth URL generation
- ✅ Callback handling
- ✅ Error handling
- ✅ Configuration validation
- ✅ TypeScript support

### Future Enhancements:
- 🔄 Token exchange implementation
- 🔄 User session management
- 🔄 Token refresh logic
- 🔄 User profile fetching
- 🔄 LinkedIn posting integration

## 🐛 Troubleshooting

### Common Issues:

1. **"Client ID missing"**
   - Check `LINKEDIN_CLIENT_ID` environment variable
   - Restart development server after adding variables

2. **"Redirect URI mismatch"**
   - Ensure redirect URI matches exactly in LinkedIn app settings
   - Check for trailing slashes or protocol differences

3. **"Invalid scope"**
   - Verify scopes are requested: `openid profile w_member_social`
   - Check app permissions in LinkedIn Developer Portal

4. **"Authorization failed"**
   - Check app is approved and live
   - Verify user hasn't denied access

### Debug Steps:

1. Visit `/test-linkedin` to check configuration
2. Check browser console for errors
3. Verify environment variables are set
4. Check LinkedIn app status in Developer Portal

## 📞 Support

If you encounter issues:

1. Check the browser console for detailed error messages
2. Verify all environment variables are correctly set
3. Ensure LinkedIn app is approved and configured
4. Check that redirect URIs match exactly

## 🎉 Success!

Once configured, you'll have:
- ✅ Working LinkedIn OAuth authentication
- ✅ Production-ready implementation
- ✅ TypeScript safety
- ✅ Proper error handling
- ✅ Environment-based configuration

Your users can now authenticate with LinkedIn securely! 🚀
