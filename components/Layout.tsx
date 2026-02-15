
import React from 'react';
import { AppView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppView;
  setView: (view: AppView) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, setView }) => {
  return (
    <div className="min-h-screen flex flex-col bg-brand-black">
      <header className="sticky top-0 z-50 glass border-b border-brand-platinum/5 px-6 py-4 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => setView(AppView.HUB)}
        >
          <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center font-black text-xl text-brand-black shadow-lg shadow-brand-green/20">H</div>
          <span className="text-xl font-black tracking-tighter text-brand-platinum">NEXT HUMAN</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          {[
            { id: AppView.HUB, label: 'Skill Hub' },
            { id: AppView.LEARN, label: 'Principles' },
            { id: AppView.DASHBOARD, label: 'My Progress' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`text-xs font-bold uppercase tracking-widest transition-all ${
                activeView === item.id ? 'text-brand-green' : 'text-brand-platinum/50 hover:text-brand-platinum'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
           <div className="hidden sm:flex flex-col items-end">
             <span className="text-[10px] font-bold text-brand-platinum/40 uppercase tracking-tighter">Human Proficiency</span>
             <span className="text-xs font-mono text-brand-green">LVL 01 INITIATE</span>
           </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>

      <footer className="py-12 border-t border-brand-platinum/5 text-center text-brand-platinum/20 text-[10px] font-bold uppercase tracking-[0.3em]">
        <p>© 2024 LEARN THE NEXT HUMAN SKILLS — EVOLVING FOR THE AGENTIC AGE</p>
      </footer>
    </div>
  );
};

export default Layout;
