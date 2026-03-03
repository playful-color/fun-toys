// src/composables/about/types.ts
export type Ball = {
  id: number | string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  scale: number;
  hit: boolean;

  // optional
  isDemo?: boolean;
  isFirst?: boolean;
  type?: 'target' | 'shot';
  exitTime?: number;
  life?: number;
};

export type Effect = {
  id: number;
  x: number;
  y: number;
};
