export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameState {
  score: number;
  lives: number;
  level: number;
  percentCleared: number;
  status: 'MENU' | 'PLAYING' | 'SHOW_FULL_IMAGE' | 'LEVEL_COMPLETE' | 'GAME_OVER';
}

export interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'BOSS' | 'MINION';
  radius: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface SearchResult {
  text: string;
  groundingChunks: GroundingChunk[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  groundingChunks?: GroundingChunk[];
}