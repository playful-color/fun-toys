/** すべてのボール（標的・発射弾）のベースとなる共通の物理・ライフサイクル状態モデル */
export type BallBase = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  hit: boolean;
  life?: number;
  isDemo?: boolean;
  isFirst?: boolean;
  exitTime?: number;
};

/** 的（ターゲット）モデル：ゲーム内の標的オブジェクトとして識別される個別のボール属性 */
export type TargetBall = BallBase & {
  type: 'target';
  color: string;
};

/** 発射弾（ショット）モデル：ユーザーが操作やフリックで撃ち出した弾オブジェクトとして識別される個別のボール属性 */
export type ShotBall = BallBase & {
  type: 'shot';
  color: string;
};

/** 物理演算や描画ループで一括管理するための、すべてのボールオブジェクト（標的 / 発射弾）を包括する統合Union型 */
export type Ball = TargetBall | ShotBall;

/** 衝突時やイベント発生時にトリガーされる、画面上の波紋・粒子エフェクトの物理・描画状態モデル */
export interface Effect {
  id: number;
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
}
