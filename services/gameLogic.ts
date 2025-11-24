

import { EntityType, PowerupType, Stats } from '../types';
import { ASSETS, GAME_CONFIG, COLORS } from '../constants';
import { audioService } from './audioService';

// --- Helper Classes ---

export class Entity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  markedForDeletion: boolean = false;
  color: string;
  
  // Specific props
  hp: number = 1;
  maxHp: number = 1;
  text?: string; // For rendering text based enemies
  angle: number = 0;
  
  // Lifecycle props
  life: number = 0;
  maxLife: number = 0;

  // Boss Props
  attackTimer: number = 0;
  isCharging: boolean = false;
  isBeam: boolean = false; // For Boss Laser
  
  constructor(type: EntityType, x: number, y: number) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.color = '#FFF';
    
    // Default Dimensions
    this.width = 30;
    this.height = 30;
  }
}

export class Particle extends Entity {
  
  constructor(x: number, y: number, color: string, speed: number) {
    super(EntityType.PARTICLE, x, y);
    this.width = 4;
    this.height = 4;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 40 + Math.random() * 20;
    this.maxLife = this.life;
  }
}

export class VisualEffect extends Entity {
  effectType: 'text' | 'ring' | 'laser_warning';
  scale: number = 1;

  constructor(x: number, y: number, type: 'text' | 'ring' | 'laser_warning', content: string = '', color: string = '#FFF') {
    super(EntityType.EFFECT, x, y);
    this.effectType = type;
    this.text = content;
    this.color = color;
    this.life = 60;
    this.maxLife = 60;
    
    if (type === 'text') {
        this.vy = -0.5; // Float up slowly
        this.life = 120; // Longer life for text
        this.maxLife = 120;
    }
  }
}

class BackgroundEntity {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  type: 'planet' | 'nebula';

  constructor(width: number, height: number) {
    this.type = Math.random() > 0.3 ? 'planet' : 'nebula';
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    
    if (this.type === 'planet') {
      this.size = 50 + Math.random() * 100;
      this.speed = 0.2 + Math.random() * 0.3; // Very slow parallax
      
      const hues = [240, 260, 280, 200]; // Blue, Purple, Magenta, Teal
      const hue = hues[Math.floor(Math.random() * hues.length)];
      this.color = `hsl(${hue}, 40%, 20%)`; // Darker, less saturated
    } else {
      this.size = 200 + Math.random() * 300;
      this.speed = 0.1;
      this.color = `rgba(${Math.floor(Math.random()*50)}, ${Math.floor(Math.random()*20)}, ${Math.floor(Math.random()*80) + 50}, 0.1)`;
    }
  }

