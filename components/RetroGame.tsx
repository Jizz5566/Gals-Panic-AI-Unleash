
import React, { useEffect, useRef, useState } from 'react';
import { GameState, Enemy, Point, Rect, Particle } from '../types';
import { checkCollisionCircleRect } from '../utils/gameMath';

// Configuration for Levels: Image + Reward Video
interface LevelData {
  id: number;
  name: string;
  image: string;
}

// ==========================================
// 獎勵影片設定 (Reward Videos)
// 當關卡完成時，會隨機播放其中一個連結
// ==========================================
const REWARD_VIDEOS = [
  { title: "陽光沙灘的黑色誘惑", url: "https://www.canva.com/design/DAG4yP6kpvE/aJjHOAfgUGyVpNwjaEf9UQ/watch?utm_content=DAG4yP6kpvE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=heacd031808" },
  { title: "道歉不可恥但有用", url: "https://www.canva.com/design/DAG4mvHEHiM/DZylT4EM0hzAO9BgoMcriQ/watch?utm_content=DAG4mvHEHiM&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h9d19bde69a" },
  { title: "黑色沙灘", url: "https://www.canva.com/design/DAG4pQlTwK4/XlsItM6FCANyXE7-hcurfg/watch?utm_content=DAG4pQlTwK4&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hf79ccd272c" },
  { title: "火辣女教師", url: "https://www.canva.com/design/DAG4fxSLGW4/HTv_iJnZ2c58SwRioeFRBw/watch?utm_content=DAG4fxSLGW4&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=ha3bbdd7b64" },
  { title: "NY時尚的祕密", url: "https://www.canva.com/design/DAG488yYpdA/qA5MehGuWwndfknp116KVg/watch?utm_content=DAG488yYpdA&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h2105cdf339" }
];

// ==========================================
// 關卡背景圖設定 (Level Background Images)
// 請在此處更換 'image' 欄位中的網址來改變底圖
// 解析度建議: 784x1168 (直向)
// ==========================================
const LEVELS: LevelData[] = [
  {
    id: 1,
    name: "美麗女教師",
    // 第 1 關圖片
    image: 'https://imagine-public.x.ai/imagine-public/images/532d1277-cbef-41cb-b254-e0df422e1f86.png'
  },
  {
    id: 2,
    name: "Synthwave Pool",
    // 第 2 關圖片
    image: 'https://imagine-public.x.ai/imagine-public/images/1b06170e-01ab-4e94-bcaf-651edb3bbd60.png'
  },
  {
    id: 3,
    name: "黑色比基尼女郎",
    // 第 3 關圖片
    image: 'https://imagine-public.x.ai/imagine-public/images/a66cf140-6a0a-4338-896e-1bbf04f84794.png'
  },
  {
    id: 4,
    name: "Digital Diva",
    // 第 4 關圖片
    image: 'https://imagine-public.x.ai/imagine-public/images/267be666-76a5-48ad-8d8b-bee20e2d9fed.png'
  }
];

// Updated resolution to match user request (784x1168 Portrait)
const CANVAS_WIDTH = 784;
const CANVAS_HEIGHT = 1168;
const PLAYER_SPEED = 4;
const BOSS_SPEED_BASE = 3;
const TARGET_PERCENT = 80;
const LINE_TOLERANCE = 6; // Tolerance for sticking to lines

