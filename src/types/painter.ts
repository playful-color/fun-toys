/** アプリ共通のRGBAカラー型：UI、ブラシ、バケツ塗りのすべての色彩基準として共有 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** キャラクター描画モデル：画像の実体（HTMLImageElement）とCanvas上のレイアウト・配置情報を一元管理 */
export interface Character {
  img: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Canvas上の共通2次元座標モデル */
export interface Point {
  x: number;
  y: number;
}

/** ブラシの描画アルゴリズムを切り替える識別子（normal: 通常ペン / marker: 透過・重ね塗り） */
export type BrushType = 'normal' | 'marker';

/** ユーザーの1回の連続したストローク（描画操作）を保持するモデル：Undo/Redoの最小単位 */
export interface BrushAction {
  type: 'brush';
  points: Point[];
  color: Color;
  size: number;
  isEraser: boolean;
  brushType: BrushType;
  startColor?: Color; // NOTE: グラデーションや補助機能を見据えた将来的な拡張枠（現状未使用）
}

/** ピクセル単位の塗りつぶし操作モデル：バケツ塗り実行時の座標と色を保持し、Undo/Redoの単位として扱う */
export interface BucketAction {
  type: 'bucket';
  startPoint: Point;
  fillColor: Color;
}

/** すべての描画操作を「1つの時系列履歴」として一元管理するためのUnion型（PainterStoreで使用） */
export type PaintAction = BrushAction | BucketAction;

/**
 * 【ペインターデータ管理コア（Store）】
 * アプリ全体の描画履歴、現在の再生位置（インデックス）、Undo/Redo、永続化（保存/復元）を司る中心的な状態管理インターフェース。
 */
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
