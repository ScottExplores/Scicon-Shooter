


import React from 'react';
import { TEXT_STRINGS, ASSETS } from '../constants';
import { LeaderboardEntry } from '../types';

interface StartScreenProps {
  onStart: () => void;
  onAbout: () => void;
  leaderboard: LeaderboardEntry[];
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onAbout, leaderboard }) => {
  return (
    <div className="absolute inset-0 bg-[#0b1020] flex flex-col items-center justify-center p-6 text-white z-10 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5980?auto=format&fit=crop&w=1080&q=80')] bg-cover bg-center animate-pulse"></div>
      
      {/* Decorative Tech Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(108,99,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(108,99,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="z-10 w-full max-w-lg flex flex-col items-center space-y-6 md:space-y-10">
        
        {/* Header Section: Matches SciCon 2025 Branding */}
        <div className="relative text-center w-full flex flex-col items-center">
           
           {/* Title Block */}
           <div className="flex flex-col items-center transform -skew-x-6">
               {/* Row 1: SCICON + 2025 */}
               <div className="flex flex-row items-start justify-center mr-[-1.5rem]">
                   <h1 className="text-6xl md:text-8xl font-black arcade-font tracking-tighter text-white drop-shadow-[0_0_30px_rgba(99,102,241,0.8)] leading-none select-none italic">
                     SCICON
                   </h1>
                   <div className="flex flex-col justify-start h-full pt-1 ml-3">
                      <span className="text-xl md:text-2xl font-bold text-indigo-400 arcade-font tracking-widest select-none opacity-90" style={{ writingMode: 'vertical-rl' }}>
                        2025
                      </span>
                   </div>
               </div>
               
               {/* Row 2: SHOOTER */}
               <h1 className="text-5xl md:text-7xl font-black arcade-font tracking-tighter text-indigo-100 drop-shadow-[0_0_30px_rgba(99,102,241,0.6)] leading-none select-none italic mt-[-10px]">
                 SHOOTER
               </h1>
           </div>

           {/* Date & Location */}
           <div className="mt-4 flex flex-col items-center space-y-2">
              <p className="text-2xl md:text-3xl text-white font-bold font-mono tracking-wider uppercase drop-shadow-md">
                 June 19-21
              </p>
              <div className="flex items-center space-x-3">
                 <span className="h-[1px] w-8 bg-indigo-500/50"></span>
                 <p className="text-sm md:text-base text-indigo-300 font-mono tracking-[0.4em] uppercase">
                   San Francisco
                 </p>
                 <span className="h-[1px] w-8 bg-indigo-500/50"></span>
              </div>
           </div>
        </div>

        {/* SciCon Card Style Menu */}
        <div className="relative w-full p-1">
            {/* The Border & Background Wrapper */}
            <div className="scicon-border-container"></div>
            <div className="scicon-inner-bg"></div>

            {/* Nodes */}
            <div className="scicon-node node-tl-1"></div>
            <div className="scicon-node node-tl-2"></div>
            <div className="scicon-node node-tr-1"></div>
            <div className="scicon-node node-tr-2"></div>
            <div className="scicon-node node-bl-1"></div>
            <div className="scicon-node node-bl-2"></div>
            <div className="scicon-node node-br-1"></div>
            <div className="scicon-node node-br-2"></div>

            {/* Content */}
            <div className="relative z-10 p-6 flex flex-col items-center space-y-6">
                
                {/* HIGH SCORE TABLE */}
                <div className="w-full bg-black/40 border border-white/5 p-2 rounded max-h-40 md:max-h-52 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between text-[10px] text-gray-500 font-mono uppercase border-b border-gray-700 pb-1 mb-2 tracking-widest">
                        <span>Rank</span>
                        <span>Scientist</span>
                        <span>Impact</span>
                    </div>
                    <div className="space-y-1">
                        {leaderboard.map((entry, idx) => (
                            <div key={idx} className={`flex justify-between items-center text-xs font-mono font-bold px-2 py-1 rounded ${idx === 0 ? 'bg-indigo-900/50 text-yellow-300 border border-yellow-500/30' : 'text-gray-300 hover:bg-white/5'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`${idx === 0 ? 'text-yellow-400' : 'text-gray-500'} w-4`}>#{idx + 1}</span>
                                    <span>{entry.name}</span>
                                </div>
                                <span className={idx === 0 ? 'text-white' : 'text-gray-400'}>{entry.score.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full space-y-3">
                    <button 
                      onClick={onStart}
                      className="scicon-btn w-full py-4 text-xl font-bold flex items-center justify-center gap-3 group"
                    >
                      <span>START MISSION</span>
                    </button>

                    <button 
                      onClick={() => window.open(ASSETS.REFERRAL_LINK, '_blank')}
                      className="scicon-btn w-full py-3 text-sm font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 border-none text-white hover:brightness-110 flex flex-col items-center justify-center leading-tight group relative"
                      style={{ background: 'linear-gradient(90deg, #d97706 0%, #b45309 100%)' }}
                    >
                      <span>JOIN RESEARCHHUB</span>
                      <span className="text-[10px] opacity-75 font-mono tracking-widest mt-0.5">(REFERRAL LINK)</span>
                      
                      {/* HOVER TOOLTIP */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 w-64 bg-black border border-indigo-500 p-2 rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          <img src={ASSETS.REFERRAL_IMG} alt="How It Works" className="w-full rounded" />
                          <div className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-3 h-3 bg-black border-r border-b border-indigo-500 rotate-45"></div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={onAbout}
                      className="scicon-btn scicon-btn-secondary w-full py-3 text-sm font-bold text-gray-400"
                    >
                      BRIEFING
                    </button>
                </div>
            </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 flex flex-col items-center space-y-2 z-10">
         {/* Large ResearchHub Foundation Logo */}
         <img 
            src="https://www.researchhub.foundation/assets/logo_long-BIzx5axY.svg" 
            alt="ResearchHub Foundation" 
            className="h-10 md:h-12 w-auto opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:opacity-100 transition-opacity"
         />
      </div>
    </div>
  );
};

export default StartScreen;