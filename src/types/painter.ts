export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface BrushAction {
  type: 'brush';
  points: Point[];
  color: Color | null;
  size: number;
  isEraser: boolean;
  startColor?: Color;
}

export interface BucketAction {
  type: 'bucket';
  startPoint: Point;
  fillColor: Color;
}

export type PaintAction = BrushAction | BucketAction;

export interface PainterStore {
  isPainting: boolean;
  actions: PaintAction[];
  actionIndex: number;
  currentAction: PaintAction | null;
  addAction(action: PaintAction): void;
  undo(): void;
  redo(): void;
  save(): void;
  restore(): void;
}