  update(height: number) {
    this.y += this.speed;
    if (this.y > height + this.size) {
      this.y = -this.size * 2;
      this.x = Math.random() * 1000; // rough width reset
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // Use low opacity for background elements to keep them subtle
    ctx.globalAlpha = 0.2; 

    if (this.type === 'planet') {
      const gradient = ctx.createRadialGradient(this.x, this.y, this.size * 0.2, this.x, this.y, this.size);
      gradient.addColorStop(0, this.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Shadow clip for planet look
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(this.x - this.size*0.3, this.y - this.size*0.3, this.size, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Nebula
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
      gradient.addColorStop(0, this.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(this.x - this.size, this.y - this.size, this.size*2, this.size*2);
    }
    ctx.restore();
  }
}

// --- Image Caching ---
const imageCache: Record<string, HTMLImageElement> = {};

const loadImage = (url: string) => {
  if (imageCache[url]) return imageCache[url];
  const img = new Image();
  img.crossOrigin = "anonymous"; // Try to allow CORS for canvas
  img.src = url;
  imageCache[url] = img;
  return img;
};

// --- Main Engine ---

export class GameEngine {
  width: number = 0;
  height: number = 0;
  player: Entity;
  entities: Entity[] = [];
  bgEntities: BackgroundEntity[] = [];
  stats: Stats;
  
  // Input State
  keys: Record<string, boolean> = {};
  touchPos: { x: number, y: number } | null = null;
  
  // Game State
  wave: number = 1;
  frameCount: number = 0;
  bgY: number = 0;
  gameActive: boolean = false;
  
  // Player State
  lives: number = GAME_CONFIG.PLAYER_LIVES;
  invincibleTimer: number = 0;
  
  // Powerup Stacking System
  activePowerups: Map<PowerupType, number> = new Map();
  
  // Boss State
  bossRef: Entity | null = null;
  miniBossRef: Entity | null = null;
  
  // Checkpoint Flags
  spawnedMiniBoss1: boolean = false;
  spawnedWallBoss: boolean = false;
  
  // For Wall Boss Logic
  invaderDirection: number = 1; // 1 for right, -1 for left
  invaderMoveTimer: number = 0;
  
  // Checkpoint State
  waveProgressFrames: number = 0;
  
  constructor(stats: Stats) {
    this.stats = stats;
    this.player = new Entity(EntityType.PLAYER, 0, 0);
    this.player.width = 100; // Updated to larger size
    this.player.height = 100; 
    
    // Preload
    loadImage(ASSETS.PLAYER_SHIP);
    loadImage(ASSETS.FOUNDER_BRIAN);
    loadImage(ASSETS.FOUNDER_PATRICK);
    loadImage(ASSETS.FOUNDER_JEFFREY);
    loadImage(ASSETS.FOUNDER_4);
    loadImage(ASSETS.RSC_TOKEN);
    loadImage(ASSETS.BOTTLENECK_ICON);
  }

  init(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.player.x = width / 2 - 50;
    this.player.y = height - 150;
    this.entities = [];
    this.bgEntities = [];

    // Create Background Objects
    for (let i = 0; i < 6; i++) {
        this.bgEntities.push(new BackgroundEntity(width, height));
    }

    this.gameActive = true;
    
    // Apply HP Upgrade on Init
    this.lives = GAME_CONFIG.PLAYER_LIVES + this.stats.upgrades.maxHp;
    this.stats.lives = this.lives;
    
    this.wave = 1;
    this.stats.score = 0;
    this.stats.coins = 0;
    this.stats.totalCoins = 0;
    this.stats.wave = 1;
    
    this.resetWaveProgress();
    this.spawnFloatingText(this.width/2, this.height/2, "WAVE 1", "#FFF");

    this.bossRef = null;
    this.miniBossRef = null;
    this.activePowerups.clear();
    this.frameCount = 0;
  }
  
  resetWaveProgress() {
    this.stats.bossProgress = 0;
    this.stats.isBossActive = false;
    this.stats.bossHp = 0;
    this.stats.bossMaxHp = 100;
    this.waveProgressFrames = 0;
    this.bossRef = null;
    this.miniBossRef = null;
    this.spawnedMiniBoss1 = false;
    this.spawnedWallBoss = false;
  }

  startNextWave() {
    this.wave++;
    this.stats.wave++;
    this.resetWaveProgress();
    
    // Clear any lingering projectiles
    this.entities = this.entities.filter(e => 
        e.type === EntityType.PLAYER || 
        e.type === EntityType.PARTICLE || 
        e.type === EntityType.POWERUP ||
        e.type === EntityType.COIN
    );
    
    // Visual Announcement
    this.spawnFloatingText(this.width/2, this.height/2, `WAVE ${this.wave}`, "#FFF");
    audioService.playSound('powerup');
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.entities.forEach(e => {
        if (e.type === EntityType.PLAYER) {
            e.x = Math.min(e.x, width - e.width);
            e.y = Math.min(e.y, height - e.height);
        }
    });
  }

  handleInput(keys: Record<string, boolean>, touchPos: { x: number, y: number } | null) {
    this.keys = keys;
    if (touchPos !== undefined) {
        this.touchPos = touchPos;
    }
  }

  update() {
    if (!this.gameActive) return;
    this.frameCount++;
    
    // Sync Lives to Stats for UI (Read-Only to UI)
    // Note: If UI updates stats.lives via Shop, GameCanvas effect handles syncing back to engine
    this.stats.lives = this.lives;
    
    // --- WAVE PROGRESS LOGIC ---
    // Count invaders to see if Wall Boss is alive
    const invaderCount = this.entities.filter(e => e.type === EntityType.ENEMY_INVADER).length;
    
    // If ANY boss is alive (Reference or Wall parts), pause progress
    const isBossAlive = !!this.bossRef || !!this.miniBossRef || invaderCount > 0;
    
    if (isBossAlive) {
        // Stats Logic for Boss Bar
        this.stats.isBossActive = true;
        
        let hp = 0;
        let maxHp = 100;

        if (this.bossRef) {
            hp = this.bossRef.hp;
            maxHp = this.bossRef.maxHp;
        } else if (this.miniBossRef) {
            hp = this.miniBossRef.hp;
            maxHp = this.miniBossRef.maxHp;
        } else if (invaderCount > 0) {
            // Aggregate wall HP
            hp = invaderCount; 
            maxHp = 24; // 3 rows * 8 cols = 24 blocks total
        }
        
        this.stats.bossHp = hp;
        this.stats.bossMaxHp = maxHp;
        
        // Handle Wall Movement if Invaders exist
        if (invaderCount > 0) {
            this.updateWallBoss();
        }

    } else {
        // Progress the bar
        this.stats.isBossActive = false;
        this.waveProgressFrames++;
        const totalDuration = GAME_CONFIG.WAVE_DURATION_FRAMES;
        this.stats.bossProgress = Math.min(1, this.waveProgressFrames / totalDuration);
        
        // CHECKPOINT 1: 33% (Mini Boss 1 - Bottleneck)
        if (this.stats.bossProgress >= 0.33 && !this.spawnedMiniBoss1) {
            this.spawnMiniBoss(1);
            this.spawnedMiniBoss1 = true;
        }
        // CHECKPOINT 2: 66% (Mini Boss 2 - The Wall)
        else if (this.stats.bossProgress >= 0.66 && !this.spawnedWallBoss) {
            this.spawnWallBoss();
            this.spawnedWallBoss = true;
        }
        // CHECKPOINT 3: 100% (Final Boss)
        else if (this.stats.bossProgress >= 1 && !this.bossRef) {
            this.spawnBoss();
        }
    }

    // Update BG Entities (Parallax)
    this.bgEntities.forEach(bg => bg.update(this.height));

    // --- Player Movement (With Upgrades) ---
    const speed = GAME_CONFIG.BASE_PLAYER_SPEED + (this.stats.upgrades.speed * 1.5);
    
    if (this.touchPos) {
      // Direct drag/follow with smoothing
      const dx = this.touchPos.x - (this.player.x + this.player.width/2);
      const dy = this.touchPos.y - 80 - (this.player.y + this.player.height/2); // Offset touch slightly up
      
      this.player.x += dx * 0.15;
      this.player.y += dy * 0.15;
    } else {
      // Keyboard
      if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) this.player.x -= speed;
      if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) this.player.x += speed;
      if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) this.player.y -= speed;
      if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) this.player.y += speed;
    }

    // Boundaries
    this.player.x = Math.max(0, Math.min(this.width - this.player.width, this.player.x));
    this.player.y = Math.max(0, Math.min(this.height - this.player.height, this.player.y));

    // --- Player Shooting (With Upgrades) ---
    // Base rate is 10 frames. Upgrade reduces this (faster fire).
    const fireInterval = Math.max(4, 10 - (this.stats.upgrades.fireRate * 2));
    
    if ((this.keys[' '] || this.touchPos || this.keys['Enter']) && this.frameCount % fireInterval === 0) {
      this.fireBullet();
    }

    // --- Powerup Logic (Stacking) ---
    for (const [type, timer] of this.activePowerups) {
        if (timer > 0) {
            this.activePowerups.set(type, timer - 1);
        } else {
            this.activePowerups.delete(type);
        }
    }
    
    if (this.invincibleTimer > 0) this.invincibleTimer--;

    // --- Spawning Logic ---
    this.spawnEnemies();

    // --- Entity Updates ---
    this.entities.forEach(e => {
      // Beam entities don't move normally
      if (e.isBeam) {
          e.life--;
          if (e.life <= 0) e.markedForDeletion = true;
          // Update Beam position to match boss if boss exists
          if (this.bossRef) {
              e.x = this.bossRef.x + this.bossRef.width/2 - e.width/2;
              e.y = this.bossRef.y + this.bossRef.height - 20;
          } else {
              e.markedForDeletion = true;
          }
          return;
      }

      e.x += e.vx;
      e.y += e.vy;

      // Enemy logic
      if (e.type === EntityType.ENEMY_DRONE || e.type === EntityType.ENEMY_JOURNAL || e.type === EntityType.ENEMY_SWARM || e.type === EntityType.ENEMY_BRICK) {
        // Swarm logic (tracking)
        if (e.type === EntityType.ENEMY_SWARM) {
          const dx = this.player.x - e.x;
          e.vx += dx * 0.002; // Enhanced tracking
          e.vx *= 0.95; 
        }
        
        // Remove if off screen
        if (e.y > this.height) e.markedForDeletion = true;
      }
      
      // Projectiles
      if (e.type === EntityType.PROJECTILE) {
        if (e.y < -50 || e.y > this.height + 50) e.markedForDeletion = true;
      }

      // Particles
      if (e.type === EntityType.PARTICLE) {
        (e as Particle).life--;
        if ((e as Particle).life <= 0) e.markedForDeletion = true;
      }
      
      // Visual Effects
      if (e.type === EntityType.EFFECT) {
          (e as VisualEffect).life--;
          if ((e as VisualEffect).life <= 0) e.markedForDeletion = true;
      }
      
      // Coin Magnet (Patrick Powerup)
      if (e.type === EntityType.COIN) {
        if (this.activePowerups.has(PowerupType.MAGNET)) {
           const dx = this.player.x - e.x;
           const dy = this.player.y - e.y;
           const dist = Math.sqrt(dx*dx + dy*dy);
           if (dist < 400) { // Increased range
             e.x += dx * 0.08;
             e.y += dy * 0.08;
           }
        }
        if (e.y > this.height) e.markedForDeletion = true;
      }
      
      // Powerup float
      if (e.type === EntityType.POWERUP) {
          e.y += Math.sin(this.frameCount * 0.05) * 0.5; // Bobbing
          if (e.y > this.height) e.markedForDeletion = true;
      }

      // Boss Logic
      if (e.type === EntityType.BOSS) {
        this.updateBoss(e);
      }
      if (e.type === EntityType.MINI_BOSS) {
        this.updateMiniBoss(e);
      }
    });

    // --- Collision Detection ---
    this.checkCollisions();

    // --- Cleanup ---
    this.entities = this.entities.filter(e => !e.markedForDeletion);
    
    // --- Stats Update ---
    this.bgY = (this.bgY + 1) % this.height;
  }

