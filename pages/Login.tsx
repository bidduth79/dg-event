import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '../core/config/constants';

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [tokenInput, setTokenInput] = useState('');
  
  // Manage Client ID: use config or local storage/user input
  const [customClientId, setCustomClientId] = useState(() => {
    return localStorage.getItem('google_client_id') || '';
  });

  // Trim the ID to prevent space-related errors
  const effectiveClientId = (APP_CONFIG.GOOGLE_CLIENT_ID || customClientId).trim();
  
  // Basic validation to check if it looks like a Google Client ID
  const isValidFormat = effectiveClientId.length === 0 || effectiveClientId.endsWith('.apps.googleusercontent.com');

  // Calculate the exact Redirect URI being used
  const currentRedirectUri = window.location.origin + window.location.pathname;

  // Effect: Handle Google OAuth Redirect (Parse Token from URL Hash)
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = () => {
    if (!effectiveClientId) {
      alert("Please enter a valid Google Client ID to proceed.");
      return;
    }
    
    if (!isValidFormat) {
      const confirm = window.confirm("The Client ID format looks incorrect. It usually ends with '.apps.googleusercontent.com'. Are you sure you want to proceed?");
      if (!confirm) return;
    }
    
    // Save to local storage if it's a custom input
    if (!APP_CONFIG.GOOGLE_CLIENT_ID && customClientId) {
      localStorage.setItem('google_client_id', effectiveClientId);
    }
    
    const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
    
    const params = {
      'client_id': effectiveClientId,
      'redirect_uri': currentRedirectUri,
      'response_type': 'token',
      'scope': APP_CONFIG.SCOPES,
      'include_granted_scopes': 'true',
      'state': 'google_auth_attempt'
    };

    const authUrl = `${oauth2Endpoint}?${new URLSearchParams(params).toString()}`;
    window.location.href = authUrl;
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      login(tokenInput.trim());
      navigate('/');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard! Add this to Google Cloud Console.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image Layer */}
       <div 
         className="absolute inset-0 z-0"
         style={{ 
            backgroundImage: "url('/bg.jpeg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
         }}
       >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
       </div>

      <div className="max-w-md w-full bg-gray-900/80 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-gray-700 relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Expired Blink Focus</h1>
          <p className="text-gray-400">Connect your Google Calendar</p>
        </div>

        {/* --- ERROR FIX HELPER SECTION --- */}
        <div className="space-y-4 mb-6">
           {/* Invalid Client ID Warning */}
           {!isValidFormat && (
             <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 animate-pulse">
                <h3 className="text-xs font-bold text-red-200 uppercase tracking-wide mb-1">
                  Possible Config Error
                </h3>
                <p className="text-xs text-red-100">
                  Your Client ID does not end with <code>.apps.googleusercontent.com</code>. Double check you didn't copy the "Client Secret" by mistake.
                </p>
             </div>
           )}

          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
            <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wide mb-1">
              Setup Requirements
            </h3>
            <p className="text-xs text-gray-300 mb-2">
              1. Create Project at <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline text-blue-400">Google Cloud Console</a>.<br/>
              2. Create <strong>OAuth Client ID</strong> (Web Application).<br/>
              3. Add this URL to <strong>Authorized redirect URIs</strong>:
            </p>
            <div className="flex gap-2">
              <input 
                readOnly 
                value={currentRedirectUri} 
                className="flex-1 bg-black/50 text-gray-300 text-xs p-2 rounded border border-gray-600 focus:outline-none font-mono"
              />
              <button 
                onClick={() => copyToClipboard(currentRedirectUri)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1 rounded font-medium transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {!APP_CONFIG.GOOGLE_CLIENT_ID && (
            <div className="bg-blue-900/20 border border-blue-800 p-3 rounded-lg space-y-2">
              <label className="block text-xs font-bold text-blue-300 uppercase tracking-wide">
                Google Client ID
              </label>
              <input
                type="text"
                value={customClientId}
                onChange={(e) => setCustomClientId(e.target.value)}
                placeholder="e.g., 123...apps.googleusercontent.com"
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white focus:border-blue-500 outline-none font-mono"
              />
              <p className="text-[10px] text-gray-400">
                Paste the ID exactly as shown in Google Cloud Console.
              </p>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={!effectiveClientId}
            className="w-full flex justify-center items-center gap-3 bg-white text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div className="relative">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
             <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-800 text-gray-500">Manual Entry</span></div>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Access Token (Optional)"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!tokenInput}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Enter Dashboard
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;