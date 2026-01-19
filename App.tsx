import React, { useState, useEffect, useMemo } from 'react';
import { DailyRecord } from './types';
import { analyzeMilkData } from './services/geminiService';
import { StatCard } from './components/StatCard';
import { 
  Calendar, 
  IndianRupee, 
  Calculator, 
  Bot, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Check,
  X,
  MessageSquare
} from 'lucide-react';

// Helpers
const getTodayString = () => new Date().toISOString().split('T')[0];
const getMonthString = (date: Date) => date.toLocaleString('gu-IN', { month: 'long', year: 'numeric' });
const formatDateDisplay = (date: Date) => date.toLocaleDateString('gu-IN', { weekday: 'long', day: 'numeric', month: 'long' });

const App: React.FC = () => {
  // State
  const [records, setRecords] = useState<DailyRecord[]>([]);
  // Prices (Per Day)
  const [cowPrice, setCowPrice] = useState<number>(60);
  const [buffaloPrice, setBuffaloPrice] = useState<number>(80);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Load data & Migrate old data if necessary
  useEffect(() => {
    const savedRecords = localStorage.getItem('milkRecords');
    if (savedRecords) {
      const parsed = JSON.parse(savedRecords);
      // Migration: Convert old qty-based records to boolean
      const migrated = parsed.map((r: any) => {
        // If it already has boolean properties, use them
        if (typeof r.cow === 'boolean') return r;
        
        // Convert old number/qty format to boolean
        return {
          date: r.date,
          cow: (r.cowQty > 0 || r.quantity > 0) ? true : false,
          buffalo: (r.buffaloQty > 0) ? true : false,
          cowReason: '',
          buffaloReason: ''
        };
      });
      setRecords(migrated);
    }
    
    const savedCowPrice = localStorage.getItem('cowPrice');
    if (savedCowPrice) setCowPrice(Number(savedCowPrice));
    
    const savedBuffaloPrice = localStorage.getItem('buffaloPrice');
    if (savedBuffaloPrice) setBuffaloPrice(Number(savedBuffaloPrice));
  }, []);

  // Save data on change
  useEffect(() => {
    localStorage.setItem('milkRecords', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('cowPrice', String(cowPrice));
    localStorage.setItem('buffaloPrice', String(buffaloPrice));
  }, [cowPrice, buffaloPrice]);

  // Handlers
  const selectedDateStr = useMemo(() => selectedDate.toISOString().split('T')[0], [selectedDate]);
  
  const getRecord = (dateStr: string) => records.find(r => r.date === dateStr) || { date: dateStr, cow: false, buffalo: false, cowReason: '', buffaloReason: '' };

  const toggleRecord = (dateStr: string, type: 'cow' | 'buffalo', value: boolean) => {
    setRecords(prev => {
      const existingIndex = prev.findIndex(r => r.date === dateStr);
      let newRecord;
      
      if (existingIndex >= 0) {
        const current = prev[existingIndex];
        newRecord = {
          ...current,
          [type]: value,
          // If turning ON (true), clear the reason for NOT taking it? 
          // Maybe keep it just in case they toggle back. Let's keep it but UI won't show it.
        };
        const newRecords = [...prev];
        newRecords[existingIndex] = newRecord;
        return newRecords;
      } else {
        newRecord = {
          date: dateStr,
          cow: type === 'cow' ? value : false,
          buffalo: type === 'buffalo' ? value : false,
          cowReason: '',
          buffaloReason: ''
        };
        return [...prev, newRecord];
      }
    });
  };

  const handleReasonChange = (dateStr: string, type: 'cow' | 'buffalo', reason: string) => {
    setRecords(prev => {
      const existingIndex = prev.findIndex(r => r.date === dateStr);
      if (existingIndex >= 0) {
        const current = prev[existingIndex];
        const newRecord = { ...current, [type === 'cow' ? 'cowReason' : 'buffaloReason']: reason };
        const newRecords = [...prev];
        newRecords[existingIndex] = newRecord;
        return newRecords;
      } else {
        return [...prev, {
          date: dateStr,
          cow: false,
          buffalo: false,
          [type === 'cow' ? 'cowReason' : 'buffaloReason']: reason
        }];
      }
    });
  };

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    setAiInsight('');
    
    const currentYear = selectedDate.getFullYear();
    const currentMonth = selectedDate.getMonth();
    
    const monthRecords = records.filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const monthName = getMonthString(selectedDate);
    const result = await analyzeMilkData(monthRecords, cowPrice, buffaloPrice, monthName);
    
    setAiInsight(result);
    setLoadingAi(false);
  };

  // Stats
  const currentMonthStats = useMemo(() => {
    const currentYear = selectedDate.getFullYear();
    const currentMonth = selectedDate.getMonth();
    
    const relevantRecords = records.filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const totalCowDays = relevantRecords.filter(r => r.cow).length;
    const totalBuffaloDays = relevantRecords.filter(r => r.buffalo).length;
    const totalCost = (totalCowDays * cowPrice) + (totalBuffaloDays * buffaloPrice);
    
    // Unique days where at least one milk was taken
    const activeDays = relevantRecords.filter(r => r.cow || r.buffalo).length;

    return { totalCowDays, totalBuffaloDays, totalCost, activeDays };
  }, [records, selectedDate, cowPrice, buffaloPrice]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    newDate.setDate(1); 
    setSelectedDate(newDate);
    setAiInsight('');
  };

  // Calendar Helpers
  const daysInMonth = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [selectedDate]);

  const currentRecord = getRecord(selectedDateStr);

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4 sticky top-0 z-20 shadow-md">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Check className="w-6 h-6 text-white" />
            <h1 className="text-xl font-bold">દૂધનો હિસાબ</h1>
          </div>
          <button 
            onClick={() => setShowConfig(!showConfig)} 
            className={`p-2 rounded-full transition ${showConfig ? 'bg-white text-indigo-600' : 'bg-indigo-700 hover:bg-indigo-800'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        {/* Settings Dropdown */}
        {showConfig && (
          <div className="max-w-md mx-auto mt-4 bg-white text-gray-800 p-4 rounded-xl shadow-xl animate-fade-in-down border border-indigo-100">
            <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">રોજનો ફિક્સ ભાવ (Daily Price)</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">ગાય (Cow)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400">₹</span>
                  <input 
                    type="number" 
                    value={cowPrice} 
                    onChange={(e) => setCowPrice(Number(e.target.value))}
                    className="w-full pl-6 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-700 mb-1">ભેંસ (Buffalo)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400">₹</span>
                  <input 
                    type="number" 
                    value={buffaloPrice} 
                    onChange={(e) => setBuffaloPrice(Number(e.target.value))}
                    className="w-full pl-6 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
            <button 
              onClick={() => setShowConfig(false)}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700"
            >
              સાચવો (Save)
            </button>
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Date Selector / Month Nav */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 flex justify-between items-center">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-bold text-gray-800">{getMonthString(selectedDate)}</h2>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
        </section>

        {/* Input Card for Selected Date */}
        <section className="bg-white rounded-2xl shadow-lg border border-indigo-50 overflow-hidden">
          <div className="bg-indigo-50 p-3 text-center border-b border-indigo-100">
            <p className="text-indigo-900 font-medium">
              {formatDateDisplay(selectedDate)}
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            
            {/* Cow Input */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-green-500"></div>
                   <span className="font-bold text-gray-800">ગાય (Cow)</span>
                </div>
                <span className="text-xs text-gray-500">₹{cowPrice}/દિવસ</span>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => toggleRecord(selectedDateStr, 'cow', true)}
                  className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                    currentRecord.cow 
                    ? 'bg-green-500 border-green-500 text-white shadow-md' 
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  <span className="font-bold">હા (લીધું)</span>
                </button>
                <button 
                  onClick={() => toggleRecord(selectedDateStr, 'cow', false)}
                  className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                    !currentRecord.cow 
                    ? 'bg-gray-100 border-gray-300 text-gray-700 shadow-inner' 
                    : 'bg-white border-gray-100 text-gray-400'
                  }`}
                >
                  <X className="w-5 h-5" />
                  <span className="font-medium">ના (નથી)</span>
                </button>
              </div>

              {/* Reason Input for Cow - Visible only when NO is selected */}
              {!currentRecord.cow && (
                <div className="animate-fade-in-down">
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="કારણ? (દા.ત. બહારગામ)"
                      value={currentRecord.cowReason || ''}
                      onChange={(e) => handleReasonChange(selectedDateStr, 'cow', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-300 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-gray-100"></div>

            {/* Buffalo Input */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                   <span className="font-bold text-gray-800">ભેંસ (Buffalo)</span>
                </div>
                <span className="text-xs text-gray-500">₹{buffaloPrice}/દિવસ</span>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => toggleRecord(selectedDateStr, 'buffalo', true)}
                  className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                    currentRecord.buffalo 
                    ? 'bg-blue-500 border-blue-500 text-white shadow-md' 
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  <span className="font-bold">હા (લીધું)</span>
                </button>
                <button 
                  onClick={() => toggleRecord(selectedDateStr, 'buffalo', false)}
                  className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                    !currentRecord.buffalo 
                    ? 'bg-gray-100 border-gray-300 text-gray-700 shadow-inner' 
                    : 'bg-white border-gray-100 text-gray-400'
                  }`}
                >
                  <X className="w-5 h-5" />
                  <span className="font-medium">ના (નથી)</span>
                </button>
              </div>

              {/* Reason Input for Buffalo - Visible only when NO is selected */}
              {!currentRecord.buffalo && (
                <div className="animate-fade-in-down">
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      placeholder="કારણ? (દા.ત. બિમાર)"
                      value={currentRecord.buffaloReason || ''}
                      onChange={(e) => handleReasonChange(selectedDateStr, 'buffalo', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-300 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
          
          {(currentRecord.cow || currentRecord.buffalo) && (
            <div className="bg-green-50 p-3 text-center text-sm text-green-800 border-t border-green-100 font-medium">
              આજનું બિલ: ₹{(currentRecord.cow ? cowPrice : 0) + (currentRecord.buffalo ? buffaloPrice : 0)}
            </div>
          )}
        </section>

        {/* Calendar Grid */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-medium text-gray-400">
            <div>રવિ</div><div>સોમ</div><div>મંગળ</div><div>બુધ</div><div>ગુરુ</div><div>શુક્ર</div><div>શનિ</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square"></div>
            ))}
            
            {daysInMonth.map((date) => {
              const dateStr = date.toISOString().split('T')[0];
              const record = getRecord(dateStr);
              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === getTodayString();
              
              const hasCow = record.cow;
              const hasBuffalo = record.buffalo;
              const hasReason = (!hasCow && record.cowReason) || (!hasBuffalo && record.buffaloReason);

              let borderClass = isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 z-10' : 'border border-transparent';
              if (isToday && !isSelected) borderClass = 'border border-indigo-300';

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(date)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all relative bg-gray-50 hover:bg-gray-100 ${borderClass}`}
                >
                  <span className={isToday || isSelected ? 'text-gray-900 font-bold' : 'text-gray-600'}>
                    {date.getDate()}
                  </span>
                  
                  {/* Indicators */}
                  <div className="flex gap-1 mt-1">
                    {hasCow && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                    {hasBuffalo && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                    {/* Reason Indicator (small gray dot) */}
                    {hasReason && !hasCow && !hasBuffalo && <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div>ગાય</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div>ભેંસ</div>
          </div>
        </section>

        {/* Monthly Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard 
            title="ગાયના દિવસ" 
            value={`${currentMonthStats.totalCowDays}`} 
            icon={Calendar} 
            colorClass="bg-green-500 text-green-500" 
          />
          <StatCard 
            title="ભેંસના દિવસ" 
            value={`${currentMonthStats.totalBuffaloDays}`} 
            icon={Calendar} 
            colorClass="bg-blue-500 text-blue-500" 
          />
          <StatCard 
            title="કુલ દિવસ" 
            value={`${currentMonthStats.activeDays}`} 
            icon={Check} 
            colorClass="bg-purple-500 text-purple-500" 
          />
          <StatCard 
            title="કુલ ખર્ચ" 
            value={`₹${currentMonthStats.totalCost}`} 
            icon={IndianRupee} 
            colorClass="bg-orange-500 text-orange-500" 
          />
        </div>

        {/* Gemini AI Insight Section */}
        <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-6 h-6 text-indigo-600" />
            <h2 className="text-lg font-bold text-indigo-900">સ્માર્ટ રિપોર્ટ</h2>
          </div>
          
          {!aiInsight && !loadingAi && (
             <div className="text-center">
               <button 
                onClick={handleAiAnalysis}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition"
              >
                <Calculator className="w-4 h-4" />
                વિગતવાર હિસાબ (AI)
              </button>
             </div>
          )}

          {loadingAi && (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-sm text-indigo-600 animate-pulse">ગણતરી ચાલુ છે...</p>
            </div>
          )}

          {aiInsight && (
            <div className="bg-white/80 p-4 rounded-xl border border-indigo-100 text-indigo-900 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {aiInsight}
              <button 
                onClick={() => setAiInsight('')}
                className="mt-4 text-indigo-500 text-xs hover:underline block w-full text-right"
              >
                ફરીથી ગણતરી કરો
              </button>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};

export default App;