export const RetroGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null); // Offscreen canvas for mask
  const requestRef = useRef<number>(null);

  // Game State
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    level: 1,
    percentCleared: 0,
    status: 'MENU'
  });

  const [rewardVideo, setRewardVideo] = useState<{ title: string, url: string } | null>(null);

  // Ref to hold current state for game loop access (avoids stale closures)
  const gameStateRef = useRef(gameState);

  // Sync Ref with State
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Handle Level Complete - Select Random Video
  useEffect(() => {
    if (gameState.status === 'LEVEL_COMPLETE') {
      const randomVideo = REWARD_VIDEOS[Math.floor(Math.random() * REWARD_VIDEOS.length)];
      setRewardVideo(randomVideo);
    }
  }, [gameState.status]);

  // Refs for mutable game data (performance)
  const playerRef = useRef({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 2,
    isCutting: false,
    trail: [] as Point[],
    direction: null as string | null,
    cutStartPos: null as Point | null // Stores the position where the current cut started
  });
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const capturedRectsRef = useRef<Rect[]>([]);

  // Input State Ref
  const keysPressed = useRef<Set<string>>(new Set());

  // Initialize offscreen canvas
  useEffect(() => {
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
      maskCanvasRef.current.width = CANVAS_WIDTH;
      maskCanvasRef.current.height = CANVAS_HEIGHT;
    }
  }, []);

  // Initialize Level
  const startLevel = (levelIndex: number) => {
    playerRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 2,
      isCutting: false,
      trail: [],
      direction: null,
      cutStartPos: null
    };
    capturedRectsRef.current = [];
    particlesRef.current = [];
    setRewardVideo(null);

    const bossSpeed = BOSS_SPEED_BASE + (levelIndex - 1) * 0.5;

    // Spawn Boss
    const enemies: Enemy[] = [{
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * bossSpeed,
      vy: (Math.random() > 0.5 ? 1 : -1) * bossSpeed,
      type: 'BOSS',
      radius: 20
    }];

    // Spawn Minions for higher levels (Difficulty Scaling)
    if (levelIndex > 1) {
      const minionCount = Math.min(levelIndex - 1, 3);
      for (let i = 0; i < minionCount; i++) {
        enemies.push({
          x: CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 100,
          y: CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * (bossSpeed * 1.2),
          vy: (Math.random() - 0.5) * (bossSpeed * 1.2),
          type: 'MINION',
          radius: 10
        });
      }
    }

    enemiesRef.current = enemies;

    const newState = {
      ...gameState,
      level: levelIndex,
      percentCleared: 0,
      status: 'PLAYING' as const
    };

    setGameState(newState);
  };

  const spawnParticles = (x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color
      });
    }
  };

  const handleGameOver = () => {
    setGameState(prev => ({ ...prev, status: 'GAME_OVER' }));
    gameStateRef.current = { ...gameStateRef.current, status: 'GAME_OVER' };
  };

  // Handle Death Logic
  const handleDeath = () => {
    const currentLives = gameStateRef.current.lives;
    spawnParticles(playerRef.current.x, playerRef.current.y, 50, '#ff0000');

    // Reset player position
    playerRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 2,
      isCutting: false,
      trail: [],
      direction: null,
      cutStartPos: null
    };

    if (currentLives > 1) {
      // Update Ref immediately
      gameStateRef.current = { ...gameStateRef.current, lives: currentLives - 1 };
      setGameState(prev => ({ ...prev, lives: prev.lives - 1 }));
    } else {
      handleGameOver();
    }
  };

  // Helper function to calculate overlap area between two rectangles
  const calculateOverlapArea = (rect1: Rect, rect2: Rect): number => {
    const overlapX = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
    const overlapY = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
    return overlapX * overlapY;
  };

  const updateGame = () => {
    if (gameStateRef.current.status !== 'PLAYING') return;

    const player = playerRef.current;
    const enemies = enemiesRef.current;

    // --- Enemy Logic ---
    enemies.forEach(enemy => {
      enemy.x += enemy.vx;
      enemy.y += enemy.vy;

      // Check bounds (Screen)
      if (enemy.x <= enemy.radius || enemy.x >= CANVAS_WIDTH - enemy.radius) enemy.vx *= -1;
      if (enemy.y <= enemy.radius || enemy.y >= CANVAS_HEIGHT - enemy.radius) enemy.vy *= -1;

      // Check collision with Captured Rects (Bounce off revealing walls)
      for (const rect of capturedRectsRef.current) {
        if (checkCollisionCircleRect(enemy, rect)) {
          // Collision Resolution: Push enemy OUT of the rect to prevent sticking
          const cx = rect.x + rect.width / 2;
          const cy = rect.y + rect.height / 2;

          const halfW = rect.width / 2;
          const halfH = rect.height / 2;
          const distX = Math.abs(enemy.x - cx);
          const distY = Math.abs(enemy.y - cy);

          // Basic overlap calculation
          const overlapX = (halfW + enemy.radius) - distX;
          const overlapY = (halfH + enemy.radius) - distY;

          // Push out slightly more than overlap to prevent sticking
          const pushFactor = 1.1;

          if (overlapX < overlapY) {
            // X collision
            enemy.vx *= -1;
            enemy.x += (enemy.x > cx) ? overlapX * pushFactor : -overlapX * pushFactor;
          } else {
            // Y collision
            enemy.vy *= -1;
            enemy.y += (enemy.y > cy) ? overlapY * pushFactor : -overlapY * pushFactor;
          }
        }
      }

      // Check collision with Player
      // RULE: Player is invulnerable to direct contact while on the safety line (not cutting).
      if (player.isCutting) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        if (Math.sqrt(dx * dx + dy * dy) < enemy.radius + 5) {
          handleDeath();
        }
      }

      // Check collision with Trail
      if (player.isCutting) {
        for (const p of player.trail) {
          const tdx = p.x - enemy.x;
          const tdy = p.y - enemy.y;
          if (Math.sqrt(tdx * tdx + tdy * tdy) < enemy.radius + 2) {
            handleDeath();
          }
        }
      }
    });

    // --- Particles ---
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  };

  // --- Canvas Rendering ---
  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const currentLevelIndex = gameStateRef.current.level;
    const currentLevelData = LEVELS[(currentLevelIndex - 1) % LEVELS.length];

    // 1. Draw Background Image
    const img = new Image();
    img.src = currentLevelData.image;
    if (img.complete) {
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      ctx.fillStyle = '#2d1b4e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // If showing full image, we skip the mask drawing to reveal everything
    if (gameStateRef.current.status === 'SHOW_FULL_IMAGE') {
      return; // Skip drawing mask, player, enemies, etc.
    }

    // 2. Prepare the "Curtain" (Mask)
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas?.getContext('2d');

    if (maskCanvas && maskCtx) {
      maskCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.fillStyle = 'rgba(20, 10, 40, 0.95)';
      maskCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid Lines
      maskCtx.strokeStyle = 'rgba(255, 0, 255, 0.15)';
      maskCtx.lineWidth = 1;
      maskCtx.beginPath();
      for (let i = 0; i < CANVAS_WIDTH; i += 40) {
        maskCtx.moveTo(i, 0); maskCtx.lineTo(i, CANVAS_HEIGHT);
      }
      for (let i = 0; i < CANVAS_HEIGHT; i += 40) {
        maskCtx.moveTo(0, i); maskCtx.lineTo(CANVAS_WIDTH, i);
      }
      maskCtx.stroke();

      maskCtx.globalCompositeOperation = 'destination-out';
      capturedRectsRef.current.forEach(rect => {
        maskCtx.fillRect(rect.x, rect.y, rect.width, rect.height);
      });

      ctx.drawImage(maskCanvas, 0, 0);
    }

    // 4. Captured Rect Borders
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    capturedRectsRef.current.forEach(rect => {
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    });
    ctx.shadowBlur = 0;

    // 5. Player Trail
    if (playerRef.current.isCutting && playerRef.current.trail.length > 0) {
      ctx.beginPath();
      ctx.moveTo(playerRef.current.trail[0].x, playerRef.current.trail[0].y);
      for (let p of playerRef.current.trail) {
        ctx.lineTo(p.x, p.y);
      }
      ctx.lineTo(playerRef.current.x, playerRef.current.y);
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff00ff';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 6. Player
    const { x, y } = playerRef.current;
    ctx.fillStyle = playerRef.current.isCutting ? '#ff00ff' : '#ffffff'; // Color change for status
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 7. Enemies
    enemiesRef.current.forEach(enemy => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      if (enemy.type === 'BOSS') {
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(10, 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10, -10); ctx.lineTo(-10, 10); ctx.stroke();
      } else {
        // Minion
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    // 8. Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
      ctx.globalAlpha = 1;
    });
  };

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyX'].includes(e.code)) {
        e.preventDefault();
      }
      keysPressed.current.add(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Helpers for Virtual Button Events
  const handleVirtualBtnStart = (code: string, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); // Prevent scroll/context menu
    keysPressed.current.add(code);
  };

  const handleVirtualBtnEnd = (code: string, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    keysPressed.current.delete(code);
  };

  // Game Loop
  useEffect(() => {
    const loop = () => {
      if (gameStateRef.current.status === 'PLAYING') {
        let dx = 0;
        let dy = 0;

        // Input (Keyboard OR Virtual Keys)
        if (keysPressed.current.has('ArrowUp')) dy = -PLAYER_SPEED;
        if (keysPressed.current.has('ArrowDown')) dy = PLAYER_SPEED;
        if (keysPressed.current.has('ArrowLeft')) dx = -PLAYER_SPEED;
        if (keysPressed.current.has('ArrowRight')) dx = PLAYER_SPEED;

        const isAction = keysPressed.current.has('KeyX');

        const player = playerRef.current;

        // Helper: Check if a point is on the boundary of a safe zone (Rail logic)
        const isOnLine = (x: number, y: number) => {
          const t = LINE_TOLERANCE;
          // Screen borders
          if (x <= t || x >= CANVAS_WIDTH - t) return true;
          if (y <= t || y >= CANVAS_HEIGHT - t) return true;

          // Captured Rect borders
          for (const r of capturedRectsRef.current) {
            // Vertical edges of this rect
            if ((Math.abs(x - r.x) <= t || Math.abs(x - (r.x + r.width)) <= t)) {
              if (y >= r.y - t && y <= r.y + r.height + t) return true;
            }
            // Horizontal edges of this rect
            if ((Math.abs(y - r.y) <= t || Math.abs(y - (r.y + r.height)) <= t)) {
              if (x >= r.x - t && x <= r.x + r.width + t) return true;
            }
          }
          return false;
        };

        // Helper: Check if inside safe zone (Used for landing capture)
        const isSafe = (x: number, y: number) => {
          const t = LINE_TOLERANCE;
          // Use unified tolerance to match isOnLine logic
          if (x <= t || x >= CANVAS_WIDTH - t || y <= t || y >= CANVAS_HEIGHT - t) return true;
          for (const r of capturedRectsRef.current) {
            // Allow being strictly inside or on the exact edge
            if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) return true;
          }
          return false;
        };

        // Check if player is currently safe (used for movement restrictions)
        // We are safe if we are effectively on a line OR inside a captured zone.
        const currentlySafe = isOnLine(player.x, player.y) || isSafe(player.x, player.y);

        if (isAction) {
          // --- CUTTING MODE START/CONTINUE ---
          // Start cutting if we are safe and press the button
          if (!player.isCutting && currentlySafe) {
            // SNAP Logic: Force player to exact grid line to avoid drift when starting cut
            const t = LINE_TOLERANCE;
            let snapped = false;
            if (Math.abs(player.x) <= t) { player.x = 0; snapped = true; }
            else if (Math.abs(player.x - CANVAS_WIDTH) <= t) { player.x = CANVAS_WIDTH; snapped = true; }

            if (!snapped) {
              if (Math.abs(player.y) <= t) { player.y = 0; snapped = true; }
              else if (Math.abs(player.y - CANVAS_HEIGHT) <= t) { player.y = CANVAS_HEIGHT; snapped = true; }
            }

            if (!snapped) {
              for (const r of capturedRectsRef.current) {
                if (Math.abs(player.x - r.x) <= t) { player.x = r.x; break; }
                if (Math.abs(player.x - (r.x + r.width)) <= t) { player.x = r.x + r.width; break; }
                if (Math.abs(player.y - r.y) <= t) { player.y = r.y; break; }
                if (Math.abs(player.y - (r.y + r.height)) <= t) { player.y = r.y + r.height; break; }
              }
            }

            // SAVE START POS FOR CANCELLATION
            player.cutStartPos = { x: player.x, y: player.y };

            player.isCutting = true;
            player.trail = [{ x: player.x, y: player.y }];
          }

          if (player.isCutting) {
            const nextX = player.x + dx;
            const nextY = player.y + dy;

            // Allow movement into void
            player.x = Math.max(0, Math.min(CANVAS_WIDTH, nextX));
            player.y = Math.max(0, Math.min(CANVAS_HEIGHT, nextY));

            // Add trail point
            const lastP = player.trail[player.trail.length - 1];
            if (Math.abs(lastP.x - player.x) > 5 || Math.abs(lastP.y - player.y) > 5) {
              player.trail.push({ x: player.x, y: player.y });
            }

            // Capture Logic: If returned to safe zone (Check New Position)
            // We use `isSafe` on the NEW position.
            if (isSafe(player.x, player.y) && player.trail.length > 5) {
              let minX = player.x, maxX = player.x, minY = player.y, maxY = player.y;
              player.trail.forEach(p => {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
              });

              const newRect = {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
              };

              const boss = enemiesRef.current.find(e => e.type === 'BOSS');
              if (boss && !checkCollisionCircleRect(boss, newRect)) {
                capturedRectsRef.current.push(newRect);
                spawnParticles(newRect.x + newRect.width / 2, newRect.y + newRect.height / 2, 100, '#00ffff');

                // Calculate ONLY the non-overlapping new area
                let baseArea = newRect.width * newRect.height;
                let overlapArea = 0;

                // Subtract overlaps with all existing captured rectangles
                // Note: We loop through all EXCEPT the last one (which is the newRect we just added)
                for (let i = 0; i < capturedRectsRef.current.length - 1; i++) {
                  overlapArea += calculateOverlapArea(newRect, capturedRectsRef.current[i]);
                }

                // Net new area = base area minus any overlaps
                const netNewArea = Math.max(0, baseArea - overlapArea);
                const totalArea = CANVAS_WIDTH * CANVAS_HEIGHT;
                const percent = (netNewArea / totalArea) * 100;

                setGameState(prev => {
                  const newPercent = Math.min(100, prev.percentCleared + percent);
                  if (newPercent >= TARGET_PERCENT) {
                    // Transition to SHOW_FULL_IMAGE instead of LEVEL_COMPLETE
                    return { ...prev, percentCleared: newPercent, score: prev.score + Math.floor(netNewArea / 10), status: 'SHOW_FULL_IMAGE' };
                  }
                  return { ...prev, percentCleared: newPercent, score: prev.score + Math.floor(netNewArea / 10) };
                });
              } else {
                spawnParticles(player.x, player.y, 20, '#ffff00');
              }

              player.isCutting = false;
              player.trail = [];
              player.cutStartPos = null;
            }
          }
        } else {
          // --- BUTTON RELEASED: CANCEL CUT IF PENDING ---
          if (player.isCutting) {
            if (player.cutStartPos) {
              player.x = player.cutStartPos.x;
              player.y = player.cutStartPos.y;
            }
            player.isCutting = false;
            player.trail = [];
            player.cutStartPos = null;
          }

          // --- MOVEMENT ON RAILS (Safe Mode) ---
          if (currentlySafe) {
            player.isCutting = false;
            player.trail = [];

            // Handle X movement
            if (dx !== 0) {
              const nextX = player.x + dx;
              // Allow move if ON LINE or INSIDE SAFE ZONE
              if (isOnLine(nextX, player.y) || isSafe(nextX, player.y)) {
                player.x = nextX;
              }
            }
            // Handle Y movement
            if (dy !== 0) {
              const nextY = player.y + dy;
              if (isOnLine(player.x, nextY) || isSafe(player.x, nextY)) {
                player.y = nextY;
              }
            }
          }
        }
      }

      updateGame();

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState.status]);

  // Joystick Component
  const Joystick = () => {
    const joystickRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [active, setActive] = useState(false);

    const updateJoystick = (clientX: number, clientY: number) => {
      if (!joystickRef.current) return;
      const rect = joystickRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = rect.width / 2;

      // Clamp position for visual feedback
      if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }

      setPos({ x: dx, y: dy });

      // Map to Keys
      const threshold = 10; // Deadzone

      // Reset all joystick inputs first
      keysPressed.current.delete('ArrowUp');
      keysPressed.current.delete('ArrowDown');
      keysPressed.current.delete('ArrowLeft');
      keysPressed.current.delete('ArrowRight');

      if (dist > threshold) {
        // Determine primary direction based on 45-degree sectors
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal
          if (dx > 0) keysPressed.current.add('ArrowRight');
          else keysPressed.current.add('ArrowLeft');
        } else {
          // Vertical
          if (dy > 0) keysPressed.current.add('ArrowDown');
          else keysPressed.current.add('ArrowUp');
        }
      }
    };

    const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
      setActive(true);
      // If touch event
      if ('touches' in e) {
        updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
      } else {
        updateJoystick((e as React.MouseEvent).clientX, (e as React.MouseEvent).clientY);
      }
    };

    const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
      if (!active) return;
      e.preventDefault(); // Prevent scrolling
      if ('touches' in e) {
        updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
      } else {
        updateJoystick((e as React.MouseEvent).clientX, (e as React.MouseEvent).clientY);
      }
    };

    const handleEnd = () => {
      setActive(false);
      setPos({ x: 0, y: 0 });
      keysPressed.current.delete('ArrowUp');
      keysPressed.current.delete('ArrowDown');
      keysPressed.current.delete('ArrowLeft');
      keysPressed.current.delete('ArrowRight');
    };

    return (
      <div
        ref={joystickRef}
        className="w-24 h-24 md:w-32 md:h-32 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center relative border-2 border-white/20 touch-none"
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
      >
        <div
          className="w-10 h-10 md:w-12 md:h-12 bg-retro-accent rounded-full shadow-[0_0_15px_#ff00ff] pointer-events-none"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px)`
          }}
        />
      </div>
    );
  };

  // Virtual Key Button Component (For Action Button)
  const VirtualKey = ({ code, label, className }: { code: string, label: React.ReactNode, className?: string }) => (
    <button
      className={`flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/30 rounded-lg active:bg-retro-accent/60 active:border-retro-accent select-none touch-none transition-colors ${className}`}
      onTouchStart={(e) => handleVirtualBtnStart(code, e)}
      onTouchEnd={(e) => handleVirtualBtnEnd(code, e)}
      onMouseDown={(e) => handleVirtualBtnStart(code, e)}
      onMouseUp={(e) => handleVirtualBtnEnd(code, e)}
      onMouseLeave={(e) => handleVirtualBtnEnd(code, e)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-2 md:p-4 overflow-hidden">

      {/* HUD */}
      <div className="flex justify-between w-full max-w-[784px] mb-2 font-mono text-retro-secondary text-xs md:text-base">
        <div className="flex gap-2 md:gap-4">
          <div className="bg-retro-card px-2 md:px-4 py-1 md:py-2 rounded border border-retro-secondary/30 whitespace-nowrap">
            分數: <span className="text-white">{gameState.score.toString().padStart(6, '0')}</span>
          </div>
          <div className="bg-retro-card px-2 md:px-4 py-1 md:py-2 rounded border border-retro-secondary/30 whitespace-nowrap">
            生命: <span className="text-retro-accent">{'♥'.repeat(Math.max(0, gameState.lives))}</span>
          </div>
        </div>
        <div className="bg-retro-card px-2 md:px-4 py-1 md:py-2 rounded border border-retro-secondary/30 whitespace-nowrap">
          <span className="hidden md:inline">解鎖: </span>{gameState.percentCleared.toFixed(1)}% / {TARGET_PERCENT}%
        </div>
      </div>

      {/* Game Container */}
      <div className="relative rounded-lg overflow-hidden shadow-[0_0_20px_rgba(255,0,255,0.3)] border-2 border-retro-accent bg-black touch-none max-w-full">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block bg-black h-[75dvh] w-auto max-w-full object-contain touch-none"
          style={{ touchAction: 'none' }}
        />

        {/* VIRTUAL CONTROLS OVERLAY (Always visible on screen, semi-transparent on Desktop to not obstruct) */}
        {gameState.status === 'PLAYING' && (
          <>
            {/* JOYSTICK (Bottom Left) */}
            <div
              className="absolute left-8 z-20 pointer-events-auto opacity-70 md:opacity-50 hover:opacity-100 transition-opacity"
              style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <Joystick />
            </div>

            {/* ACTION BUTTON (Bottom Right) - Resized to smaller */}
            <div
              className="absolute right-8 z-20 pointer-events-auto opacity-70 md:opacity-50 hover:opacity-100 transition-opacity"
              style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <VirtualKey
                code="KeyX"
                label={<span className="text-xl font-bold">X</span>}
                className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-retro-accent bg-retro-accent/20 shadow-[0_0_15px_#ff00ff]"
              />
            </div>
          </>
        )}

        {/* Overlays */}
        {gameState.status === 'MENU' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center backdrop-blur-sm px-4 z-30">
            <h1 className="text-3xl md:text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-retro-secondary to-retro-accent mb-4 filter drop-shadow-[0_0_10px_rgba(255,0,255,0.5)]">
              天蠶變: AI美女的解放
            </h1>
            <p className="text-retro-text mb-8 font-mono tracking-widest text-sm md:text-base">SILHOUETTE REVEAL</p>
            <button
              onClick={() => startLevel(1)}
              className="px-8 py-3 bg-retro-accent text-white font-bold rounded hover:scale-105 transition-transform shadow-[0_0_15px_#ff00ff]"
            >
              開始遊戲
            </button>
            <div className="mt-8 text-xs text-gray-500 font-mono space-y-2">
              <p className="hidden md:block">PC: 方向鍵移動 • 按住 X 鍵切割</p>
              <p className="block md:hidden text-retro-secondary">手機: 使用左側搖桿移動 • 右側按鈕切割</p>
              <p>清除 {TARGET_PERCENT}% 區域以解鎖隱藏影片</p>
            </div>
          </div>
        )}

        {gameState.status === 'GAME_OVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 text-center backdrop-blur-sm z-30">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">遊戲結束</h2>
            <p className="text-xl text-retro-secondary mb-6">分數: {gameState.score}</p>
            <button
              onClick={() => setGameState(prev => ({ ...prev, status: 'MENU', lives: 3, score: 0, level: 1 }))}
              className="px-6 py-2 border-2 border-white text-white hover:bg-white hover:text-black transition-colors"
            >
              再試一次
            </button>
          </div>
        )}

        {gameState.status === 'SHOW_FULL_IMAGE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 z-40">
            <div className="bg-black/50 backdrop-blur-sm p-4 rounded-xl border border-retro-accent/50 animate-fade-in-up">
              <button
                onClick={() => setGameState(prev => ({ ...prev, status: 'LEVEL_COMPLETE' }))}
                className="px-8 py-3 bg-retro-accent text-white font-bold rounded shadow-[0_0_15px_#ff00ff] hover:scale-105 transition-transform animate-pulse"
              >
                點擊繼續
              </button>
            </div>
          </div>
        )}

        {gameState.status === 'LEVEL_COMPLETE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-retro-secondary/90 text-center backdrop-blur-sm z-50 px-4">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">關卡完成！</h2>
            <p className="text-retro-bg font-bold mb-6">美女解鎖成功</p>

            {rewardVideo && (
              <div className="bg-black/60 p-4 md:p-6 rounded-xl border-2 border-retro-accent mb-6 max-w-xs w-full animate-[pulse_2s_infinite]">
                <div className="text-retro-accent font-mono text-sm mb-2 tracking-widest uppercase">
                  機密資料已解密
                </div>
                <div className="text-white text-xs mb-4 opacity-70 truncate">
                  已解鎖: {rewardVideo.title}
                </div>
                <a
                  href={rewardVideo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded transition-all transform hover:scale-105 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <span>觀看隱藏影片</span>
                </a>
              </div>
            )}

            <button
              onClick={() => startLevel(gameState.level + 1)}
              className="px-8 py-3 bg-white text-retro-secondary font-bold rounded shadow-lg hover:scale-110 transition-transform"
            >
              下一關
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-retro-text/40 text-xs font-mono hidden md:block">
        注意：在切割時請避開紅色敵人，回到安全區才算成功。按住 X 鍵並移動進行切割。放開 X 鍵可取消當前劃線。
      </div>
    </div>
  );
};
