import React from 'react';
import { formatDate } from '../../../core/time/timeUtils';
import FlashMessageControl from './FlashMessageControl';

interface DashboardHeaderProps {
  currentTime: Date;
  lastUpdated?: Date | null;
  onRefresh: () => void;
  loading: boolean;
  readOnly?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ currentTime, lastUpdated, onRefresh, loading, readOnly }) => {
  return (
    <header className="flex-none flex justify-between items-center px-8 py-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md relative z-40">
      <div>
        <h1 className="text-3xl font-light text-white tracking-wide">
          {formatDate(currentTime)}
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-gray-400 text-sm uppercase tracking-widest">
             {readOnly ? 'Boss View' : 'Event Dashboard'}
          </p>
          
          <div className="h-4 w-px bg-gray-700 mx-1"></div>

          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Last synced: {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}

          {!readOnly && (
            <div className="flex items-center gap-2">
                <button 
                  onClick={onRefresh}
                  disabled={loading}
                  className={`ml-1 p-1.5 rounded-full hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Sync with Google Calendar"
                >
                  <svg 
                    className={`w-4 h-4 text-blue-500 ${loading ? 'animate-spin' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                
                {/* PA FLASH MESSAGE CONTROL */}
                <div className="ml-2 pl-2 border-l border-gray-800">
                   <FlashMessageControl />
                </div>
            </div>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="text-5xl font-bold text-blue-500 font-mono tracking-tighter">
          {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' ', '')}
          <span className="text-xl text-gray-500 ml-1">
            {currentTime.toLocaleTimeString('en-US', { hour12: true }).slice(-2)}
          </span>
        </div>
      </div>
    </header>
  );
};

export default React.memo(DashboardHeader);