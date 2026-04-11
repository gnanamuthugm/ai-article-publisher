import { NextRequest, NextResponse } from 'next/server';

/**
 * LinkedIn OAuth Callback Handler
 * Handles the redirect from LinkedIn after user authorization
 */

export async function GET(request: NextRequest) {
  try {
    // Extract authorization code from query parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle authorization errors
    if (error) {
      console.error('LinkedIn OAuth Error:', error, errorDescription);
      return NextResponse.json({
        success: false,
        error: error,
        errorDescription: errorDescription,
        message: 'Authorization failed'
      }, { status: 400 });
    }

    // Validate authorization code
    if (!code) {
      console.error('LinkedIn OAuth: No authorization code received');
      return NextResponse.json({
        success: false,
        error: 'no_code',
        message: 'No authorization code received'
      }, { status: 400 });
    }

    // Log successful authorization (for debugging)
    console.log('LinkedIn OAuth: Authorization code received successfully');
    console.log('Code length:', code.length);

    // TODO: Exchange code for access token
    // This is where you would:
    // 1. Exchange the authorization code for an access token
    // 2. Store the token securely
    // 3. Redirect user to the appropriate page

    // For now, return success response with the code
    return NextResponse.json({
      success: true,
      code: code,
      message: 'Authorization code received successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LinkedIn OAuth Callback Error:', error);
    return NextResponse.json({
      success: false,
      error: 'internal_error',
      message: 'Internal server error during OAuth callback'
    }, { status: 500 });
  }
}

/**
 * Handle POST requests for token exchange (future implementation)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'missing_code',
        message: 'Authorization code is required'
      }, { status: 400 });
    }

    // TODO: Implement token exchange logic
    // This would involve:
    // 1. Making a POST request to LinkedIn's token endpoint
    // 2. Exchanging the authorization code for an access token
    // 3. Returning the access token to the client

    return NextResponse.json({
      success: false,
      error: 'not_implemented',
      message: 'Token exchange not yet implemented'
    }, { status: 501 });

  } catch (error) {
    console.error('LinkedIn OAuth POST Error:', error);
    return NextResponse.json({
      success: false,
      error: 'internal_error',
      message: 'Internal server error'
    }, { status: 500 });
  }
}
