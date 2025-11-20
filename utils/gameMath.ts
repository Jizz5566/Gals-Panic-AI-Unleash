import { Point, Rect } from '../types';

export const checkCollisionCircleRect = (circle: {x: number, y: number, radius: number}, rect: Rect): boolean => {
  const distX = Math.abs(circle.x - rect.x - rect.width / 2);
  const distY = Math.abs(circle.y - rect.y - rect.height / 2);

  if (distX > (rect.width / 2 + circle.radius)) { return false; }
  if (distY > (rect.height / 2 + circle.radius)) { return false; }

  if (distX <= (rect.width / 2)) { return true; } 
  if (distY <= (rect.height / 2)) { return true; }

  const dx = distX - rect.width / 2;
  const dy = distY - rect.height / 2;
  return (dx * dx + dy * dy <= (circle.radius * circle.radius));
};

export const checkCollisionPointLine = (p: Point, l1: Point, l2: Point, tolerance: number = 5): boolean => {
  const dist = Math.abs((l2.y - l1.y) * p.x - (l2.x - l1.x) * p.y + l2.x * l1.y - l2.y * l1.x) / 
               Math.sqrt(Math.pow(l2.y - l1.y, 2) + Math.pow(l2.x - l1.x, 2));
  
  // Check if point is within the segment bounds
  const minX = Math.min(l1.x, l2.x) - tolerance;
  const maxX = Math.max(l1.x, l2.x) + tolerance;
  const minY = Math.min(l1.y, l2.y) - tolerance;
  const maxY = Math.max(l1.y, l2.y) + tolerance;

  return dist <= tolerance && p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
};

export const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};