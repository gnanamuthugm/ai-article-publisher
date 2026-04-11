/**
 * LinkedIn OAuth Helper Functions
 * Handles authentication URL generation and OAuth flow
 */

/**
 * Generate LinkedIn OAuth authorization URL
 * @returns {string} The complete authorization URL
 */
export function getLinkedInAuthUrl(): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || clientId.includes('your-linkedin-client-id-here')) {
    throw new Error('Please set your actual LINKEDIN_CLIENT_ID - replace placeholder with real LinkedIn Client ID');
  }

  if (!redirectUri) {
    throw new Error('LINKEDIN_REDIRECT_URI environment variable is required');
  }

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI!)}&scope=w_member_social`;

  return authUrl;
}

/**
 * Validate LinkedIn OAuth configuration
 * @returns {boolean} True if all required environment variables are set
 */
export function validateLinkedInConfig(): boolean {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  return !!(
    clientId &&
    clientSecret &&
    redirectUri &&
    !clientId.includes('your-linkedin-client-id-here') &&
    !clientSecret.includes('your-linkedin-client-secret-here')
  );
}

/**
 * Get LinkedIn OAuth configuration status
 * @returns {object} Configuration status with missing variables
 */
export function getLinkedInConfigStatus() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  return {
    clientId: !!(clientId && !clientId.includes('your-linkedin-client-id-here')),
    clientSecret: !!(clientSecret && !clientSecret.includes('your-linkedin-client-secret-here')),
    redirectUri: !!redirectUri,
    isValid: validateLinkedInConfig(),
  };
}