  fireBullet() {
    audioService.playSound('shoot');
    
    const spawnBullet = (vx: number, vy: number, offsetX: number = 0) => {
      // Adjusted center calculation for larger ship
      const b = new Entity(EntityType.PROJECTILE, this.player.x + this.player.width / 2 - 5 + offsetX, this.player.y);
      b.width = 12;
      b.height = 12;
      b.vx = vx;
      b.vy = vy;
      b.color = '#6c63ff'; 
      this.entities.push(b);
    };

    let shotFired = false;

    // Stacking Shot Patterns
    if (this.activePowerups.has(PowerupType.TRIPLE_SHOT)) {
      // Brian: 3 bullets (Spread)
      spawnBullet(0, -10);      
      spawnBullet(-4, -9, -15);      
      spawnBullet(4, -9, 15);       
      shotFired = true;
    } 
    
    if (this.activePowerups.has(PowerupType.DOUBLE_SHOT)) {
      // New: 2 Parallel bullets
      spawnBullet(0, -10, -20); 
      spawnBullet(0, -10, 20);  
      shotFired = true;
    }
    
    // Default Shot if no weapon upgrades (or if you want a center stream with double shot, uncomment below)
    if (!shotFired) {
      spawnBullet(0, -10);
    } else if (this.activePowerups.has(PowerupType.DOUBLE_SHOT) && !this.activePowerups.has(PowerupType.TRIPLE_SHOT)) {
        // If ONLY Double shot is active, we don't fire center (parallel style)
        // If Triple IS active, it fires center, so we are good.
    }
  }

  spawnEnemies() {
    // Stop random spawning if ANY boss is active (Reference or Invader Wall)
    const invaderCount = this.entities.filter(e => e.type === EntityType.ENEMY_INVADER).length;
    if (this.bossRef || this.miniBossRef || invaderCount > 0) return; 

    // Powerup drop chance - REDUCED (30s)
    if (this.frameCount % 1800 === 0) {
        this.spawnPowerup(Math.random() * (this.width - 40), -40);
    }

    // Faster Spawning calculation per wave
    // Base 80, drops by 10 per wave, capped at 25 frames
    const currentRate = Math.max(25, GAME_CONFIG.BASE_SPAWN_RATE - ((this.wave - 1) * 10));

    if (this.frameCount % currentRate === 0) {
      const typeRoll = Math.random();
      const x = Math.random() * (this.width - 40);
      let enemyType = EntityType.ENEMY_DRONE;
      
      // Increased Swarm (Fly) probability in all phases
      // Higher difficulty mix earlier in higher waves
      if (this.stats.bossProgress < 0.3) {
        if (typeRoll > 0.7) enemyType = EntityType.ENEMY_SWARM;
      } else if (this.stats.bossProgress < 0.7) {
        if (typeRoll > 0.5) enemyType = EntityType.ENEMY_BRICK;
        else if (typeRoll > 0.8) enemyType = EntityType.ENEMY_SWARM;
      } else {
        if (typeRoll > 0.3) enemyType = EntityType.ENEMY_JOURNAL;
        else if (typeRoll > 0.6) enemyType = EntityType.ENEMY_BRICK;
        else if (typeRoll > 0.85) enemyType = EntityType.ENEMY_SWARM;
      }

      this.createEnemy(enemyType, x, -50);
    }
  }

  createEnemy(type: EntityType, x: number, y: number) {
    const e = new Entity(type, x, y);
    
    // Wave scaling
    const hpMult = 1 + (this.wave * 0.3); // Increased scaling
    const speedBoost = 1 + (this.wave * 0.1); // Speed up enemies per wave
    
    if (type === EntityType.ENEMY_DRONE) {
      e.vy = 2.5 * speedBoost; 
      e.hp = 2 * hpMult;
      e.color = '#aaaaaa'; 
      e.text = "🔒"; 
    } else if (type === EntityType.ENEMY_JOURNAL) {
      e.vy = 5 * speedBoost; 
      // Enhanced movement for Journals: Faster sine wave
      e.vx = Math.sin(this.frameCount * 0.2) * 4; 
      e.hp = 3 * hpMult;
      e.color = '#ff4444'; 
      e.text = "📕"; // Red Book (Predatory Journal)
      e.width = 40;
      e.height = 40;
    } else if (type === EntityType.ENEMY_BRICK) {
      e.vy = 1.5 * speedBoost;
      e.hp = 8 * hpMult;
      e.width = 40; // Square for Icon
      e.height = 40;
      e.color = '#ffbb33'; 
      e.text = "📰"; // Newspaper/Forms
    } else if (type === EntityType.ENEMY_SWARM) {
      e.vy = 3.5 * speedBoost;
      e.hp = 1 * hpMult;
      e.width = 20;
      e.height = 20;
      e.color = '#00C851'; 
      e.text = "🪰";
    } 

    this.entities.push(e);
  }

