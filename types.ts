

export enum GameState {
  MENU = 'MENU',
  TUTORIAL = 'TUTORIAL',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAMEOVER = 'GAMEOVER',
  ABOUT = 'ABOUT',
  SHOP = 'SHOP'
}

export enum EntityType {
  PLAYER = 'PLAYER',
  ENEMY_DRONE = 'ENEMY_DRONE', // Paywall Drone
  ENEMY_JOURNAL = 'ENEMY_JOURNAL', // Predatory Journal
  ENEMY_BRICK = 'ENEMY_BRICK', // Bureaucracy Brick (Newspaper)
  ENEMY_SWARM = 'ENEMY_SWARM', // Misinformation (Flies)
  ENEMY_INVADER = 'ENEMY_INVADER', // Wall Boss Segment
  BOSS = 'BOSS',
  MINI_BOSS = 'MINI_BOSS',
  PROJECTILE = 'PROJECTILE',
  PARTICLE = 'PARTICLE',
  EFFECT = 'EFFECT', // Visual effects like rings or text
  POWERUP = 'POWERUP',
  COIN = 'COIN'
}

export enum PowerupType {
  DOUBLE_SHOT = 'DOUBLE_SHOT', // Parallel fire
  TRIPLE_SHOT = 'TRIPLE_SHOT', // Angled spread (Brian)
  MAGNET = 'MAGNET', // Coin Magnet (Patrick)
  SHIELD = 'SHIELD' // Invincibility (Jeffrey)
}

export interface Position {
  x: number;
  y: number;
}

export interface Upgrades {
  fireRate: number;
  speed: number;
  maxHp: number;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
}

export interface Stats {
  score: number;
  highScore: number;
  wave: number;
  coins: number;
  totalCoins: number; // New: Track total lifetime coins for "Funded" score
  enemiesDefeated: number;
  lives: number;
  upgrades: Upgrades;
  bossProgress: number; // 0.0 to 1.0
  isBossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
}