import React from 'react';
import { useSettings } from '../../state/SettingsContext';
import { startOfYear, addDays } from '../../core/time/timeUtils';

const YearGrid: React.FC = () => {
  const { viewDate, setViewDate, setViewMode } = useSettings();
  
  const year = viewDate.getFullYear();
  const yearStart = startOfYear(viewDate);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1);
    return d;
  });

  const handleDayClick = (date: Date) => {
    setViewDate(date);
    setViewMode('day');
  };

  const renderMonth = (monthDate: Date) => {
    const monthIndex = monthDate.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const startDay = firstDay.getDay(); 
    const startDate = addDays(firstDay, -startDay);
    
    const days = Array.from({ length: 42 }, (_, i) => addDays(startDate, i));

    return (
      <div key={monthIndex} className="p-2">
         <h3 className="text-sm font-medium text-gray-300 mb-2 pl-2">
           {monthDate.toLocaleString('default', { month: 'long' })}
         </h3>
         <div className="grid grid-cols-7 text-[10px] text-gray-600 mb-1 text-center">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
         </div>
         <div className="grid grid-cols-7 gap-y-1 text-center">
            {days.map((d, i) => {
               const isCurrentMonth = d.getMonth() === monthIndex;
               if (!isCurrentMonth) return <div key={i} />;
               
               const isToday = d.toDateString() === new Date().toDateString();

               return (
                 <div 
                   key={i} 
                   onClick={() => handleDayClick(d)}
                   className={`w-6 h-6 mx-auto flex items-center justify-center rounded-full text-[10px] cursor-pointer hover:bg-gray-800
                     ${isToday ? 'bg-blue-600 text-white font-bold' : 'text-gray-400'}
                   `}
                 >
                   {d.getDate()}
                 </div>
               );
            })}
         </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-4 text-gray-300">
       <div className="max-w-6xl mx-auto">
          <div className="text-2xl font-normal text-gray-300 mb-6 border-b border-gray-800 pb-4">
            {year}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
             {months.map(m => renderMonth(m))}
          </div>
       </div>
    </div>
  );
};

export default YearGrid;