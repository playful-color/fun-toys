import { ref, Ref } from 'vue';

// =======================================
// 型定義
// =======================================

type PointerLikeEvent = PointerEvent | MouseEvent | TouchEvent;

interface TouchState {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  startTime: number;
}

interface UsePointerOptions {
  onTap?: (x: number, y: number) => void;
  onThrow?: (x: number, y: number, dx: number, dy: number) => void;
  onDown?: (e: Event) => void;
  tapDistanceThreshold?: number;
  throwDistanceThreshold?: number;
  tapTimeThreshold?: number;
}

// =======================================
// Composable
// =======================================

export function usePointer({
  onTap = () => {},
  onThrow = () => {},
  onDown = () => {},
  tapDistanceThreshold = 20,
  throwDistanceThreshold = 40,
  tapTimeThreshold = 300,
}: UsePointerOptions) {
  const touchStates = new Map<number, TouchState>();

  const dragInProgress = ref<boolean>(false);
  const lastDragTime = ref<number>(0);

  // ==================================================
  // 座標取得
  // ==================================================

  const getPos = (e: PointerLikeEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    let x = 0;
    let y = 0;

    if (e instanceof PointerEvent || e instanceof MouseEvent) {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    } else if (e instanceof TouchEvent && e.touches.length > 0) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    }

    return { x, y };
  };

  // ==================================================
  // 状態更新
  // ==================================================

  const updateTouchState = (id: number, partial: Partial<TouchState>) => {
    const prev = touchStates.get(id);

    const next: TouchState = {
      id,
      startX: prev?.startX ?? 0,
      startY: prev?.startY ?? 0,
      x: prev?.x ?? 0,
      y: prev?.y ?? 0,
      startTime: prev?.startTime ?? Date.now(),
      ...partial,
    };

    touchStates.set(id, next);
  };

  type PointerLikeEvent = PointerEvent | MouseEvent | TouchEvent;

  const getEventId = (e: PointerLikeEvent, touchIndex = 0): number => {
    if ('pointerId' in e) return e.pointerId; // PointerEvent

    if ('touches' in e && e.touches.length > touchIndex) {
      return e.touches[touchIndex].identifier; // TouchEvent なら touches[0] の id を返す
    }

    return 0; // MouseEvent
  };

  // ==================================================
  // 共通ハンドラ
  // ==================================================

  const handlePointerTouch =
    (
      callback: (
        e: PointerLikeEvent,
        pos: { x: number; y: number },
        state: TouchState
      ) => void
    ) =>
    (e: PointerLikeEvent) => {
      const id = getEventId(e);
      const pos = getPos(e);

      updateTouchState(id, {
        x: pos.x,
        y: pos.y,
      });

      const state = touchStates.get(id)!;
      callback(e, pos, state);
    };

  // ==================================================
  // start
  // ==================================================

  const startPointer = handlePointerTouch((e, pos, state) => {
    onDown?.(e);
    e.preventDefault();

    updateTouchState(state.id, {
      startX: pos.x,
      startY: pos.y,
      startTime: Date.now(),
    });
  });

  // ==================================================
  // move
  // ==================================================

  const movePointer = handlePointerTouch((e, pos, state) => {
    e.preventDefault();

    const dx = pos.x - state.startX;
    const dy = pos.y - state.startY;

    if (Math.hypot(dx, dy) > 10) {
      const now = Date.now();
      if (now - lastDragTime.value > 16) {
        lastDragTime.value = now;
      }
      dragInProgress.value = true;
    }
  });

  // ==================================================
  // end
  // ==================================================

  const endPointer = handlePointerTouch((e, pos, state) => {
    e.preventDefault();

    const dx = pos.x - state.startX;
    const dy = pos.y - state.startY;

    const distance = Math.hypot(dx, dy);
    const time = Date.now() - state.startTime;

    if (distance < tapDistanceThreshold && time < tapTimeThreshold) {
      const OFFSET_RANGE = 16;
      const offsetX = (Math.random() - 0.5) * OFFSET_RANGE;
      const offsetY = (Math.random() - 0.5) * OFFSET_RANGE;

      onTap?.(state.startX + offsetX, state.startY + offsetY);
    } else if (distance > throwDistanceThreshold) {
      onThrow?.(state.startX, state.startY, dx, dy);
    }

    dragInProgress.value = false;
    touchStates.delete(state.id);
  });

  const cancelPointer = (e: PointerLikeEvent) => {
    const id = getEventId(e);
    touchStates.delete(id);
  };

  // ==================================================
  // イベント一括管理
  // ==================================================

  const managePointerTouchEvents = (
    element: HTMLElement,
    action: 'add' | 'remove'
  ) => {
    const events: (keyof HTMLElementEventMap)[] = [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'touchstart',
      'touchmove',
      'touchend',
      'touchcancel',
    ];

    events.forEach((event) => {
      const handler =
        event === 'pointerdown' || event === 'touchstart'
          ? startPointer
          : event === 'pointermove' || event === 'touchmove'
            ? movePointer
            : event === 'pointerup' || event === 'touchend'
              ? endPointer
              : cancelPointer;

      element[`${action}EventListener`](event, handler as EventListener);
    });
  };

  return {
    startPointer,
    movePointer,
    endPointer,
    cancelPointer,
    managePointerTouchEvents,
    dragInProgress,
  };
}
