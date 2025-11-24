
import React from 'react';
import { Stats, GameState } from '../types';
import { audioService } from '../services/audioService';

interface UIOverlayProps {
  stats: Stats;
  setGameState: (s: GameState) => void;
  lives: number;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ stats, setGameState }) => {
  const [muted, setMuted] = React.useState(false);

  const toggleMute = () => {
    const isMuted = audioService.toggleMute();
    setMuted(isMuted);
  };

  return (
    <div className="fixed inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
      
      {/* Top HUD */}
      <div className="flex flex-col w-full">
          <div className="flex justify-between items-start mb-2">
            
            {/* Left: Score & Lives */}
            <div className="flex flex-col space-y-2 pointer-events-auto">
               <div className="relative min-w-[160px] p-1">
                 {/* Card BG */}
                 <div className="scicon-border-container"></div>
                 <div className="scicon-inner-bg"></div>
                 {/* Nodes */}
                 <div className="scicon-node node-tl-1 !w-1 !h-1 !bg-gray-500"></div>
                 <div className="scicon-node node-tr-1 !w-1 !h-1 !bg-gray-500"></div>
                 <div className="scicon-node node-bl-1 !w-1 !h-1 !bg-gray-500"></div>
                 <div className="scicon-node node-br-1 !w-1 !h-1 !bg-gray-500"></div>

                 <div className="relative z-10 px-4 py-2 flex flex-col">
                   <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono mb-1">Impact Factor</span>
                   <div className="text-2xl font-black text-white arcade-font tracking-wider">
                     {stats.score.toString().padStart(6, '0')}
                   </div>
                   <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-1">
                     WAVE {stats.wave}
                   </div>
                 </div>
               </div>

               {/* Lives Display */}
               <div className="flex space-x-1 pl-1 pt-2">
                  {[...Array(Math.max(0, stats.lives))].map((_, i) => (
                     <span key={i} className="text-2xl drop-shadow-md filter hue-rotate-180">🧪</span>
                  ))}
               </div>
            </div>

            {/* Right Top: Coins & Controls */}
            <div className="flex flex-col items-end space-y-2 pointer-events-auto pr-2"> 
                <div className="flex items-start space-x-3">
                  <div className="relative p-1">
                      <div className="scicon-border-container"></div>
                      <div className="scicon-inner-bg"></div>
                      <div className="relative z-10 flex items-center space-x-3 px-4 py-2 h-[42px]">
                          <img src="https://www.researchhub.com/icons/gold2.svg" className="w-5 h-5" alt="RSC" />
                          <span className="font-bold text-white text-lg font-mono">{stats.coins}</span>
                      </div>
                  </div>
                  
                  <div className="flex space-x-1">
                      <button 
                          onClick={toggleMute} 
                          className="scicon-btn w-[42px] h-[42px] flex items-center justify-center text-sm"
                      >
                          {muted ? '🔇' : '🔊'}
                      </button>
                      
                      <button 
                          onClick={() => setGameState(GameState.PAUSED)} 
                          className="scicon-btn w-[42px] h-[42px] flex items-center justify-center text-sm"
                      >
                          II
                      </button>
                  </div>
                </div>
            </div>
          </div>
      </div>

      {/* BOSS PROGRESS BAR (Vertical Right) */}
      {!stats.isBossActive && (
        <div className="fixed right-6 top-1/2 transform -translate-y-1/2 flex flex-col items-center pointer-events-auto z-20">
            <div className="relative p-1">
                {/* Frame */}
                <div className="scicon-border-container"></div>
                <div className="scicon-inner-bg"></div>
                
                <div className="relative z-10 p-1 flex flex-col items-center h-[300px] w-6">
                    {/* Progress Fill Container */}
                    <div className="w-full h-full bg-gray-900/50 relative overflow-hidden rounded-sm">
                       {/* Fill */}
                       <div 
                          className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-indigo-600 via-purple-500 to-red-500 transition-all duration-300 ease-linear opacity-80"
                          style={{ height: `${stats.bossProgress * 100}%` }}
                       ></div>

                       {/* Checkpoints */}
                       <div className="absolute bottom-[33%] left-0 w-full h-0.5 bg-white/20"></div>
                       <div className="absolute bottom-[66%] left-0 w-full h-0.5 bg-white/20"></div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Bottom Right: Big Upgrade Button */}
      <div className="pointer-events-auto fixed bottom-8 right-8 z-20">
         <button
            onClick={() => setGameState(GameState.SHOP)}
            className="w-20 h-20 relative group outline-none"
         >
            {/* Hex/Octo Shape Button */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 shadow-[0_0_20px_rgba(79,70,229,0.4)] clip-path-octo transition-transform group-hover:scale-105 group-active:scale-95 flex flex-col items-center justify-center border border-indigo-400/30">
                 <span className="text-3xl mb-1 group-hover:animate-bounce">🔬</span>
                 <span className="text-[10px] font-black text-white tracking-widest">LAB</span>
            </div>
            {/* Badge */}
            {stats.coins > 15 && (
               <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center animate-pulse border-2 border-black">!</div>
            )}
         </button>
      </div>

      <style jsx>{`
        .clip-path-octo {
            clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
        }
      `}</style>
    </div>
  );
};

export default UIOverlay;