  spawnMiniBoss(num: number) {
    // Flashing Text Intro
    this.spawnFloatingText(this.width/2, this.height/2, "BOTTLENECK", "#FF4444");
    
    const mb = new Entity(EntityType.MINI_BOSS, this.width/2 - 50, -100);
    mb.width = 120; // Larger for image
    mb.height = 120;
    mb.hp = 50 + (this.wave * 30); // HP Scale
    mb.maxHp = mb.hp;
    mb.vy = 2; // Initial entry speed
    mb.color = '#ff4444';
    this.miniBossRef = mb;
    this.entities.push(mb);
  }
  
  spawnWallBoss() {
    // Flashing Text Intro
    this.spawnFloatingText(this.width/2, this.height/2, "PAYWALL", "#FF8800");
    
    // Spawn a grid of 24 blocks (3 rows of 8 cols)
    const rows = 3; 
    const cols = 8;
    const blockW = 40;
    const blockH = 30;
    const gap = 2; // Tiny gap to see individual blocks, but move as one
    const startX = (this.width - ((blockW+gap)*cols))/2;
    
    for (let r=0; r<rows; r++) {
        for (let c=0; c<cols; c++) {
            // Start high up
            const e = new Entity(EntityType.ENEMY_INVADER, startX + c*(blockW+gap), -200 + r*(blockH+gap));
            e.width = blockW;
            e.height = blockH;
            e.hp = 5 + (this.wave * 4); // Sturdy blocks, scale with wave
            e.color = '#FF8800';
            e.text = "🧱"; // Brick Icon
            e.vx = 0; // Handled by controller
            this.entities.push(e);
        }
    }
    
    // Reset controller vars
    this.invaderDirection = 1; 
  }
  
  updateWallBoss() {
      // Find all wall segments
      const invaders = this.entities.filter(e => e.type === EntityType.ENEMY_INVADER);
      if (invaders.length === 0) return;
      
      // Determine Group position (Top-most element)
      let minY = 10000;
      invaders.forEach(inv => {
          if (inv.y < minY) minY = inv.y;
      });

      // Entry Logic: Move WHOLE group down if top hasn't reached 50
      const isEntering = minY < 50;
      const verticalSpeed = isEntering ? 3 : 0;

      // Determine if edge hit (Left/Right) by scanning all blocks
      let hitEdge = false;
      invaders.forEach(inv => {
          if (inv.x + inv.width > this.width - 10 && this.invaderDirection > 0) hitEdge = true;
          if (inv.x < 10 && this.invaderDirection < 0) hitEdge = true;
      });
      
      // Standard Move Calculation
      let moveX = this.invaderDirection * (4 + (this.wave * 0.8)); // Faster horizontal move with wave
      let moveY = verticalSpeed;

      if (hitEdge && !isEntering) {
          this.invaderDirection *= -1;
          moveX = 0; 
          moveY += 30; // Drop down step
      }
      
      // Apply Movement to ALL invaders equally (Rigid Body)
      invaders.forEach(inv => {
          inv.x += moveX;
          inv.y += moveY;
      });
      
      // Shoot frequently (Aggressive)
      // Rate scales with wave
      const shootRate = Math.max(8, 20 - this.wave);
      if (this.frameCount % shootRate === 0) { 
          // Pick random shooter
          const shooter = invaders[Math.floor(Math.random() * invaders.length)];
          const b = new Entity(EntityType.PROJECTILE, shooter.x + shooter.width/2, shooter.y + shooter.height);
          b.vx = 0;
          b.vy = 7 + (this.wave * 0.5); // Faster bullets
          b.width = 10;
          b.height = 10;
          b.color = '#ff4444';
          b.text = "⛔";
          this.entities.push(b);
      }
  }

  updateMiniBoss(boss: Entity) {
     boss.attackTimer++;
     
     // AI MOVEMENT: Track Player X
     // Move towards player with lag
     const targetX = this.player.x + this.player.width/2 - boss.width/2;
     const dx = targetX - boss.x;
     
     // Only track if on screen
     if (boss.y > 0) {
        boss.x += dx * (0.03 + (this.wave * 0.005)); // Slightly faster tracking with wave
     }

     // Entry Logic
     if (boss.y < 100) {
        boss.vy = 2; // Moving into position
     } else {
        boss.vy = 0; // Hold Y position
        // Sway logic applied on top of tracking
        boss.x += Math.sin(boss.attackTimer * 0.05) * 3;
     }
     
     // Boundary Checks
     boss.x = Math.max(0, Math.min(this.width - boss.width, boss.x));
     
     // Shooting Logic (Standard Downward)
     const shootRate = Math.max(30, 60 - (this.wave * 5));
     if (boss.attackTimer % shootRate === 0) {
        const b = new Entity(EntityType.PROJECTILE, boss.x + boss.width/2, boss.y + boss.height);
        b.vx = 0;
        b.vy = 5 + (this.wave * 0.5);
        b.width = 12;
        b.height = 12;
        b.color = '#ff0000';
        b.text = "🔻";
        this.entities.push(b);
     }
  }

  spawnBoss() {
    audioService.playSound('boss_roar');
    this.spawnFloatingText(this.width/2, 200, "GATEKEEPER DETECTED", "#FF0000");
    // Spawn Giant Red Devil Alien
    const boss = new Entity(EntityType.BOSS, this.width / 2 - 100, -200);
    boss.width = 200;
    boss.height = 180;
    // BALANCE FIX: Nerfed Boss HP (was 200 + wave*100)
    // Scaled up for difficulty request
    boss.hp = 200 + (this.stats.wave * 150); 
    boss.maxHp = boss.hp;
    boss.color = '#990000';
    boss.text = "GATEKEEPER";
    boss.vy = 2; // Move in fast initially
    this.bossRef = boss;
    this.entities.push(boss);
  }

