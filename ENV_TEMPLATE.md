# Environment Variables Template
# Copy this to .env.local for local development

# AI & Content Generation
GEMINI_API_KEY=your-gemini-api-key-here
UNSPLASH_ACCESS_KEY=your-unsplash-access-key-here

# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=your-linkedin-client-id-here
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret-here
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/auth/linkedin/callback

# For Production (Vercel), update the redirect URI to:
# LINKEDIN_REDIRECT_URI=https://your-domain.vercel.app/api/auth/linkedin/callback

# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# LinkedIn Posting (Optional)
LINKEDIN_ACCESS_TOKEN=your-linkedin-access-token-here
LINKEDIN_USER_ID=your-linkedin-user-id-here

# Blog Configuration
BLOG_BASE_URL=http://localhost:3000
NEXT_PUBLIC_BLOG_NAME=CCAIP Daily
