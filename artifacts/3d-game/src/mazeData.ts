import type { Difficulty } from "./difficulty";

import { CELL_SIZE, WALL_HEIGHT } from "./constants";

export interface Vec3 { x: number; y: number; z: number }

export interface MazeData {
  maze: number[][];
  rows: number;
  cols: number;
  collectiblePositions: Vec3[];
  obstaclePaths: { a: Vec3; b: Vec3; speed: number }[];
  playerStart: Vec3;
}


class RNG {
  private s: number;
  constructor(seed: number) { this.s = (seed >>> 0) || 1; }
  next(): number {
    this.s = (Math.imul(1664525, this.s) + 1013904223) >>> 0;
    return this.s / 0x100000000;
  }
  int(n: number): number { return Math.floor(this.next() * n); }
  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}


function generateGrid(size: number, rng: RNG): number[][] {
  const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(1));
  const stack: [number, number][] = [[1, 1]];
  grid[1][1] = 0;
  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const dirs = rng.shuffle([[0, 2], [0, -2], [2, 0], [-2, 0]]);
    let moved = false;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr > 0 && nr < size - 1 && nc > 0 && nc < size - 1 && grid[nr][nc] === 1) {
        grid[r + Math.floor(dr / 2)][c + Math.floor(dc / 2)] = 0;
        grid[nr][nc] = 0;
        stack.push([nr, nc]);
        moved = true;
        break;
      }
    }
    if (!moved) stack.pop();
  }
  return grid;
}


function addExtraPassages(grid: number[][], count: number, rng: RNG): void {
  const size = grid.length;
  let added = 0, tries = 0;
  while (added < count && tries < 200000) {
    tries++;
    const r = 1 + rng.int(size - 2);
    const c = 1 + rng.int(size - 2);
    if (grid[r][c] !== 1) continue;
    const horiz = r > 0 && r < size - 1 && grid[r - 1][c] === 0 && grid[r + 1][c] === 0;
    const vert  = c > 0 && c < size - 1 && grid[r][c - 1] === 0 && grid[r][c + 1] === 0;
    if (horiz || vert) { grid[r][c] = 0; added++; }
  }
}


function findCorridors(
  grid: number[][],
  minLen: number,
  rng: RNG
): Array<{ ar: number; ac: number; br: number; bc: number }> {
  const rows = grid.length, cols = grid[0].length;
  const corridors: Array<{ ar: number; ac: number; br: number; bc: number }> = [];


  for (let r = 1; r < rows - 1; r++) {
    let start = -1;
    for (let c = 1; c < cols; c++) {
      const open = c < cols - 1 && grid[r][c] === 0;
      if (open) { if (start === -1) start = c; }
      else {
        if (start !== -1 && c - start >= minLen)
          corridors.push({ ar: r, ac: start, br: r, bc: c - 1 });
        start = -1;
      }
    }
  }


  for (let c = 1; c < cols - 1; c++) {
    let start = -1;
    for (let r = 1; r < rows; r++) {
      const open = r < rows - 1 && grid[r][c] === 0;
      if (open) { if (start === -1) start = r; }
      else {
        if (start !== -1 && r - start >= minLen)
          corridors.push({ ar: start, ac: c, br: r - 1, bc: c });
        start = -1;
      }
    }
  }

  return rng.shuffle(corridors);
}

function cellToWorld(row: number, col: number, rows: number, cols: number): Vec3 {
  return {
    x: col * CELL_SIZE - (cols * CELL_SIZE) / 2 + CELL_SIZE / 2,
    y: 0.5,
    z: row * CELL_SIZE - (rows * CELL_SIZE) / 2 + CELL_SIZE / 2,
  };
}


function buildMazeData(
  size: number,
  seed: number,
  extraPassages: number,
  gemCount: number,
  obstacleCount: number,
  minSpeed: number,
  maxSpeed: number,
): MazeData {
  const rng = new RNG(seed);
  const maze = generateGrid(size, rng);
  addExtraPassages(maze, extraPassages, rng);

  const rows = maze.length, cols = maze[0].length;


  const openCells: [number, number][] = [];
  for (let r = 1; r < rows - 1; r++)
    for (let c = 1; c < cols - 1; c++)
      if (maze[r][c] === 0 && !(r === 1 && c === 1))
        openCells.push([r, c]);


  const shuffled = rng.shuffle(openCells);
  const step = Math.max(1, Math.floor(shuffled.length / (gemCount * 1.3)));
  const gemCells = shuffled.filter((_, i) => i % step === 0).slice(0, gemCount);
  const collectiblePositions: Vec3[] = gemCells.map(([r, c]) => ({
    ...cellToWorld(r, c, rows, cols),
    y: 0.5,
  }));


  const corridors = findCorridors(maze, 3, rng);
  const obstaclePaths: MazeData["obstaclePaths"] = corridors
    .slice(0, obstacleCount)
    .map(({ ar, ac, br, bc }) => ({
      a: cellToWorld(ar, ac, rows, cols),
      b: cellToWorld(br, bc, rows, cols),
      speed: minSpeed + rng.next() * (maxSpeed - minSpeed),
    }));

  const playerStart: Vec3 = {
    x: 1 * CELL_SIZE - (cols * CELL_SIZE) / 2 + CELL_SIZE / 2,
    y: 1,
    z: 1 * CELL_SIZE - (rows * CELL_SIZE) / 2 + CELL_SIZE / 2,
  };

  return { maze, rows, cols, collectiblePositions, obstaclePaths, playerStart };
}


const MAZE_LIBRARY: Record<Difficulty, MazeData> = {
  easy:   buildMazeData(17, 0xDEAD1234, 22,   22,   5,    1.5,    2.5),
  normal: buildMazeData(21, 0xCAFEBEEF,  8,   32,   7,    2.0,    3.5),
  hard:   buildMazeData(25, 0xBAADF00D,  0,   40,  10,    2.5,    4.5),
};

export function getMazeData(difficulty: Difficulty): MazeData {
  return MAZE_LIBRARY[difficulty];
}