  updateBoss(boss: Entity) {
    boss.attackTimer++;
    
    // Difficulty Scaling based on Wave
    const speedMult = 1 + (this.stats.wave * 0.1);

    // Clamp Movement (Stay on screen)
    if (boss.y < 80) {
      boss.vy = 2;
    } else {
      boss.vy = 0;
      
      if (!boss.isCharging) {
          // AI: Hover & Stalk
          // Complex movement: Sine wave oscillation + Slow drift towards player
          const hoverOffset = Math.sin(boss.attackTimer * 0.03) * 3;
          
          const targetX = this.player.x + this.player.width/2 - boss.width/2;
          const dx = targetX - boss.x;
          
          // Drift towards player
          if (Math.abs(dx) > 10) {
             boss.x += (dx * 0.015) * speedMult;
          }
          boss.x += hoverOffset;
      }
    }
    
    // Boundary Checks
    boss.x = Math.max(0, Math.min(this.width - boss.width, boss.x));

    // --- Special Attack Logic ---
    // Every 400 frames, do a Special Attack
    const attackCycle = boss.attackTimer % 400;
    
    if (attackCycle < 250) {
        // Normal Phase: Shoot AIMED bullets
        boss.isCharging = false;
        // Faster fire rate with wave
        const fireRate = Math.max(25, 60 - (this.stats.wave * 8));
        
        if (boss.attackTimer % fireRate === 0) { 
          // Aim at player
          const cx = boss.x + boss.width/2;
          const cy = boss.y + boss.height - 20;
          const px = this.player.x + this.player.width/2;
          const py = this.player.y + this.player.height/2;
          
          const angle = Math.atan2(py - cy, px - cx);
          
          // Spread 3 bullets towards player
          const angles = [angle, angle - 0.2, angle + 0.2];
          
          angles.forEach(a => {
            const b = new Entity(EntityType.PROJECTILE, cx, cy);
            b.vx = Math.cos(a) * (6 + this.wave*0.5);
            b.vy = Math.sin(a) * (6 + this.wave*0.5);
            b.width = 15;
            b.height = 15;
            b.color = '#ff0000'; 
            b.text = "⛔"; 
            this.entities.push(b);
          });
        }
    } else if (attackCycle >= 250 && attackCycle < 320) {
        // Charging Phase
        boss.isCharging = true;
        boss.x += (Math.random() - 0.5) * 5; // Shake
        if (boss.attackTimer % 15 === 0) {
             this.spawnFloatingText(boss.x + boss.width/2, boss.y, "CHARGING BEAM!", "#ff0000");
        }
    } else if (attackCycle === 320) {
        // FIRE BEAM
        audioService.playSound('boss_roar');
        // Spawn a Beam entity that persists
        const beam = new Entity(EntityType.PROJECTILE, boss.x + boss.width/2 - 40, boss.y + boss.height - 20);
        beam.isBeam = true; // Special flag
        beam.width = 80;
        beam.height = this.height; // Extends to bottom
        beam.life = 70; // REDUCED LASER DURATION (was 120)
        beam.maxLife = 70;
        beam.color = '#ff0000';
        this.entities.push(beam);
    } else {
        // Cooldown
        boss.isCharging = false;
    }
  }

  spawnPowerup(x: number, y: number) {
    const r = Math.random();
    let type = PowerupType.DOUBLE_SHOT;
    
    // Distribute 4 powerups
    if (r < 0.25) type = PowerupType.DOUBLE_SHOT;
    else if (r < 0.5) type = PowerupType.TRIPLE_SHOT;
    else if (r < 0.75) type = PowerupType.MAGNET;
    else type = PowerupType.SHIELD;

    const p = new Entity(EntityType.POWERUP, x, y);
    p.text = type; 
    p.width = 36;
    p.height = 36;
    p.vy = 2.0; // Faster drop
    this.entities.push(p);
  }

  spawnCoin(x: number, y: number) {
    const c = new Entity(EntityType.COIN, x, y);
    c.width = 24; // Slightly larger for image
    c.height = 24;
    c.vy = 2.0;
    this.entities.push(c);
  }

  spawnExplosion(x: number, y: number, color: string) {
    audioService.playSound('explode');
    for (let i = 0; i < 8; i++) {
      this.entities.push(new Particle(x, y, color, 4));
    }
  }

  spawnFloatingText(x: number, y: number, text: string, color: string) {
    this.entities.push(new VisualEffect(x, y, 'text', text, color));
  }

  spawnRingEffect(x: number, y: number, color: string) {
    this.entities.push(new VisualEffect(x, y, 'ring', '', color));
  }

