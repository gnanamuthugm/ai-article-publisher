import LinkedInLoginButton from '@/components/LinkedInLoginButton';
import LinkedInConfigStatus from '@/components/LinkedInConfigStatus';
import { getLinkedInAuthUrl } from '@/lib/linkedin';

export default function TestLinkedInPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">LinkedIn OAuth Test</h1>
          
          <LinkedInConfigStatus />
          
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Test LinkedIn Login</h2>
            
            <div className="space-y-4">
              <LinkedInLoginButton
                onLoginStart={() => console.log('LinkedIn login started')}
                onLoginError={(error) => alert(`Login Error: ${error}`)}
              />
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">OAuth Flow Test:</h3>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Click the LinkedIn login button above</li>
                  <li>Authorize the application on LinkedIn</li>
                  <li>You'll be redirected to the callback URL</li>
                  <li>Check the response in your browser console</li>
                </ol>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Debug Information:</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Auth URL:</strong></p>
                  <code className="block bg-white p-2 rounded border text-xs break-all">
                    {getLinkedInAuthUrl()}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
