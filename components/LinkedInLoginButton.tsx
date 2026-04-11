'use client';

import { useState } from 'react';
import { getLinkedInAuthUrl, validateLinkedInConfig } from '@/lib/linkedin';

interface LinkedInLoginButtonProps {
  className?: string;
  onLoginStart?: () => void;
  onLoginError?: (error: string) => void;
}

export default function LinkedInLoginButton({ 
  className = '', 
  onLoginStart,
  onLoginError 
}: LinkedInLoginButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLinkedInLogin = async () => {
    try {
      // Validate configuration
      if (!validateLinkedInConfig()) {
        const error = 'LinkedIn OAuth is not properly configured. Please check environment variables.';
        console.error(error);
        onLoginError?.(error);
        return;
      }

      setLoading(true);
      onLoginStart?.();

      // Generate OAuth URL
      const authUrl = getLinkedInAuthUrl();
      
      // Redirect to LinkedIn authorization
      window.location.href = authUrl;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate LinkedIn login';
      console.error('LinkedIn login error:', error);
      onLoginError?.(errorMessage);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLinkedInLogin}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Connecting to LinkedIn...</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
          </svg>
          <span>Continue with LinkedIn</span>
        </>
      )}
    </button>
  );
}
