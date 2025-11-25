
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
    <div className="absolute inset-0 bg-[#0b1020] flex flex-col items-center justify-start pt-8 p-6 text-white z-10 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5980?auto=format&fit=crop&w=1080&q=80')] bg-cover bg-center animate-pulse"></div>
      
      {/* Decorative Tech Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(108,99,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(108,99,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      {/* Main Content */}
      <div className="z-10 w-full max-w-lg flex flex-col items-center space-y-6">
        
        {/* Header Section */}
        <div className="relative text-center w-full flex flex-col items-center">
           
           {/* Title Block: Flex Row - SCICON SHOOTER (Left) | 2025 (Right) */}
           <div className="flex flex-row items-center justify-center transform -skew-x-6 gap-2">
               
               {/* Left Column: Stacked SCICON / SHOOTER */}
               <div className="flex flex-col items-end">
                   <h1 className="text-5xl md:text-7xl font-black arcade-font tracking-tighter text-white drop-shadow-[0_0_30px_rgba(99,102,241,0.8)] leading-none select-none italic">
                     SCICON
                   </h1>
                   <h1 className="text-4xl md:text-6xl font-black arcade-font tracking-wide text-indigo-100 drop-shadow-[0_0_30px_rgba(99,102,241,0.6)] leading-none select-none italic mt-[-5px]">
                     SHOOTER
                   </h1>
               </div>

               {/* Right Column: Vertical 2025 - Sized to match height */}
               <div className="h-[60px] md:h-[90px] w-0.5 bg-indigo-500/50 rounded mx-0"></div>
               <div className="flex flex-col justify-between h-[60px] md:h-[90px] leading-none pt-1">
                  <span className="text-sm md:text-lg font-bold text-transparent arcade-font select-none" style={{ WebkitTextStroke: '1px #818cf8' }}>2</span>
                  <span className="text-sm md:text-lg font-bold text-transparent arcade-font select-none" style={{ WebkitTextStroke: '1px #818cf8' }}>0</span>
                  <span className="text-sm md:text-lg font-bold text-transparent arcade-font select-none" style={{ WebkitTextStroke: '1px #818cf8' }}>2</span>
                  <span className="text-sm md:text-lg font-bold text-transparent arcade-font select-none" style={{ WebkitTextStroke: '1px #818cf8' }}>5</span>
               </div>
           </div>

           {/* Date & Location */}
           <div className="flex flex-col items-center space-y-1 mt-0">
              <p className="text-xl md:text-2xl text-white font-bold font-mono tracking-wider uppercase drop-shadow-md">
                 DEC 4
              </p>
              <div className="flex items-center space-x-3">
                 <span className="h-[1px] w-6 bg-indigo-500/50"></span>
                 <p className="text-xs md:text-sm text-indigo-300 font-mono tracking-[0.4em] uppercase">
                   San Francisco
                 </p>
                 <span className="h-[1px] w-6 bg-indigo-500/50"></span>
              </div>
           </div>
        </div>

        {/* SciCon Card Style Menu */}
        <div className="relative w-full p-1">
            <div className="scicon-border-container"></div>
            <div className="scicon-inner-bg"></div>
            <div className="scicon-node node-tl-1"></div>
            <div className="scicon-node node-tl-2"></div>
            <div className="scicon-node node-tr-1"></div>
            <div className="scicon-node node-tr-2"></div>
            <div className="scicon-node node-bl-1"></div>
            <div className="scicon-node node-bl-2"></div>
            <div className="scicon-node node-br-1"></div>
            <div className="scicon-node node-br-2"></div>

            <div className="relative z-10 p-6 flex flex-col items-center space-y-6">
                
                {/* GLOBAL LEADERBOARD */}
                <div className="w-full bg-black/40 border border-white/5 p-2 rounded max-h-40 md:max-h-52 overflow-y-auto custom-scrollbar">
                    <h3 className="text-xs font-bold text-indigo-400 mb-2 text-center tracking-widest border-b border-indigo-500/30 pb-1">GLOBAL LEADERBOARD</h3>
                    <div className="space-y-1">
                        {leaderboard.length === 0 ? (
                             <div className="text-center text-xs text-gray-500 py-4 animate-pulse">Scanning Archive...</div>
                        ) : (
                            leaderboard.map((entry, idx) => (
                                <div key={idx} className={`flex justify-between items-center text-xs font-mono font-bold px-2 py-1 rounded ${idx === 0 ? 'bg-indigo-900/50 text-yellow-300 border border-yellow-500/30' : 'text-gray-300 hover:bg-white/5'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`${idx === 0 ? 'text-yellow-400' : 'text-gray-500'} w-4`}>#{idx + 1}</span>
                                        <span>{entry.name}</span>
                                    </div>
                                    <span className={idx === 0 ? 'text-white' : 'text-gray-400'}>{entry.score.toLocaleString()}</span>
                                </div>
                            ))
                        )}
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
         <span className="text-[10px] text-gray-600 font-mono">v1.1</span>
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
