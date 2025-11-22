import React from 'react';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile | null;
  onOpenHistory: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onOpenHistory, onLogout }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">Context Lens</h1>
        </div>

        {user ? (
           <div className="flex items-center space-x-3">
             <button 
              onClick={onOpenHistory}
              className="p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors flex items-center space-x-1"
              title="View History"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
             </button>

             <div className="flex items-center pl-3 border-l border-slate-200 space-x-3">
                <div className="text-right hidden xs:block">
                  <p className="text-sm font-bold text-slate-700">{user.username}</p>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{user.currency}</p>
                </div>
                <button 
                  onClick={onLogout}
                  className="text-xs text-red-500 hover:text-red-700 font-medium bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Logout
                </button>
             </div>
           </div>
        ) : (
          <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Gemini 2.5 Flash
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;