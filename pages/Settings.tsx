import React, { useState, useEffect } from 'react';
import { useSettings } from '../state/SettingsContext';
import { useAuth } from '../auth/AuthContext';
import { APP_CONFIG } from '../core/config/constants';
import { useNavigate } from 'react-router-dom';
import { playEndingTone, speakText, getProfessionalVoices } from '../core/sound/soundUtils';

const Settings: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const { 
    blinkEnabled, toggleBlink, 
    setUserRole, userRole,
    soundEnabledBoss, toggleSoundBoss,
    soundEnabledPA, toggleSoundPA,
    voiceEnabled, toggleVoice,
    voiceURI, setVoiceURI
  } = useSettings();
  const navigate = useNavigate();

  // State for Client ID Configuration
  const [clientId, setClientId] = useState(() => localStorage.getItem('google_client_id') || '');
  const [isSaved, setIsSaved] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load voices on mount
  useEffect(() => {
    const loadVoices = () => {
        const voices = getProfessionalVoices();
        setAvailableVoices(voices);
    };

    loadVoices();
    
    // Voices load asynchronously in Chrome
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleSaveClientId = () => {
    const trimmed = clientId.trim();
    setClientId(trimmed); // Update UI with trimmed value
    if (trimmed) {
      localStorage.setItem('google_client_id', trimmed);
    } else {
      localStorage.removeItem('google_client_id');
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleGoogleLogin = () => {
    const effectiveClientId = (APP_CONFIG.GOOGLE_CLIENT_ID || localStorage.getItem('google_client_id') || '').trim();
    
    if (!effectiveClientId) {
      alert("Please save a Google Client ID first.");
      return;
    }

    const currentRedirectUri = window.location.origin + window.location.pathname; 
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

  const handleResetRole = () => {
    setUserRole(null);
    navigate('/role-select');
  };

  // Helper to test sound
  const testSound = () => {
    playEndingTone();
  };
  
  const testVoice = () => {
     speakText("This is your virtual assistant. System is ready.", voiceURI);
  };
  
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setVoiceURI(e.target.value);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 bg-white min-h-full">
      
      <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-4">
            <h1 className="text-2xl font-normal text-gray-800">Settings</h1>
            <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-medium text-gray-500 uppercase">
                {userRole === 'pa' ? 'PA Control' : 'Boss View'}
            </div>
        </div>
        
        {/* CLOSE BUTTON */}
        <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
        >
            <span className="text-sm font-bold">CLOSE</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>

      {/* 1. CONNECTION & AUTH SECTION */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-700 border-b border-gray-200 pb-2">
           Account & Connection
        </h2>
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          
          {/* Client ID Input */}
          <div className="mb-6 max-w-xl">
            <label className="block text-sm font-medium text-gray-700 mb-2">Google Client ID</label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter Client ID"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
              <button 
                onClick={handleSaveClientId}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  isSaved ? 'bg-green-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Required to connect to Google Calendar API.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-700">
              {isAuthenticated ? 'Connected to Google' : 'Not Connected'}
            </span>

            {!isAuthenticated ? (
              <button
                onClick={handleGoogleLogin}
                className="ml-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
              >
                Sign In with Google
              </button>
            ) : (
              <button
                onClick={logout}
                className="ml-auto border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium py-2 px-4 rounded transition-colors"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. VIEW & NOTIFICATIONS */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-700 border-b border-gray-200 pb-2">
          View & Notifications
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Blink Toggle */}
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
             <div>
               <h3 className="text-sm font-medium text-gray-800">Expired Event Blinking</h3>
               <p className="text-xs text-gray-500">Pulse animation for past events</p>
             </div>
             <button 
                onClick={toggleBlink}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${blinkEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${blinkEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
          </div>

          {/* Sound: Boss View */}
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
             <div>
               <h3 className="text-sm font-medium text-gray-800">Boss View Tone</h3>
               <p className="text-xs text-gray-500">Play tone when event ends (Boss screen)</p>
             </div>
             <button 
                onClick={toggleSoundBoss}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${soundEnabledBoss ? 'bg-green-600' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${soundEnabledBoss ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
          </div>

          {/* Sound: PA View */}
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
             <div>
               <h3 className="text-sm font-medium text-gray-800">PA View Tone</h3>
               <p className="text-xs text-gray-500">Play tone when event ends (PA screen)</p>
             </div>
             <button 
                onClick={toggleSoundPA}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${soundEnabledPA ? 'bg-green-600' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${soundEnabledPA ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
          </div>

          {/* Voice Assistant Configuration */}
          <div className="col-span-1 md:col-span-2 flex flex-col p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm gap-4 transition-all duration-300">
             <div className="flex items-center justify-between">
                <div>
                   <h3 className="text-sm font-bold text-blue-900">Voice Assistant (Jarvis Mode)</h3>
                   <p className="text-xs text-blue-700">Announce upcoming event names automatically</p>
                </div>
                <button 
                    onClick={toggleVoice}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none z-10 ${voiceEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                    title={voiceEnabled ? "Turn Off Voice" : "Turn On Voice"}
                >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${voiceEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
             </div>

             {/* Voice Model Selector */}
             {voiceEnabled && (
                 <div className="mt-2 border-t border-blue-200 pt-3 animate-fade-in">
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-blue-800">Select Voice Model</label>
                        <span className="text-[10px] text-blue-600 font-mono">{availableVoices.length} voices found</span>
                    </div>
                    <select 
                        value={voiceURI}
                        onChange={handleVoiceChange}
                        className="w-full bg-white border border-blue-300 text-gray-800 text-sm rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">Default System Voice</option>
                        {availableVoices.map(v => (
                            <option key={v.voiceURI} value={v.voiceURI}>
                                {v.name} ({v.lang})
                            </option>
                        ))}
                    </select>
                 </div>
             )}
          </div>
          
           {/* Test Sound Button */}
           <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
             <div>
               <h3 className="text-sm font-medium text-gray-800">Sound Check</h3>
               <p className="text-xs text-gray-500">Preview sounds</p>
             </div>
             <div className="flex gap-2">
               <button 
                  onClick={testSound}
                  className="px-3 py-1 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Test Tone
                </button>
                <button 
                  onClick={testVoice}
                  className="px-3 py-1 text-xs font-bold text-white bg-blue-600 border border-blue-600 rounded hover:bg-blue-700"
                >
                  Test Voice
                </button>
             </div>
          </div>

          {/* Role Reset */}
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
             <div>
               <h3 className="text-sm font-medium text-gray-800">Reset Access Mode</h3>
               <p className="text-xs text-gray-500">Go back to Boss/PA selection screen</p>
             </div>
             <button 
                onClick={handleResetRole}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Reset Role
              </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;