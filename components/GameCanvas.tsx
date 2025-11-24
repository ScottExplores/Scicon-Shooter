import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../services/gameLogic';
import { Stats, GameState } from '../types';

interface GameCanvasProps {
  setStats: (stats: Stats) => void;
  setGameState: (state: GameState) => void;
  stats: Stats;
  gameState: GameState;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ setStats, setGameState, stats, gameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  // Use a ref to track gameState inside the animation loop closure
  const gameStateRef = useRef(gameState);

  // Sync the ref whenever the prop changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Sync Stats (specifically upgrades/coins modified by React UI) to Engine
  useEffect(() => {
    if (engineRef.current) {
        engineRef.current.stats = stats;
        
        // Fix: Explicitly sync lives if the UI has a higher value (e.g., bought Repair)
        if (stats.lives > engineRef.current.lives) {
            engineRef.current.lives = stats.lives;
        }
        
        // Also sync upgrades immediately
        if (engineRef.current.stats.upgrades !== stats.upgrades) {
            engineRef.current.stats.upgrades = stats.upgrades;
        }
    }
  }, [stats]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize Engine
    const engine = new GameEngine(stats);
    engineRef.current = engine;
    
    // Resize Handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      engine.resize(canvas.width, canvas.height);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    engine.init(canvas.width, canvas.height);

    // Input Handlers
    const keys: Record<string, boolean> = {};
    engine.handleInput(keys, null);

    const handleKeyDown = (e: KeyboardEvent) => { 
      keys[e.key] = true; 
    };
    
    const handleKeyUp = (e: KeyboardEvent) => { 
      keys[e.key] = false; 
    };
    
    const handleTouchMove = (e: TouchEvent) => {
       e.preventDefault(); 
       const touch = e.touches[0];
       engine.handleInput(keys, { x: touch.clientX, y: touch.clientY });
    };
    
    const handleTouchEnd = () => {
       engine.handleInput(keys, null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    // FPS Control
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    // Loop
    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      
      const deltaTime = timestamp - lastTimeRef.current;

      // Only update if enough time has passed (cap at 60 FPS)
      if (deltaTime >= frameInterval) {
          lastTimeRef.current = timestamp - (deltaTime % frameInterval);

          // Use the REF current value to check state, avoiding stale closure issues
          if (gameStateRef.current === GameState.PLAYING) {
            engine.update();
          }

          // Sync Stats to React for HUD every 30 logical frames (0.5s)
          if (engine.frameCount % 30 === 0) {
            setStats({ 
                ...engine.stats,
            });
          }

          // Check Game Over
          if (!engine.gameActive && engine.lives <= 0) {
            setGameState(GameState.GAMEOVER);
          }
      }

      // ALWAYS draw the game so it appears in the background (interpolate if needed, but simple draw is fine here)
      engine.draw(ctx);
      
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      // Cleanup: Stop loop and remove listeners
      if (engineRef.current) engineRef.current.gameActive = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchstart', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  return (
    <canvas 
      ref={canvasRef} 
      className="block fixed top-0 left-0 w-full h-full z-0"
    />
  );
};

export default GameCanvas;