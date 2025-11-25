
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
  text?: string; 
  angle: number = 0;
  
  // Lifecycle props
  life: number = 0;
  maxLife: number = 0;

  // Boss Props
  attackTimer: number = 0;
  isCharging: boolean = false;
  isBeam: boolean = false; 
  
  constructor(type: EntityType, x: number, y: number) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.color = '#FFF';
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
  effectType: 'text' | 'ring';
  constructor(x: number, y: number, type: 'text' | 'ring', content: string = '', color: string = '#FFF') {
    super(EntityType.EFFECT, x, y);
    this.effectType = type;
    this.text = content;
    this.color = color;
    this.life = 60;
    this.maxLife = 60;
    
    if (type === 'text') {
        this.vy = -0.5;
        this.life = 120;
        this.maxLife = 120;
    }
  }
}

class Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  twinkleDir: number;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.size = Math.random() * 1.5 + 0.5; 
    this.speed = this.size * 0.2; 
    this.alpha = 0.3 + Math.random() * 0.7;
    this.twinkleDir = Math.random() > 0.5 ? 0.01 : -0.01;
  }

  update(width: number, height: number) {
    this.y += this.speed;
    this.x -= this.speed * 0.1; // Slight angle for depth

    // Twinkle effect
    this.alpha += this.twinkleDir;
    if (this.alpha > 1) {
       this.alpha = 1;
       this.twinkleDir *= -1;
    } else if (this.alpha < 0.2) {
       this.alpha = 0.2;
       this.twinkleDir *= -1;
    }

    if (this.y > height) {
      this.y = 0;
      this.x = Math.random() * width;
    }
    if (this.x < 0) {
      this.x = width;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
    ctx.fillRect(this.x, this.y, this.size, this.size);
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
      this.speed = 0.2 + Math.random() * 0.3; 
      const hues = [240, 260, 280, 200];
      const hue = hues[Math.floor(Math.random() * hues.length)];
      this.color = `hsl(${hue}, 40%, 20%)`; 
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
      this.x = Math.random() * 1000;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 0.2; 

    if (this.type === 'planet') {
      const gradient = ctx.createRadialGradient(this.x, this.y, this.size * 0.2, this.x, this.y, this.size);
      gradient.addColorStop(0, this.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(this.x - this.size*0.3, this.y - this.size*0.3, this.size, 0, Math.PI * 2);
      ctx.fill();

    } else {
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
      gradient.addColorStop(0, this.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(this.x - this.size, this.y - this.size, this.size*2, this.size*2);
    }
    ctx.restore();
  }
}

const imageCache: Record<string, HTMLImageElement> = {};
const loadImage = (url: string) => {
  if (imageCache[url]) return imageCache[url];
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  imageCache[url] = img;
  return img;
};

export class GameEngine {
  width: number = 0;
  height: number = 0;
  player: Entity;
  entities: Entity[] = [];
  bgEntities: BackgroundEntity[] = [];
  stars: Star[] = [];
  stats: Stats;
  keys: Record<string, boolean> = {};
  touchPos: { x: number, y: number } | null = null;
  wave: number = 1;
  frameCount: number = 0;
  bgY: number = 0;
  gameActive: boolean = false;
  lives: number = GAME_CONFIG.PLAYER_LIVES;
  invincibleTimer: number = 0;
  activePowerups: Map<PowerupType, number> = new Map();
  bossRef: Entity | null = null;
  miniBossRef: Entity | null = null;
  spawnedMiniBoss1: boolean = false;
  spawnedWallBoss: boolean = false;
  invaderDirection: number = 1;
  invaderMoveTimer: number = 0;
  waveProgressFrames: number = 0;
  inBossWarningSequence: boolean = false;
  bossWarningFrame: number = 0;
  pendingBossType: 'mini1' | 'wall' | 'gatekeeper' | null = null;
  
  constructor(stats: Stats) {
    this.stats = stats;
    this.player = new Entity(EntityType.PLAYER, 0, 0);
    this.player.width = 100;
    this.player.height = 100; 
    
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
    this.stars = [];

    for (let i = 0; i < 6; i++) {
        this.bgEntities.push(new BackgroundEntity(width, height));
    }
    for (let i = 0; i < 150; i++) {
      this.stars.push(new Star(width, height));
    }

    this.gameActive = true;
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
    this.inBossWarningSequence = false;
    this.pendingBossType = null;
  }

  startNextWave() {
    this.wave++;
    this.stats.wave++;
    this.resetWaveProgress();
    this.entities = this.entities.filter(e => e.type === EntityType.PLAYER || e.type === EntityType.PARTICLE || e.type === EntityType.POWERUP || e.type === EntityType.COIN);
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

  startBossWarning(type: 'mini1' | 'wall' | 'gatekeeper') {
    this.inBossWarningSequence = true;
    this.bossWarningFrame = 90; // 1.5 Seconds Warning
    this.pendingBossType = type;
    audioService.playSound('boss_roar');
  }

  update() {
    if (!this.gameActive) return;
    this.frameCount++;
    this.stats.lives = this.lives;
    
    const invaderCount = this.entities.filter(e => e.type === EntityType.ENEMY_INVADER).length;
    const isBossAlive = !!this.bossRef || !!this.miniBossRef || invaderCount > 0;
    
    if (isBossAlive) {
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
            hp = invaderCount; 
            maxHp = 12; // 2 rows * 6 cols = 12
        }
        
        this.stats.bossHp = hp;
        this.stats.bossMaxHp = maxHp;
        if (invaderCount > 0) this.updateWallBoss();

    } else {
        this.stats.isBossActive = false;

        // Progress bar logic
        if (!this.inBossWarningSequence) {
             this.waveProgressFrames++;
             const totalDuration = GAME_CONFIG.WAVE_DURATION_FRAMES;
             this.stats.bossProgress = Math.min(1, this.waveProgressFrames / totalDuration);
        }
        
        // CHECKPOINT 1: 33% (Mini Boss 1 - Bottleneck)
        if (this.stats.bossProgress >= 0.33 && !this.spawnedMiniBoss1) {
             if (!this.inBossWarningSequence) {
                 this.startBossWarning('mini1');
             }
        }
        // CHECKPOINT 2: 66% (Mini Boss 2 - The Wall)
        else if (this.stats.bossProgress >= 0.66 && !this.spawnedWallBoss) {
             if (!this.inBossWarningSequence) {
                 this.startBossWarning('wall');
             }
        }
        // CHECKPOINT 3: 100% (Final Boss)
        else if (this.stats.bossProgress >= 1 && !this.bossRef) {
             if (!this.inBossWarningSequence) {
                 this.startBossWarning('gatekeeper');
             }
        }
    }
    
    if (this.inBossWarningSequence) {
        this.bossWarningFrame--;
        if (this.bossWarningFrame <= 0) {
            this.inBossWarningSequence = false;
            
            if (this.pendingBossType === 'mini1') {
                this.spawnMiniBoss(1);
                this.spawnedMiniBoss1 = true;
            } else if (this.pendingBossType === 'wall') {
                this.spawnWallBoss();
                this.spawnedWallBoss = true;
            } else if (this.pendingBossType === 'gatekeeper') {
                this.spawnBoss();
            }
            this.pendingBossType = null;
        }
    }

    this.stars.forEach(star => star.update(this.width, this.height));
    this.bgEntities.forEach(bg => bg.update(this.height));

    const speed = GAME_CONFIG.BASE_PLAYER_SPEED + (this.stats.upgrades.speed * 2.0);
    
    if (this.touchPos) {
      const smoothing = 0.08 + (this.stats.upgrades.speed * 0.05);
      const dx = this.touchPos.x - (this.player.x + this.player.width/2);
      const dy = this.touchPos.y - 80 - (this.player.y + this.player.height/2);
      this.player.x += dx * smoothing;
      this.player.y += dy * smoothing;
    } else {
      if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) this.player.x -= speed;
      if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) this.player.x += speed;
      if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) this.player.y -= speed;
      if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) this.player.y += speed;
    }

    this.player.x = Math.max(0, Math.min(this.width - this.player.width, this.player.x));
    this.player.y = Math.max(0, Math.min(this.height - this.player.height, this.player.y));

    const fireInterval = Math.max(4, 10 - (this.stats.upgrades.fireRate * 2));
    
    if ((this.keys[' '] || this.touchPos || this.keys['Enter']) && this.frameCount % fireInterval === 0) {
      this.fireBullet();
    }

    for (const [type, timer] of this.activePowerups) {
        if (timer > 0) this.activePowerups.set(type, timer - 1);
        else this.activePowerups.delete(type);
    }
    
    if (this.invincibleTimer > 0) this.invincibleTimer--;

    this.spawnEnemies();

    this.entities.forEach(e => {
      if (e.isBeam) {
          e.life--;
          if (e.life <= 0) e.markedForDeletion = true;
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

      if (e.type === EntityType.ENEMY_DRONE || e.type === EntityType.ENEMY_JOURNAL || e.type === EntityType.ENEMY_SWARM || e.type === EntityType.ENEMY_BRICK) {
        if (e.type === EntityType.ENEMY_SWARM) {
          const dx = this.player.x - e.x;
          e.vx += dx * 0.002;
          e.vx *= 0.95; 
        }
        if (e.y > this.height) e.markedForDeletion = true;
      }
      
      if (e.type === EntityType.PROJECTILE) {
        if (e.y < -50 || e.y > this.height + 50) e.markedForDeletion = true;
      }

      if (e.type === EntityType.PARTICLE) {
        (e as Particle).life--;
        if ((e as Particle).life <= 0) e.markedForDeletion = true;
      }
      
      if (e.type === EntityType.EFFECT) {
          (e as VisualEffect).life--;
          if ((e as VisualEffect).life <= 0) e.markedForDeletion = true;
      }
      
      if (e.type === EntityType.COIN) {
        if (this.activePowerups.has(PowerupType.MAGNET)) {
           const dx = this.player.x - e.x;
           const dy = this.player.y - e.y;
           const dist = Math.sqrt(dx*dx + dy*dy);
           if (dist < 400) {
             e.x += dx * 0.08;
             e.y += dy * 0.08;
           }
        }
        if (e.y > this.height) e.markedForDeletion = true;
      }
      
      if (e.type === EntityType.POWERUP) {
          e.y += Math.sin(this.frameCount * 0.05) * 0.5;
          if (e.y > this.height) e.markedForDeletion = true;
      }

      if (e.type === EntityType.BOSS) {
        this.updateBoss(e);
      }
      if (e.type === EntityType.MINI_BOSS) {
        this.updateMiniBoss(e);
      }
    });

    this.checkCollisions();
    this.entities = this.entities.filter(e => !e.markedForDeletion);
    this.bgY = (this.bgY + 1) % this.height;
  }

  fireBullet() {
    audioService.playSound('shoot');
    const spawnBullet = (vx: number, vy: number, offsetX: number = 0) => {
      const b = new Entity(EntityType.PROJECTILE, this.player.x + this.player.width / 2 - 5 + offsetX, this.player.y);
      b.width = 12;
      b.height = 12;
      b.vx = vx;
      b.vy = vy;
      b.color = '#6c63ff'; 
      this.entities.push(b);
    };

    let shotFired = false;
    if (this.activePowerups.has(PowerupType.TRIPLE_SHOT)) {
      spawnBullet(0, -10);      
      spawnBullet(-4, -9, -15);      
      spawnBullet(4, -9, 15);       
      shotFired = true;
    } 
    
    if (this.activePowerups.has(PowerupType.DOUBLE_SHOT)) {
      spawnBullet(0, -10, -20); 
      spawnBullet(0, -10, 20);  
      shotFired = true;
    }
    
    if (!shotFired) {
      spawnBullet(0, -10);
    }
  }

  spawnEnemies() {
    const invaderCount = this.entities.filter(e => e.type === EntityType.ENEMY_INVADER).length;
    if (this.bossRef || this.miniBossRef || invaderCount > 0 || this.inBossWarningSequence) return; 

    if (this.frameCount % 1800 === 0) {
        this.spawnPowerup(Math.random() * (this.width - 40), -40);
    }

    const currentRate = Math.max(25, GAME_CONFIG.BASE_SPAWN_RATE - ((this.wave - 1) * 10));

    if (this.frameCount % currentRate === 0) {
      const typeRoll = Math.random();
      const x = Math.random() * (this.width - 40);
      let enemyType = EntityType.ENEMY_DRONE;
      
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
    const hpMult = 1 + (this.wave * 0.3);
    const speedBoost = 1 + (this.wave * 0.1);
    
    if (type === EntityType.ENEMY_DRONE) {
      e.vy = 2.5 * speedBoost; 
      e.hp = 2 * hpMult;
      e.color = '#aaaaaa'; 
      e.text = "🔒"; 
    } else if (type === EntityType.ENEMY_JOURNAL) {
      e.vy = 5 * speedBoost; 
      e.vx = Math.sin(this.frameCount * 0.2) * 4; 
      e.hp = 3 * hpMult;
      e.color = '#ff4444'; 
      e.text = "📕"; 
      e.width = 40;
      e.height = 40;
    } else if (type === EntityType.ENEMY_BRICK) {
      e.vy = 1.5 * speedBoost;
      e.hp = 8 * hpMult;
      e.width = 40;
      e.height = 40;
      e.color = '#ffbb33'; 
      e.text = "📰";
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
    const mb = new Entity(EntityType.MINI_BOSS, this.width/2 - 50, -100);
    mb.width = 120;
    mb.height = 120;
    mb.hp = 50 + (this.wave * 30);
    mb.maxHp = mb.hp;
    mb.vy = 2;
    mb.color = '#ff4444';
    this.miniBossRef = mb;
    this.entities.push(mb);
  }
  
  spawnWallBoss() {
    const rows = 2; // UPDATED to 2 rows
    const cols = 6; 
    const isMobile = this.width < 600;
    // MADE BLOCKS BIGGER
    const blockW = isMobile ? 38 : 48;
    const blockH = isMobile ? 32 : 40;
    const gap = 2;
    const startX = (this.width - ((blockW+gap)*cols))/2;
    
    for (let r=0; r<rows; r++) {
        for (let c=0; c<cols; c++) {
            const e = new Entity(EntityType.ENEMY_INVADER, startX + c*(blockW+gap), -200 + r*(blockH+gap));
            e.width = blockW;
            e.height = blockH;
            e.hp = 5 + (this.wave * 4);
            e.color = '#B22222'; 
            e.text = "🧱"; // UPDATED to Brick Emoji
            e.vx = 0;
            this.entities.push(e);
        }
    }
    this.invaderDirection = 1; 
  }
  
  updateWallBoss() {
      const invaders = this.entities.filter(e => e.type === EntityType.ENEMY_INVADER);
      if (invaders.length === 0) return;
      
      let minY = 10000;
      invaders.forEach(inv => { if (inv.y < minY) minY = inv.y; });

      const isEntering = minY < 50;
      // SLOWER ENTRY FOR WAVE 1: 1.5 speed base
      const verticalSpeed = isEntering ? (1.5 + (this.wave - 1)) : 0; 
      
      let hitEdge = false;
      invaders.forEach(inv => {
          if (inv.x + inv.width > this.width - 10 && this.invaderDirection > 0) hitEdge = true;
          if (inv.x < 10 && this.invaderDirection < 0) hitEdge = true;
      });
      
      let moveX = this.invaderDirection * (2 + (this.wave * 0.3));
      let moveY = verticalSpeed;

      if (hitEdge && !isEntering) {
          this.invaderDirection *= -1;
          moveX = 0; 
          moveY += 15; 
      }
      
      invaders.forEach(inv => {
          inv.x += moveX;
          inv.y += moveY;
      });
      
      const shootRate = Math.max(8, 20 - this.wave);
      if (this.frameCount % shootRate === 0) { 
          const shooter = invaders[Math.floor(Math.random() * invaders.length)];
          const b = new Entity(EntityType.PROJECTILE, shooter.x + shooter.width/2, shooter.y + shooter.height);
          b.vx = 0;
          b.vy = 7 + (this.wave * 0.5);
          b.width = 14; 
          b.height = 14; 
          b.color = '#ff4444';
          // Solid projectile
          this.entities.push(b);
      }
  }

  updateMiniBoss(boss: Entity) {
     boss.attackTimer++;
     const targetX = this.player.x + this.player.width/2 - boss.width/2;
     const dx = targetX - boss.x;
     if (boss.y > 0) boss.x += dx * (0.03 + (this.wave * 0.005));

     if (boss.y < 100) boss.vy = 2;
     else {
        boss.vy = 0;
        boss.x += Math.sin(boss.attackTimer * 0.05) * 3;
     }
     
     boss.x = Math.max(0, Math.min(this.width - boss.width, boss.x));
     
     const shootRate = Math.max(30, 60 - (this.wave * 5));
     if (boss.attackTimer % shootRate === 0) {
        const b = new Entity(EntityType.PROJECTILE, boss.x + boss.width/2, boss.y + boss.height);
        b.vx = 0;
        b.vy = 5 + (this.wave * 0.5);
        b.width = 16; 
        b.height = 16; 
        b.color = '#ff0000';
        this.entities.push(b);
     }
  }

  spawnBoss() {
    const boss = new Entity(EntityType.BOSS, this.width / 2 - 100, -200);
    boss.width = 200;
    boss.height = 180;
    boss.hp = 200 + (this.stats.wave * 150); 
    boss.maxHp = boss.hp;
    boss.color = '#990000';
    boss.text = "GATEKEEPER";
    boss.vy = 2;
    this.bossRef = boss;
    this.entities.push(boss);
  }

  updateBoss(boss: Entity) {
    boss.attackTimer++;
    const speedMult = 1 + (this.stats.wave * 0.1);
    if (boss.y < 80) boss.vy = 2;
    else {
      boss.vy = 0;
      if (!boss.isCharging) {
          const hoverOffset = Math.sin(boss.attackTimer * 0.03) * 3;
          const targetX = this.player.x + this.player.width/2 - boss.width/2;
          const dx = targetX - boss.x;
          if (Math.abs(dx) > 10) boss.x += (dx * 0.015) * speedMult;
          boss.x += hoverOffset;
      }
    }
    
    boss.x = Math.max(0, Math.min(this.width - boss.width, boss.x));
    const attackCycle = boss.attackTimer % 400;
    
    if (attackCycle < 250) {
        boss.isCharging = false;
        const fireRate = Math.max(25, 60 - (this.stats.wave * 8));
        if (boss.attackTimer % fireRate === 0) { 
          const cx = boss.x + boss.width/2;
          const cy = boss.y + boss.height - 20;
          const px = this.player.x + this.player.width/2;
          const py = this.player.y + this.player.height/2;
          const angle = Math.atan2(py - cy, px - cx);
          const angles = [angle, angle - 0.2, angle + 0.2];
          angles.forEach(a => {
            const b = new Entity(EntityType.PROJECTILE, cx, cy);
            b.vx = Math.cos(a) * (6 + this.wave*0.5);
            b.vy = Math.sin(a) * (6 + this.wave*0.5);
            b.width = 15;
            b.height = 15;
            b.color = '#ff0000'; 
            b.text = ""; 
            this.entities.push(b);
          });
        }
    } else if (attackCycle >= 250 && attackCycle < 320) {
        boss.isCharging = true;
        boss.x += (Math.random() - 0.5) * 5; 
        if (boss.attackTimer % 15 === 0) {
             this.spawnFloatingText(boss.x + boss.width/2, boss.y, "CHARGING BEAM!", "#ff0000");
        }
    } else if (attackCycle === 320) {
        audioService.playSound('boss_roar');
        const beam = new Entity(EntityType.PROJECTILE, boss.x + boss.width/2 - 40, boss.y + boss.height - 20);
        beam.isBeam = true; 
        beam.width = 80;
        beam.height = this.height;
        beam.life = 70;
        beam.maxLife = 70;
        beam.color = '#ff0000';
        this.entities.push(beam);
    } else {
        boss.isCharging = false;
    }
  }

  spawnPowerup(x: number, y: number) {
    const r = Math.random();
    let type = PowerupType.DOUBLE_SHOT;
    if (r < 0.25) type = PowerupType.DOUBLE_SHOT;
    else if (r < 0.5) type = PowerupType.TRIPLE_SHOT;
    else if (r < 0.75) type = PowerupType.MAGNET;
    else type = PowerupType.SHIELD;

    const p = new Entity(EntityType.POWERUP, x, y);
    p.text = type; 
    p.width = 36;
    p.height = 36;
    p.vy = 2.0;
    this.entities.push(p);
  }

  spawnCoin(x: number, y: number) {
    const c = new Entity(EntityType.COIN, x, y);
    c.width = 24; 
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
    // TIGHTEN HITBOX: Use 60% of player size centered for fair dodging
    const intersect = (r1: Entity, r2: Entity) => {
      let x1 = r1.x, y1 = r1.y, w1 = r1.width, h1 = r1.height;
      if (r1.type === EntityType.PLAYER) {
          const paddingX = r1.width * 0.2; // 20% padding each side
          const paddingY = r1.height * 0.2;
          x1 += paddingX;
          y1 += paddingY;
          w1 -= paddingX * 2;
          h1 -= paddingY * 2;
      }
      return !(r2.x > x1 + w1 || r2.x + r2.width < x1 || r2.y > y1 + h1 || r2.y + r2.height < y1);
    };

    this.entities.forEach(e => {
      if (e.markedForDeletion) return;

      if (e.type === EntityType.POWERUP && intersect(this.player, e)) {
        e.markedForDeletion = true;
        const type = e.text as PowerupType;
        this.activePowerups.set(type, GAME_CONFIG.POWERUP_DURATION);
        audioService.playSound('powerup');
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
        this.stats.totalCoins++; 
        this.stats.score += (this.activePowerups.has(PowerupType.MAGNET) ? 2 : 1);
        if (this.stats.coins % 50 === 0 && this.lives < GAME_CONFIG.MAX_LIVES) {
          this.lives++;
          this.spawnFloatingText(this.player.x + this.player.width/2, this.player.y, "+1 LIFE", "#00C851");
        }
      }

      const isEnemy = e.type === EntityType.ENEMY_DRONE || e.type === EntityType.ENEMY_BRICK || e.type === EntityType.ENEMY_JOURNAL || e.type === EntityType.ENEMY_SWARM || e.type === EntityType.BOSS || e.type === EntityType.MINI_BOSS || e.type === EntityType.ENEMY_INVADER;
      const isBadBullet = e.type === EntityType.PROJECTILE && (e.color !== '#6c63ff' || e.isBeam); 
      const isInvincible = this.invincibleTimer > 0 || this.activePowerups.has(PowerupType.SHIELD);

      if ((isEnemy || isBadBullet) && intersect(this.player, e)) {
        if (isInvincible) {
           e.hp -= 5; 
           if (e.hp <= 0 && !e.isBeam) { 
             e.markedForDeletion = true;
             this.spawnExplosion(e.x, e.y, e.color);
           }
        } else {
          this.lives--;
          this.invincibleTimer = 60; 
          audioService.playSound('hit');
          this.spawnExplosion(this.player.x, this.player.y, '#ffffff');
          if (isBadBullet && !e.isBeam) e.markedForDeletion = true;
          if (this.lives <= 0) this.gameActive = false;
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
                 const waveMult = Math.pow(2, this.stats.wave - 1);
                 let basePoints = 10;
                 if (target.type === EntityType.ENEMY_DRONE) basePoints = 10;
                 if (target.type === EntityType.ENEMY_SWARM) basePoints = 12;
                 if (target.type === EntityType.ENEMY_BRICK || target.type === EntityType.ENEMY_INVADER) basePoints = 20; 
                 if (target.type === EntityType.ENEMY_JOURNAL) basePoints = 30; 
                 
                 this.stats.score += basePoints * waveMult;
                 this.spawnCoin(target.x + target.width/2, target.y + target.height/2);
                 const isElite = target.type === EntityType.ENEMY_JOURNAL || target.type === EntityType.ENEMY_BRICK || target.type === EntityType.MINI_BOSS || target.type === EntityType.ENEMY_INVADER;
                 if (isElite && Math.random() > 0.85) this.spawnPowerup(target.x, target.y);

                 if (target.type === EntityType.MINI_BOSS) {
                     this.stats.score += 500 * waveMult;
                     this.spawnPowerup(target.x, target.y);
                     this.spawnPowerup(target.x + 40, target.y);
                     this.miniBossRef = null; 
                     this.waveProgressFrames += 120; 
                 }

                 if (target.type === EntityType.BOSS) {
                    this.stats.score += 1000 * waveMult; 
                    this.bossRef = null;
                    for(let i=0; i<15; i++) {
                        this.spawnCoin(target.x + Math.random()*target.width, target.y + Math.random()*target.height);
                    }
                    this.spawnPowerup(target.x + 50, target.y + 50);
                    this.spawnPowerup(target.x + 100, target.y + 50);
                    this.spawnPowerup(target.x + 50, target.y + 100);
                    this.spawnPowerup(target.x + 100, target.y + 100);
                    this.spawnFloatingText(this.width/2, this.height/2, "WAVE COMPLETE!", "#00FF00");
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

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    this.stars.forEach(star => star.draw(ctx));
    this.bgEntities.forEach(bg => bg.draw(ctx));
    
    if (this.inBossWarningSequence && this.frameCount % 20 < 10) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.save();
        ctx.fillStyle = '#FFF'; // WHITE FLASH
        // RESPONSIVE FONT SIZE FIX
        const fontSize = Math.min(36, this.width / 15);
        ctx.font = `bold ${fontSize}px Orbitron`;
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FF0000';
        
        ctx.fillText("WARNING", this.width/2, this.height/2 - 25);
        ctx.fillText("INTRUDER INCOMING", this.width/2, this.height/2 + 25);
        ctx.restore();
    }
    
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.filter = "none";
    ctx.shadowBlur = 0;
    this.entities.forEach(e => this.drawEntity(ctx, e));
    if (this.lives > 0) this.drawEntity(ctx, this.player);
    
    // Draw Wall Boss UI if active
    const invaders = this.entities.filter(e => e.type === EntityType.ENEMY_INVADER);
    if (invaders.length > 0) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity;
        invaders.forEach(inv => {
            if (inv.x < minX) minX = inv.x;
            if (inv.x + inv.width > maxX) maxX = inv.x + inv.width;
            if (inv.y < minY) minY = inv.y;
        });
        
        if (minY < Infinity) {
            const centerX = (minX + maxX) / 2;
            const topY = minY;
            
            ctx.save();
            // Name
            ctx.font = 'bold 16px Orbitron';
            ctx.fillStyle = '#ff4444';
            ctx.textAlign = 'center';
            ctx.fillText("PAYWALL", centerX, topY - 35);
            
            // Health Bar
            const barWidth = 100;
            const barHeight = 8;
            const barY = topY - 20;
            
            ctx.fillStyle = 'rgba(0,0,0,0.9)';
            ctx.fillRect(centerX - barWidth/2, barY, barWidth, barHeight);
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 1;
            ctx.strokeRect(centerX - barWidth/2, barY, barWidth, barHeight);
            
            const pct = Math.max(0, this.stats.bossHp / this.stats.bossMaxHp);
            
            ctx.fillStyle = pct > 0.5 ? '#00FF00' : '#FF0000';
            ctx.fillRect(centerX - barWidth/2 + 1, barY + 1, (barWidth-2) * pct, barHeight - 2);
            ctx.restore();
        }
    }
    
    ctx.restore();
  }
  
  drawMiniBoss(ctx: CanvasRenderingContext2D, e: Entity) {
      this.drawHealthBar(ctx, e, 12);
      // Force Opacity
      ctx.globalAlpha = 1.0; 
      
      const img = imageCache[ASSETS.BOTTLENECK_ICON];
      if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -e.width/2, -e.height/2, e.width, e.height);
      } else {
          // Fallback Drawing
          ctx.save();
          const w = e.width;
          const h = e.height;
          ctx.strokeStyle = '#6b7280';
          ctx.lineWidth = 4;
          for(let i=0; i<4; i++) {
              const angle = (Math.PI/4) + (i * Math.PI/2) + (Math.sin(this.frameCount * 0.1) * 0.2);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              const ex = Math.cos(angle) * w * 0.6;
              const ey = Math.sin(angle) * h * 0.6;
              const cx = Math.cos(angle) * w * 0.8;
              const cy = Math.sin(angle) * h * 0.8;
              ctx.quadraticCurveTo(ex, ey, cx, cy);
              ctx.stroke();
              ctx.fillStyle = '#9ca3af';
              ctx.beginPath();
              ctx.arc(cx, cy, 5, 0, Math.PI*2);
              ctx.fill();
          }
          const gradient = ctx.createLinearGradient(0, -h/2, 0, h/2);
          gradient.addColorStop(0, '#818cf8');
          gradient.addColorStop(0.5, '#4f46e5');
          gradient.addColorStop(1, '#312e81');
          ctx.fillStyle = gradient;
          ctx.strokeStyle = '#a5b4fc';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-w/2, -h/2); 
          ctx.lineTo(w/2, -h/2);  
          ctx.lineTo(w/4, 0);    
          ctx.lineTo(w/3, h/3); 
          ctx.lineTo(0, h/2);    
          ctx.lineTo(-w/3, h/3); 
          ctx.lineTo(-w/4, 0);    
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
      }
      // Add BOTTLENECK LABEL ABOVE HEALTH
      ctx.save();
      ctx.font = 'bold 12px Orbitron';
      ctx.fillStyle = '#ff4444';
      ctx.textAlign = 'center';
      ctx.fillText("BOTTLENECK", 0, -e.height/2 - 35);
      ctx.restore();
  }

  drawBoss(ctx: CanvasRenderingContext2D, e: Entity) {
      this.drawHealthBar(ctx, e, 12);
      ctx.globalAlpha = 1.0;
      ctx.save();
      // ... boss visual code ...
      // Assuming visual logic is same, focusing on Name placement
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
      ctx.fillStyle = '#4a0d0d'; 
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 4;
      ctx.fillRect(-hw, -hh, w/4, h);
      ctx.strokeRect(-hw, -hh, w/4, h);
      ctx.fillRect(hw - w/4, -hh, w/4, h);
      ctx.strokeRect(hw - w/4, -hh, w/4, h);
      ctx.beginPath();
      ctx.moveTo(-hw + w/4, -hh + 20);
      ctx.lineTo(hw - w/4, -hh + 20);
      ctx.lineTo(hw - w/4, -hh + 50);
      ctx.lineTo(0, -hh + 80); 
      ctx.lineTo(-hw + w/4, -hh + 50);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = e.isCharging ? '#fff' : '#000';
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 50, 10, this.frameCount * 0.1, 0, Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, 50, 10, -this.frameCount * 0.1, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();

      // Add GATEKEEPER LABEL ABOVE HEALTH
      ctx.save();
      ctx.font = 'bold 16px Orbitron';
      ctx.fillStyle = '#ff0000';
      ctx.textAlign = 'center';
      ctx.fillText("GATEKEEPER", 0, -e.height/2 - 35);
      ctx.restore();
  }

  drawHealthBar(ctx: CanvasRenderingContext2D, e: Entity, height: number = 8) {
      ctx.save();
      const barWidth = e.width;
      const barHeight = height;
      const yOffset = -e.height/2 - 20; 
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.fillRect(-barWidth/2, yOffset, barWidth, barHeight);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-barWidth/2, yOffset, barWidth, barHeight);
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = pct > 0.5 ? '#00FF00' : '#FF0000';
      ctx.fillRect(-barWidth/2 + 1, yOffset + 1, (barWidth-2) * pct, barHeight - 2);
      ctx.restore();
  }
  
  drawLaser(ctx: CanvasRenderingContext2D, e: Entity) {
      const flicker = Math.random() * 10;
      ctx.save();
      ctx.fillStyle = '#FFF';
      ctx.fillRect(e.x + 10, e.y, e.width - 20, e.height);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(e.x - flicker, e.y, e.width + flicker*2, e.height);
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
    ctx.globalAlpha = 1.0;
    
    if (e.type === EntityType.PLAYER) {
       const img = imageCache[ASSETS.PLAYER_SHIP];
       if (this.activePowerups.has(PowerupType.MAGNET)) {
           const pulse = Math.sin(this.frameCount * 0.1) * 5;
           ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)'; 
           ctx.lineWidth = 2;
           ctx.beginPath();
           ctx.arc(0, 0, e.width/2 + 10 + pulse, 0, Math.PI * 2);
           ctx.stroke();
           ctx.beginPath();
           ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
           ctx.arc(0, 0, e.width/2 + pulse, 0, Math.PI * 2);
           ctx.stroke();
       }
       if (this.activePowerups.has(PowerupType.TRIPLE_SHOT)) {
           const offset = 55;
           ctx.fillStyle = '#6c63ff';
           ctx.fillRect(-offset, 0, 10, 20);
           ctx.fillRect(offset - 10, 0, 10, 20);
           ctx.strokeStyle = '#6c63ff';
           ctx.lineWidth = 1;
           ctx.beginPath();
           ctx.moveTo(-offset + 5, 10);
           ctx.lineTo(0, 0);
           ctx.moveTo(offset - 5, 10);
           ctx.lineTo(0, 0);
           ctx.stroke();
       }
       if (this.activePowerups.has(PowerupType.DOUBLE_SHOT)) {
           const offset = 40;
           ctx.fillStyle = '#ffbb33';
           ctx.fillRect(-offset, 0, 5, 15);
           ctx.fillRect(offset - 5, 0, 5, 15);
       }
       if (this.activePowerups.has(PowerupType.SHIELD) || this.invincibleTimer > 60) {
         ctx.save();
         ctx.rotate(this.frameCount * 0.05);
         ctx.strokeStyle = '#00C851';
         ctx.lineWidth = 3;
         ctx.setLineDash([15, 10]); 
         ctx.beginPath();
         ctx.arc(0, 0, e.width/2 + 15, 0, Math.PI * 2);
         ctx.stroke();
         ctx.restore();
       }
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
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.clip();
        let imgUrl = ASSETS.FOUNDER_4; 
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
        // DRAW AS BRICK EMOJI
        // INCREASE FONT SIZE FOR BIGGER BRICKS
        ctx.font = `${e.height}px Arial`; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#B22222'; // fallback color if text fails
        ctx.fillText("🧱", 0, 2);

    } else if (e.type === EntityType.COIN) {
        const img = imageCache[ASSETS.RSC_TOKEN];
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FFD700'; 
            ctx.beginPath();
            ctx.arc(0, 0, e.width/2, 0, Math.PI*2);
            ctx.clip();
            ctx.drawImage(img, -e.width/2, -e.height/2, e.width, e.height);
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        } else {
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

            if (eff.text?.startsWith("WAVE")) {
                const jitterX = (Math.random() - 0.5) * 4;
                const jitterY = (Math.random() - 0.5) * 4;
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00FFFF'; 
                ctx.fillStyle = this.frameCount % 10 < 5 ? '#FFF' : '#00FFFF';
                ctx.fillText(eff.text || "", jitterX, jitterY);
                if (Math.random() > 0.7) {
                    ctx.strokeStyle = '#FFF';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-50, 0);
                    ctx.lineTo(50, (Math.random()-0.5)*20);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            } else if (eff.text?.startsWith("WARNING")) {
                 const pulse = Math.abs(Math.sin(this.frameCount * 0.2)) * 0.5 + 0.5;
                 ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
                 ctx.shadowBlur = 10;
                 ctx.shadowColor = '#ff0000';
                 ctx.fillText(eff.text || "", 0, 0);
                 ctx.shadowBlur = 0;
            } else if (eff.text?.startsWith("GATEKEEPER")) {
                 ctx.fillStyle = '#ff4444';
                 ctx.font = 'bold 20px Orbitron';
                 ctx.fillText(eff.text || "", 0, 0);
            } else {
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
        // FORCE OPAQUE FOR PROJECTILES
        ctx.save();
        ctx.globalAlpha = 1.0; 
        ctx.filter = "none";
        ctx.shadowBlur = 0;

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
        ctx.restore();
    } else {
        ctx.fillStyle = e.color; 
        if (e.text) {
          ctx.font = '24px Arial'; 
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(e.text, 0, 0);
        } else {
          ctx.fillRect(-e.width/2, -e.height/2, e.width, e.height);
        }
    }
    
    ctx.restore();
  }
}
