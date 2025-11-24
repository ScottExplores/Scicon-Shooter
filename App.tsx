

import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import StartScreen from './components/StartScreen';
import UIOverlay from './components/UIOverlay';
import UpgradeShop from './components/UpgradeShop';
import Tutorial from './components/Tutorial';
import { GameState, Stats, Upgrades, LeaderboardEntry } from './types';
import { audioService } from './services/audioService';
import { UPGRADE_BASE_COSTS, ASSETS, DEFAULT_LEADERBOARD } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameId, setGameId] = useState<number>(0); // key to force re-mount
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerNameInput, setPlayerNameInput] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState<boolean>(false);

  // Initialize Leaderboard
  useEffect(() => {
    const saved = localStorage.getItem('rh_leaderboard');
    if (saved) {
        setLeaderboard(JSON.parse(saved));
    } else {
        setLeaderboard(DEFAULT_LEADERBOARD);
    }
  }, []);

  const [stats, setStats] = useState<Stats>({
    score: 0,
    highScore: parseInt(localStorage.getItem('rh_highscore') || '0'),
    wave: 1,
    coins: 0,
    totalCoins: 0,
    enemiesDefeated: 0,
    lives: 3,
    upgrades: {
      fireRate: 0,
      speed: 0,
      maxHp: 0
    },
    bossProgress: 0,
    isBossActive: false,
    bossHp: 0,
    bossMaxHp: 100
  });

  const startGame = () => {
    audioService.init();
    // Reset stats but keep upgrades for this session if desired? 
    // We'll reset everything for a fresh "run"
    setStats(prev => ({ 
        ...prev, 
        score: 0, 
        wave: 1, 
        coins: 0, 
        totalCoins: 0,
        enemiesDefeated: 0,
        lives: 3, // Initial lives
        upgrades: { fireRate: 0, speed: 0, maxHp: 0 },
        bossProgress: 0,
        isBossActive: false,
        bossHp: 0,
        bossMaxHp: 100
    }));
    setShowNameInput(false);
    setPlayerNameInput('');
    setGameId(prev => prev + 1); // Force fresh canvas instance
    setGameState(GameState.TUTORIAL);
  };

  const handleTutorialComplete = () => {
    setGameState(GameState.PLAYING);
  };

  const resetGame = () => {
    setGameState(GameState.MENU);
  };

  const handleUpgrade = (type: keyof Upgrades | 'repair') => {
    if (type === 'repair') {
       if (stats.coins >= UPGRADE_BASE_COSTS.repair) {
         audioService.playSound('powerup');
         setStats(prev => ({
            ...prev,
            coins: prev.coins - UPGRADE_BASE_COSTS.repair,
            lives: Math.min(prev.lives + 1, 3 + prev.upgrades.maxHp)
         }));
       }
       return;
    }

    // Dynamic Cost Logic: Base + (Level * 5)
    // Much flatter curve as requested
    const currentLevel = stats.upgrades[type];
    const cost = UPGRADE_BASE_COSTS[type] + (currentLevel * 5);

    if (stats.coins >= cost && currentLevel < 5) {
        audioService.playSound('coin'); 
        setStats(prev => ({
            ...prev,
            coins: prev.coins - cost,
            upgrades: {
                ...prev.upgrades,
                [type]: prev.upgrades[type] + 1
            }
        }));
    }
  };

  // Keyboard shortcut for Shop 'V'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'v' || e.key === 'V') {
        if (gameState === GameState.PLAYING) {
           setGameState(GameState.SHOP);
        } else if (gameState === GameState.SHOP) {
           setGameState(GameState.PLAYING);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Game Over Logic - Check High Score
  useEffect(() => {
    if (gameState === GameState.GAMEOVER) {
      if (stats.score > stats.highScore) {
        localStorage.setItem('rh_highscore', stats.score.toString());
        setStats(s => ({...s, highScore: s.score}));
      }
      
      // Check for Leaderboard qualification (Strict sorting and >= check)
      const sorted = [...leaderboard].sort((a, b) => b.score - a.score);
      const lowestScore = sorted.length < 10 ? 0 : sorted[9].score;
      
      // Allow entry if score > 0 AND (list isn't full OR score beats/ties lowest)
      if (stats.score > 0 && (sorted.length < 10 || stats.score >= lowestScore)) {
          setShowNameInput(true);
      }
    }
  }, [gameState, stats.score, leaderboard]);

  const submitScore = () => {
      if (!playerNameInput.trim()) return;
      
      const newEntry: LeaderboardEntry = { name: playerNameInput.trim().substring(0, 10).toUpperCase(), score: stats.score };
      const newLeaderboard = [...leaderboard, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      
      setLeaderboard(newLeaderboard);
      localStorage.setItem('rh_leaderboard', JSON.stringify(newLeaderboard));
      setShowNameInput(false);
      setGameState(GameState.MENU);
  };

  // Determine Publication Status based on score
  const getPubStatus = (score: number) => {
    if (score < 500) return { title: "DESK REJECTED", color: "text-red-500", desc: "Try adding more novelty." };
    if (score < 1500) return { title: "UNDER REVIEW", color: "text-yellow-400", desc: "Reviewer #2 has some notes." };
    if (score < 3000) return { title: "ACCEPTED W/ REVISIONS", color: "text-blue-400", desc: "So close to the cover." };
    return { title: "NATURE COVER", color: "text-purple-400", desc: "Scientific breakthrough!" };
  };

  const pubStatus = getPubStatus(stats.score);

  return (
    <div className="relative w-full h-full bg-[#0b1020] select-none">
      
      {/* Game Layer */}
      {/* Note: GameCanvas is rendered during PAUSED/SHOP/TUTORIAL so visual context remains */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED || gameState === GameState.GAMEOVER || gameState === GameState.SHOP || gameState === GameState.TUTORIAL) && (
        <GameCanvas 
           key={gameId}
           stats={stats} 
           setStats={setStats} 
           setGameState={setGameState}
           gameState={gameState}
        />
      )}

      {/* Tutorial Overlay */}
      {gameState === GameState.TUTORIAL && (
         <Tutorial onReady={handleTutorialComplete} />
      )}

      {/* UI Overlay (HUD) */}
      {(gameState === GameState.PLAYING) && (
        <UIOverlay stats={stats} setGameState={setGameState} lives={stats.lives} />
      )}

      {/* Menus */}
      {gameState === GameState.MENU && (
        <StartScreen onStart={startGame} onAbout={() => setGameState(GameState.ABOUT)} leaderboard={leaderboard} />
      )}

      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm p-1">
             <div className="scicon-border-container"></div>
             <div className="scicon-inner-bg"></div>
             {/* Nodes */}
             <div className="scicon-node node-tl-1"></div>
             <div className="scicon-node node-tr-1"></div>
             <div className="scicon-node node-bl-1"></div>
             <div className="scicon-node node-br-1"></div>

             <div className="relative z-10 p-8 text-center space-y-6">
                <h2 className="text-3xl font-bold text-white arcade-font tracking-widest text-shadow-neon">PAUSED</h2>
                <div className="space-y-3">
                  <button 
                    onClick={() => setGameState(GameState.PLAYING)}
                    className="scicon-btn w-full py-3 text-sm font-bold"
                  >
                    RESUME
                  </button>
                  <button 
                    onClick={resetGame}
                    className="scicon-btn scicon-btn-secondary w-full py-3 text-sm font-bold text-gray-300"
                  >
                    QUIT
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {gameState === GameState.SHOP && (
        <UpgradeShop 
            stats={stats} 
            onUpgrade={handleUpgrade} 
            onClose={() => setGameState(GameState.PLAYING)} 
        />
      )}

      {gameState === GameState.GAMEOVER && (
        <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md animate-bounce-in p-1 max-h-[95vh] flex flex-col">
             <div className="scicon-border-container"></div>
             <div className="scicon-inner-bg"></div>
             {/* Nodes */}
             <div className="scicon-node node-tl-1"></div>
             <div className="scicon-node node-tr-1"></div>
             <div className="scicon-node node-bl-1"></div>
             <div className="scicon-node node-br-1"></div>
             
             <div className="relative z-10 p-6 text-center space-y-4 overflow-y-auto custom-scrollbar">
                
                {showNameInput ? (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-black text-yellow-400 arcade-font tracking-widest animate-pulse">NEW HIGH SCORE!</h2>
                        <div className="text-4xl text-white font-bold">{stats.score}</div>
                        <p className="text-sm text-gray-300 font-mono">ENTER YOUR NAME:</p>
                        <input 
                            type="text" 
                            maxLength={10}
                            value={playerNameInput}
                            onChange={(e) => setPlayerNameInput(e.target.value.toUpperCase())}
                            className="bg-black/50 border border-indigo-500 text-center text-white text-xl p-2 w-full uppercase font-mono focus:outline-none focus:border-yellow-400"
                            placeholder="NAME"
                            autoFocus
                        />
                         <button 
                            onClick={submitScore}
                            disabled={!playerNameInput}
                            className="scicon-btn w-full py-3 text-lg font-bold"
                          >
                            SUBMIT RECORD
                          </button>

                          {/* Also Show Referral Here so winners don't miss it */}
                          <div className="mt-4 pt-4 border-t border-white/10">
                               <button 
                                  onClick={() => window.open(ASSETS.REFERRAL_LINK, '_blank')}
                                  className="text-[10px] text-indigo-400 hover:text-white uppercase tracking-widest animate-pulse"
                              >
                                  JOIN RESEARCHHUB (REFERRAL LINK)
                              </button>
                          </div>
                    </div>
                ) : (
                    <>
                        <div>
                          <h2 className={`text-3xl font-black ${pubStatus.color} arcade-font tracking-widest mb-1`}>{pubStatus.title}</h2>
                          <p className="text-gray-400 text-sm font-mono italic">"{pubStatus.desc}"</p>
                        </div>
                        
                        <div className="bg-black/40 p-4 space-y-2 border border-white/10">
                          <div className="flex justify-between text-white border-b border-white/10 pb-2 mb-2">
                            <span className="text-sm font-mono text-gray-400">IMPACT FACTOR</span>
                            <span className="font-bold text-xl text-yellow-400 arcade-font">{stats.score}</span>
                          </div>
                          <div className="flex justify-between text-gray-400 text-xs font-mono">
                            <span>TOTAL RESEARCH FUNDED</span>
                            <span>{stats.totalCoins} RSC</span>
                          </div>
                          <div className="flex justify-between text-gray-400 text-xs font-mono">
                            <span>WAVES CLEARED</span>
                            <span>{stats.wave - 1}</span>
                          </div>
                        </div>

                        {/* REFERRAL PROMO SECTION */}
                        <div className="bg-indigo-900/30 p-2 border border-indigo-500/50 rounded flex flex-col items-center">
                            <p className="text-white text-xs font-bold uppercase tracking-wider mb-2">Want to fund real science?</p>
                            <button 
                                onClick={() => window.open(ASSETS.REFERRAL_LINK, '_blank')}
                                className="scicon-btn w-full py-3 text-xs font-bold animate-pulse"
                            >
                                JOIN RESEARCHHUB (REFERRAL LINK)
                            </button>
                        </div>

                        <div className="space-y-2 pt-2">
                          <button 
                            onClick={startGame}
                            className="scicon-btn w-full py-3 text-lg font-bold"
                          >
                            RESUBMIT MANUSCRIPT
                          </button>
                          <button 
                            onClick={resetGame}
                            className="text-gray-500 text-xs uppercase hover:text-white tracking-widest"
                          >
                            Return to Lab (Menu)
                          </button>
                        </div>
                    </>
                )}
             </div>
          </div>
        </div>
      )}

      {gameState === GameState.ABOUT && (
        <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur flex items-center justify-center p-4">
          <div className="relative w-full max-w-md max-h-[85vh] p-1">
            <div className="scicon-border-container"></div>
            <div className="scicon-inner-bg"></div>
            {/* Nodes */}
             <div className="scicon-node node-tl-1"></div>
             <div className="scicon-node node-tr-1"></div>
             <div className="scicon-node node-bl-1"></div>
             <div className="scicon-node node-br-1"></div>
             
            <div className="relative z-10 p-6 overflow-y-auto">
                <h2 className="text-2xl font-bold text-white mb-6 arcade-font border-b border-indigo-500/30 pb-4">Mission Brief</h2>
                <div className="space-y-4 text-gray-300 text-sm leading-relaxed font-mono">
                  <p>
                    <strong className="text-indigo-400">SciCon Shooter</strong>
                  </p>
                  <p>
                    Welcome to SciCon 2025. You are piloting the flagship vessel of Open Science. Your objective is to dismantle the barriers of legacy publishing.
                  </p>
                  
                  <div className="bg-white/5 p-4 border-l-2 border-indigo-500 my-4">
                    <h3 className="text-white font-bold mb-2 text-xs uppercase tracking-wider">Objectives</h3>
                    <ul className="list-disc pl-4 space-y-1 text-gray-400 text-xs">
                      <li>Collect <span className="text-yellow-400">RSC</span> to fund research.</li>
                      <li>Use funds to <span className="text-green-400">Upgrade Ship Stats</span> via the HUD menu.</li>
                      <li>Acquire <span className="text-purple-400">Founder Tech</span> (Powerups).</li>
                      <li>Destroy <span className="text-red-400">Paywalls</span> & <span className="text-red-400">Predatory Journals</span>.</li>
                    </ul>
                  </div>

                  <div className="pt-4">
                     <button 
                      onClick={() => setGameState(GameState.MENU)}
                      className="scicon-btn w-full py-3 font-bold tracking-widest"
                    >
                      ACKNOWLEDGE
                    </button>
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
