'use client';

import { useEffect, useState } from 'react';
import { getLinkedInConfigStatus } from '@/lib/linkedin';

export default function LinkedInConfigStatus() {
  const [config, setConfig] = useState(getLinkedInConfigStatus());

  useEffect(() => {
    setConfig(getLinkedInConfigStatus());
  }, []);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-gray-800 mb-3">LinkedIn OAuth Configuration Status</h3>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${config.clientId ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm text-gray-700">Client ID: {config.clientId ? '✅ Set' : '❌ Missing'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${config.clientSecret ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm text-gray-700">Client Secret: {config.clientSecret ? '✅ Set' : '❌ Missing'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${config.redirectUri ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm text-gray-700">Redirect URI: {config.redirectUri ? '✅ Set' : '❌ Missing'}</span>
        </div>
      </div>

      {config.redirectUri && (
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
          <strong>Current Redirect URI:</strong> {config.redirectUri}
        </div>
      )}

      {!config.isValid && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <strong>⚠️ Configuration Required:</strong>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>Add missing environment variables to your <code>.env.local</code> file</li>
            <li>For Vercel deployment, add them to Environment Variables settings</li>
            <li>Restart the development server after adding variables</li>
          </ul>
        </div>
      )}

      {isDevelopment && (
        <div className="mt-3 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <strong>Development Mode:</strong> Using localhost redirect URI
        </div>
      )}
    </div>
  );
}
