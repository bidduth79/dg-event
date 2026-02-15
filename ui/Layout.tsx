import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useSettings } from '../state/SettingsContext';
import { formatDate } from '../core/time/timeUtils';

const Layout: React.FC = () => {
  const { userRole } = useSettings();
  const routerNavigate = useNavigate();

  // Redirect to role selection if no role is set
  if (!userRole) {
    return <Navigate to="/role-select" replace />;
  }

  return (
    <div className="h-screen text-gray-100 font-sans flex flex-col overflow-hidden relative">
      
      {/* Global Background Image Layer */}
       <div 
         className="absolute inset-0 z-0"
         style={{ 
            backgroundImage: "url('./bg.jpeg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
         }}
       >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
       </div>

      {/* Floating Settings Button - ONLY VISIBLE TO PA */}
      {userRole === 'pa' && (
        <Link 
          to="/settings" 
          className="absolute top-4 right-6 z-50 p-2.5 bg-gray-900/50 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-all backdrop-blur-sm border border-gray-800"
          title="Settings"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative z-10">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;