  checkCollisions() {
    const intersect = (r1: Entity, r2: Entity) => {
      return !(r2.x > r1.x + r1.width || 
               r2.x + r2.width < r1.x || 
               r2.y > r1.y + r1.height || 
               r2.y + r2.height < r1.y);
    };

    this.entities.forEach(e => {
      if (e.markedForDeletion) return;

      if (e.type === EntityType.POWERUP && intersect(this.player, e)) {
        e.markedForDeletion = true;
        const type = e.text as PowerupType;
        
        // Stack the powerup
        this.activePowerups.set(type, GAME_CONFIG.POWERUP_DURATION);
        
        audioService.playSound('powerup');
        
        // Spawn Visuals
        const cx = this.player.x + this.player.width/2;
        const cy = this.player.y + this.player.height/2;

        if (type === PowerupType.SHIELD) {
          this.invincibleTimer = GAME_CONFIG.SHIELD_DURATION;
          this.spawnFloatingText(cx, cy - 20, "SHIELD!", "#00C851");
          this.spawnRingEffect(cx, cy, "#00C851");
        } else if (type === PowerupType.MAGNET) {
          this.spawnFloatingText(cx, cy - 20, "MAGNET!", "#FFD700");
          this.spawnRingEffect(cx, cy, "#FFD700");
        } else if (type === PowerupType.TRIPLE_SHOT) {
          this.spawnFloatingText(cx, cy - 20, "TRIPLE SHOT!", "#6c63ff");
          this.spawnRingEffect(cx, cy, "#6c63ff");
        } else if (type === PowerupType.DOUBLE_SHOT) {
          this.spawnFloatingText(cx, cy - 20, "DOUBLE SHOT!", "#ffbb33");
          this.spawnRingEffect(cx, cy, "#ffbb33");
        }
      }

      if (e.type === EntityType.COIN && intersect(this.player, e)) {
        e.markedForDeletion = true;
        audioService.playSound('coin');
        this.stats.coins++;
        this.stats.totalCoins++; // Track total
        this.stats.score += (this.activePowerups.has(PowerupType.MAGNET) ? 2 : 1);
        
        if (this.stats.coins % 50 === 0 && this.lives < GAME_CONFIG.MAX_LIVES) {
          this.lives++;
          this.spawnFloatingText(this.player.x + this.player.width/2, this.player.y, "+1 LIFE", "#00C851");
        }
      }

      const isEnemy = e.type === EntityType.ENEMY_DRONE || e.type === EntityType.ENEMY_BRICK || e.type === EntityType.ENEMY_JOURNAL || e.type === EntityType.ENEMY_SWARM || e.type === EntityType.BOSS || e.type === EntityType.MINI_BOSS || e.type === EntityType.ENEMY_INVADER;
      const isBadBullet = e.type === EntityType.PROJECTILE && (e.color === '#ff0000' || e.isBeam); 
      
      const isInvincible = this.invincibleTimer > 0 || this.activePowerups.has(PowerupType.SHIELD);

      if ((isEnemy || isBadBullet) && intersect(this.player, e)) {
        if (isInvincible) {
           e.hp -= 5; 
           if (e.hp <= 0 && !e.isBeam) { // Don't delete beam on hit
             e.markedForDeletion = true;
             this.spawnExplosion(e.x, e.y, e.color);
           }
        } else {
          this.lives--;
          this.invincibleTimer = 60; 
          audioService.playSound('hit');
          this.spawnExplosion(this.player.x, this.player.y, '#ffffff');
          
          if (isBadBullet && !e.isBeam) e.markedForDeletion = true;
          
          if (this.lives <= 0) {
            this.gameActive = false;
          }
        }
      }

      if (e.type === EntityType.PROJECTILE && e.color !== '#ff0000' && !e.isBeam) {
         this.entities.forEach(target => {
            const isTargetEnemy = target.type === EntityType.ENEMY_DRONE || target.type === EntityType.ENEMY_BRICK || target.type === EntityType.ENEMY_JOURNAL || target.type === EntityType.ENEMY_SWARM || target.type === EntityType.BOSS || target.type === EntityType.MINI_BOSS || target.type === EntityType.ENEMY_INVADER;
            if (isTargetEnemy && intersect(e, target)) {
               e.markedForDeletion = true;
               target.hp--;
               
               if (target.hp <= 0) {
                 target.markedForDeletion = true;
                 this.spawnExplosion(target.x, target.y, target.color);
                 this.stats.enemiesDefeated++;
                 
                 // WAVE SCALING SCORE (2x multiplier per wave)
                 const waveMult = Math.pow(2, this.stats.wave - 1);
                 
                 // --- SPECIFIC ENEMY SCORING ---
                 let basePoints = 10;
                 if (target.type === EntityType.ENEMY_DRONE) basePoints = 10;
                 if (target.type === EntityType.ENEMY_SWARM) basePoints = 12;
                 if (target.type === EntityType.ENEMY_BRICK || target.type === EntityType.ENEMY_INVADER) basePoints = 15;
                 if (target.type === EntityType.ENEMY_JOURNAL) basePoints = 20;
                 
                 this.stats.score += basePoints * waveMult;
                 
                 // --- COIN DROP LOGIC ---
                 // ALL Enemies now drop coins when destroyed
                 this.spawnCoin(target.x + target.width/2, target.y + target.height/2);
                 
                 const isElite = target.type === EntityType.ENEMY_JOURNAL || target.type === EntityType.ENEMY_BRICK || target.type === EntityType.MINI_BOSS || target.type === EntityType.ENEMY_INVADER;
                 // Reduced spawn chance for powerups from elite (15%)
                 if (isElite && Math.random() > 0.85) {
                   this.spawnPowerup(target.x, target.y);
                 }

                 if (target.type === EntityType.MINI_BOSS) {
                     this.stats.score += 500 * waveMult;
                     this.spawnPowerup(target.x, target.y);
                     this.spawnPowerup(target.x + 40, target.y);
                     this.miniBossRef = null; // Clear Ref
                     
                     // Slightly boost progress to jump over checkpoint
                     this.waveProgressFrames += 120; // +2 seconds worth to nudge bar forward
                 }

                 // BOSS LOOT SHOWER
                 if (target.type === EntityType.BOSS) {
                    this.stats.score += 5000 * waveMult;
                    this.bossRef = null;
                    
                    // Spawn Loot
                    for(let i=0; i<15; i++) {
                        this.spawnCoin(target.x + Math.random()*target.width, target.y + Math.random()*target.height);
                    }
                    this.spawnPowerup(target.x + 50, target.y + 50);
                    this.spawnPowerup(target.x + 100, target.y + 50);
                    this.spawnPowerup(target.x + 50, target.y + 100);
                    this.spawnPowerup(target.x + 100, target.y + 100);
                    
                    this.spawnFloatingText(this.width/2, this.height/2, "WAVE COMPLETE!", "#00FF00");

                    // Short delay before next wave
                    setTimeout(() => {
                        this.startNextWave();
                    }, 2000);
                 }
               }
            }
         });
      }
    });
  }

  // Draw method to render everything
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    
    this.bgEntities.forEach(bg => bg.draw(ctx));
    
    this.entities.forEach(e => this.drawEntity(ctx, e));
    
