import React, { useState } from 'react';
import { useSettings } from '../../../state/SettingsContext';

const FlashMessageControl: React.FC = () => {
  const { flashMessage, updateFlashMessage } = useSettings();
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      updateFlashMessage(input.trim());
      setInput('');
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    updateFlashMessage('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {!isOpen && !flashMessage && (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full border border-gray-700 transition-colors text-xs font-medium"
        >
          <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          Msg
        </button>
      )}

      {/* Active Message Indicator / Clear Button */}
      {!isOpen && flashMessage && (
         <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-full pl-3 pr-1 py-1">
             <span className="text-yellow-500 text-xs font-bold uppercase tracking-wider">Live:</span>
             <span className="text-gray-300 text-xs truncate max-w-[150px]">{flashMessage}</span>
             <button 
               onClick={handleClear}
               className="ml-2 p-1 bg-yellow-900/50 hover:bg-yellow-800 rounded-full text-yellow-200"
               title="Clear Message"
             >
               <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
         </div>
      )}

      {/* Input Form Popup */}
      {isOpen && (
        <div className="absolute top-0 right-0 mt-0 w-80 bg-gray-900 border border-yellow-600/50 shadow-xl rounded-lg p-3 z-50">
           <form onSubmit={handleSend} className="flex flex-col gap-2">
              <label className="text-xs font-bold text-yellow-500 uppercase">Send Ticker Message</label>
              <input 
                autoFocus
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type message for Boss..."
                className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white focus:border-yellow-500 outline-none"
              />
              <div className="flex justify-end gap-2 mt-1">
                 <button 
                   type="button" 
                   onClick={() => setIsOpen(false)}
                   className="text-xs text-gray-400 hover:text-white px-3 py-1"
                 >
                   Cancel
                 </button>
                 <button 
                   type="submit"
                   disabled={!input.trim()}
                   className="bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50"
                 >
                   Send
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default FlashMessageControl;