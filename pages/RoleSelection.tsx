import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../state/SettingsContext';

const RoleSelection: React.FC = () => {
  const { setUserRole } = useSettings();
  const navigate = useNavigate();

  const handleSelect = (role: 'boss' | 'pa') => {
    setUserRole(role);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 space-y-8">
       <div className="text-center space-y-2">
          <h1 className="text-3xl text-white font-light tracking-widest uppercase">Select Access Mode</h1>
          <p className="text-gray-500 text-sm">Choose your interface view</p>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* BOSS CARD */}
          <button 
             onClick={() => handleSelect('boss')}
             className="group relative h-64 bg-gray-900 border border-gray-800 rounded-2xl flex flex-col items-center justify-center hover:bg-gray-800 hover:border-blue-500 transition-all duration-300 active:scale-95"
          >
             <div className="absolute inset-0 bg-blue-900/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"></div>
             <svg className="w-16 h-16 text-gray-500 group-hover:text-blue-400 mb-4 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
             </svg>
             <span className="text-2xl font-bold text-white tracking-widest group-hover:text-blue-400">BOSS VIEW</span>
             <span className="text-xs text-gray-500 mt-2 font-medium">Read Only • No Controls</span>
          </button>

          {/* PA CARD */}
          <button 
             onClick={() => handleSelect('pa')}
             className="group relative h-64 bg-gray-900 border border-gray-800 rounded-2xl flex flex-col items-center justify-center hover:bg-gray-800 hover:border-green-500 transition-all duration-300 active:scale-95"
          >
             <div className="absolute inset-0 bg-green-900/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"></div>
             <svg className="w-16 h-16 text-gray-500 group-hover:text-green-400 mb-4 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
             <span className="text-2xl font-bold text-white tracking-widest group-hover:text-green-400">PA CONTROL</span>
             <span className="text-xs text-gray-500 mt-2 font-medium">Full Access • Settings</span>
          </button>
       </div>
    </div>
  );
};
export default RoleSelection;