    if (this.lives > 0) {
        this.drawEntity(ctx, this.player);
    }
  }
  
  // Custom Renderers for Bosses
  drawMiniBoss(ctx: CanvasRenderingContext2D, e: Entity) {
      // Draw Health Bar Above Boss (Increased Height/Visibility for Mobile)
      this.drawHealthBar(ctx, e, 12);

      const img = imageCache[ASSETS.BOTTLENECK_ICON];
      
      // Try image first, but if it fails (likely due to CORS/URL), use the procedural generator
      if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -e.width/2, -e.height/2, e.width, e.height);
      } else {
          // PROCEDURAL BOTTLENECK ROBOT (Fallback/Generator)
          ctx.save();
          
          const w = e.width;
          const h = e.height;
          
          // 1. Mechanical Arms (Behind)
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 4;
          for(let i=0; i<4; i++) {
              const angle = (Math.PI/4) + (i * Math.PI/2) + (Math.sin(this.frameCount * 0.1) * 0.2);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              // Elbow
              const ex = Math.cos(angle) * w * 0.6;
              const ey = Math.sin(angle) * h * 0.6;
              // Claw
              const cx = Math.cos(angle) * w * 0.8;
              const cy = Math.sin(angle) * h * 0.8;
              
              ctx.quadraticCurveTo(ex, ey, cx, cy);
              ctx.stroke();
              
              // Claw Tip
              ctx.fillStyle = '#9ca3af';
              ctx.beginPath();
              ctx.arc(cx, cy, 5, 0, Math.PI*2);
              ctx.fill();
          }

          // 2. The Funnel (Top)
          const gradient = ctx.createLinearGradient(0, -h/2, 0, h/2);
          gradient.addColorStop(0, '#818cf8'); // Indigo
          gradient.addColorStop(0.5, '#4f46e5'); // Darker Indigo
          gradient.addColorStop(1, '#312e81');
          
          ctx.fillStyle = gradient;
          ctx.strokeStyle = '#a5b4fc';
          ctx.lineWidth = 2;
          
          // Funnel Shape
          ctx.beginPath();
          ctx.moveTo(-w/2, -h/2); // Top Left
          ctx.lineTo(w/2, -h/2);  // Top Right
          ctx.lineTo(w/4, 0);     // Neck Right
          ctx.lineTo(w/3, h/3);   // Bulb Right
          ctx.lineTo(0, h/2);     // Bottom Tip
          ctx.lineTo(-w/3, h/3);  // Bulb Left
          ctx.lineTo(-w/4, 0);    // Neck Left
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // 3. Glowing Core (The Bottleneck)
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#fbbf24';
          ctx.fillStyle = '#fef3c7';
          ctx.beginPath();
          ctx.ellipse(0, -10, w/6, h/8, 0, 0, Math.PI*2);
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // 4. "BOTTLENECK" Label
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText("BOTTLENECK", 0, h/4);

          ctx.restore();
      }
  }

  drawBoss(ctx: CanvasRenderingContext2D, e: Entity) {
      // Draw Health Bar Above Boss (Increased Height/Visibility for Mobile)
      this.drawHealthBar(ctx, e, 12);

      // "Gatekeeper" - Sci-Fi Portal/Gate Structure
      ctx.save();
      
      // Charging Visuals
      if (e.isCharging) {
          ctx.shadowBlur = 50;
          ctx.shadowColor = '#fff';
      } else {
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#ff0000';
      }
      
      const w = e.width;
      const h = e.height;
      const hw = w/2;
      const hh = h/2;

      // Pillars (Gate Posts)
      ctx.fillStyle = '#4a0d0d'; // Dark armored red
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 4;
      
      // Left Pillar
      ctx.fillRect(-hw, -hh, w/4, h);
      ctx.strokeRect(-hw, -hh, w/4, h);
      
      // Right Pillar
      ctx.fillRect(hw - w/4, -hh, w/4, h);
      ctx.strokeRect(hw - w/4, -hh, w/4, h);
      
      // Top Arch
      ctx.beginPath();
      ctx.moveTo(-hw + w/4, -hh + 20);
      ctx.lineTo(hw - w/4, -hh + 20);
      ctx.lineTo(hw - w/4, -hh + 50);
      ctx.lineTo(0, -hh + 80); // Center dip
      ctx.lineTo(-hw + w/4, -hh + 50);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Center Core (The Eye)
      ctx.fillStyle = e.isCharging ? '#fff' : '#000';
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI*2);
      ctx.fill();
      
      // Spinning Rings around core
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 50, 10, this.frameCount * 0.1, 0, Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, 50, 10, -this.frameCount * 0.1, 0, Math.PI*2);
      ctx.stroke();

      ctx.restore();
  }

  drawHealthBar(ctx: CanvasRenderingContext2D, e: Entity, height: number = 8) {
      ctx.save();
      const barWidth = e.width;
      const barHeight = height;
      const yOffset = -e.height/2 - 20; // Pushed up slightly more
      
      // Background (Black/Red)
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.fillRect(-barWidth/2, yOffset, barWidth, barHeight);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; // Brighter border
      ctx.lineWidth = 1;
      ctx.strokeRect(-barWidth/2, yOffset, barWidth, barHeight);
      
      // Fill
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = pct > 0.5 ? '#00FF00' : '#FF0000';
      ctx.fillRect(-barWidth/2 + 1, yOffset + 1, (barWidth-2) * pct, barHeight - 2);
      
      ctx.restore();
  }
  
  drawLaser(ctx: CanvasRenderingContext2D, e: Entity) {
      const flicker = Math.random() * 10;
      ctx.save();
      
      // Core Beam
      ctx.fillStyle = '#FFF';
      ctx.fillRect(e.x + 10, e.y, e.width - 20, e.height);
      
      // Outer Glow
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(e.x - flicker, e.y, e.width + flicker*2, e.height);
      
      // Particles/Sparks
      for(let i=0; i<5; i++) {
         ctx.fillStyle = '#FFDD00';
         const px = e.x + Math.random() * e.width;
         const py = e.y + Math.random() * e.height;
         ctx.fillRect(px, py, 4, 20);
      }
      
      ctx.restore();
  }

  drawEntity(ctx: CanvasRenderingContext2D, e: Entity) {
    if (e.isBeam) {
        this.drawLaser(ctx, e);
        return;
    }

    ctx.save();
    ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
    
    if (e.type === EntityType.PLAYER) {
       const img = imageCache[ASSETS.PLAYER_SHIP];
       
       // --- Active Powerup Visuals (STACKED) ---
       
       // Patrick: Magnet Aura
       if (this.activePowerups.has(PowerupType.MAGNET)) {
           const pulse = Math.sin(this.frameCount * 0.1) * 5;
           ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)'; // Gold
           ctx.lineWidth = 2;
           ctx.beginPath();
           ctx.arc(0, 0, e.width/2 + 10 + pulse, 0, Math.PI * 2);
           ctx.stroke();
           
           // Inner waves
           ctx.beginPath();
           ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
           ctx.arc(0, 0, e.width/2 + pulse, 0, Math.PI * 2);
           ctx.stroke();
       }

       // Brian: Triple Shot Drones
       if (this.activePowerups.has(PowerupType.TRIPLE_SHOT)) {
           const offset = 55;
           ctx.fillStyle = '#6c63ff';
           // Left drone
           ctx.fillRect(-offset, 0, 10, 20);
           // Right drone
           ctx.fillRect(offset - 10, 0, 10, 20);
           
           // Connecting beams
           ctx.strokeStyle = '#6c63ff';
           ctx.lineWidth = 1;
           ctx.beginPath();
           ctx.moveTo(-offset + 5, 10);
           ctx.lineTo(0, 0);
           ctx.moveTo(offset - 5, 10);
           ctx.lineTo(0, 0);
           ctx.stroke();
       }

       // Double Shot Visuals
       if (this.activePowerups.has(PowerupType.DOUBLE_SHOT)) {
           const offset = 40;
           ctx.fillStyle = '#ffbb33';
           // Left gun
           ctx.fillRect(-offset, 0, 5, 15);
           // Right gun
           ctx.fillRect(offset - 5, 0, 5, 15);
       }

       // Jeffrey: Invincible Shield
       if (this.activePowerups.has(PowerupType.SHIELD) || this.invincibleTimer > 60) {
         ctx.save();
         ctx.rotate(this.frameCount * 0.05);
         ctx.strokeStyle = '#00C851';
         ctx.lineWidth = 3;
         ctx.setLineDash([15, 10]); // Dashed shield
         ctx.beginPath();
         ctx.arc(0, 0, e.width/2 + 15, 0, Math.PI * 2);
         ctx.stroke();
         ctx.restore();
       }

       // Ship Image
       if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -e.width / 2, -e.height / 2, e.width, e.height);
       } else {
         ctx.fillStyle = '#6c63ff';
         ctx.fillRect(-20, -20, 40, 40);
       }

    } else if (e.type === EntityType.POWERUP) {
        const type = e.text as PowerupType;
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        
        // Circular clip for all powerups
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.clip();
        
        let imgUrl = ASSETS.FOUNDER_4; // Default Double Shot
        if (type === PowerupType.TRIPLE_SHOT) imgUrl = ASSETS.FOUNDER_BRIAN;
        if (type === PowerupType.MAGNET) imgUrl = ASSETS.FOUNDER_PATRICK;
        if (type === PowerupType.SHIELD) imgUrl = ASSETS.FOUNDER_JEFFREY;
        if (type === PowerupType.DOUBLE_SHOT) imgUrl = ASSETS.FOUNDER_4;
        
        const img = imageCache[imgUrl];
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, -18, -18, 36, 36);
        } else {
            ctx.fillStyle = '#fff';
            ctx.fillRect(-18, -18, 36, 36);
        }
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;

    } else if (e.type === EntityType.MINI_BOSS) {
        this.drawMiniBoss(ctx, e);
    } else if (e.type === EntityType.BOSS) {
        this.drawBoss(ctx, e);
    } else if (e.type === EntityType.ENEMY_INVADER) {
        // Wall Segment Visual - BRICK EMOJI
        // ctx.fillStyle = e.color; // Old rect code
        // ctx.fillRect(-e.width/2, -e.height/2, e.width, e.height);
        
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.text || "🧱", 0, 0);

    } else if (e.type === EntityType.COIN) {
        // --- UPDATED COIN RENDERING ---
        const img = imageCache[ASSETS.RSC_TOKEN];
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            // Glow effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FFD700'; // Gold
            
            // Circular Clip
            ctx.beginPath();
            ctx.arc(0, 0, e.width/2, 0, Math.PI*2);
            ctx.clip();
            
            ctx.drawImage(img, -e.width/2, -e.height/2, e.width, e.height);
            
            // Border ring
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
        } else {
            // Fallback
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = '8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("RSC", 0, 0);
        }

    } else if (e.type === EntityType.PARTICLE) {
        ctx.fillStyle = e.color;
        ctx.fillRect(-2, -2, 4, 4);
    } else if (e.type === EntityType.EFFECT) {
        const eff = e as VisualEffect;
        if (eff.effectType === 'text') {
            ctx.font = 'bold 32px Orbitron';
            ctx.textAlign = 'center';
            ctx.globalAlpha = eff.life / eff.maxLife;

            // Electric Text Effect for "WAVE"
            if (eff.text?.startsWith("WAVE")) {
                const jitterX = (Math.random() - 0.5) * 4;
                const jitterY = (Math.random() - 0.5) * 4;
                
                // Outer glow
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00FFFF'; // Cyan Glow
                
                // Color Cycling
                ctx.fillStyle = this.frameCount % 10 < 5 ? '#FFF' : '#00FFFF';
                
                ctx.fillText(eff.text || "", jitterX, jitterY);
                
                // Lightning bolts (simulated with lines)
                if (Math.random() > 0.7) {
                    ctx.strokeStyle = '#FFF';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-50, 0);
                    ctx.lineTo(50, (Math.random()-0.5)*20);
                    ctx.stroke();
                }
                
                ctx.shadowBlur = 0;
            } else {
                // Standard Text
                ctx.fillStyle = eff.color;
                ctx.fillText(eff.text || "", 0, 0);
            }
            
            ctx.globalAlpha = 1;
        } else if (eff.effectType === 'ring') {
            const progress = 1 - (eff.life / eff.maxLife);
            ctx.strokeStyle = eff.color;
            ctx.lineWidth = 3 * (1-progress);
            ctx.globalAlpha = 1 - progress;
            ctx.beginPath();
            ctx.arc(0, 0, 10 + (progress * 80), 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    } else if (e.type === EntityType.PROJECTILE) {
        if (e.text) { 
           ctx.font = '24px serif';
           ctx.textAlign = 'center';
           ctx.textBaseline = 'middle';
           ctx.fillText(e.text, 0, 0);
        } else {
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(0, 0, e.width/2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // Fallback or Standard Enemy (Lock, Forms, Journal, etc)
        if (e.text) {
          ctx.font = '24px Arial'; // Better emoji font
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(e.text, 0, 0);
        } else {
          ctx.fillStyle = e.color;
          ctx.fillRect(-e.width/2, -e.height/2, e.width, e.height);
        }
    }
    
    ctx.restore();
  }
}
