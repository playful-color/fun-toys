import { ref } from 'vue';

export function usePointer({
  onTap = () => {},
  onThrow = () => {},
  onDown = () => {},
  tapDistanceThreshold = 20,
  throwDistanceThreshold = 40,
  tapTimeThreshold = 300,
}) {
  const touchStates = new Map();

  // リアクティブ状態の追加
  const dragInProgress = ref(false);
  const lastDragTime = ref(0);

  // ==================================================
  // ポインター位置取得のユーティリティ
  // ==================================================
  const getPos = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x = 0,
      y = 0;
    if (e instanceof PointerEvent || e instanceof MouseEvent) {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    } else if (e instanceof TouchEvent) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    }
    return { x, y };
  };

  // ==================================================
  // touchStates 更新処理
  // ==================================================
  const updateTouchState = (id, pos) => {
    let state = touchStates.get(id) || {};
    touchStates.set(id, { ...state, ...pos, startTime: Date.now() });
  };

  // 共通のポインター/タッチイベントハンドラ
  const handlePointerTouch = (callback) => (e) => {
    const id = e.pointerId ?? e.identifier;
    const pos = getPos(e);
    updateTouchState(id, pos);
    callback(e, pos, touchStates.get(id));
  };

  // ポインターまたはタッチが押された時の処理
  const startPointer = handlePointerTouch((e, pos, state) => {
    onDown?.(e);
    e.preventDefault();
    updateTouchState(state.id, { startX: pos.x, startY: pos.y });
  });

  // ポインターまたはタッチの移動時の処理
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

  // ポインターが離れた（タッチ終了、ポインター終了）ときの処理
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

  // ポインターやタッチがキャンセルされた場合の処理
  const cancelPointer = (e) => {
    const id = e.pointerId ?? e.identifier;
    if (id) touchStates.delete(id);
  };

  // イベントリスナーの管理
  const managePointerTouchEvents = (element, action) => {
    const pointerEventsList = [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
    ];
    const touchEventsList = [
      'touchstart',
      'touchmove',
      'touchend',
      'touchcancel',
    ];

    const events = [...pointerEventsList, ...touchEventsList];

    events.forEach((event) => {
      const eventType = event.startsWith('pointer') ? 'pointer' : 'touch';
      const eventHandler =
        eventType === 'pointer' ? pointerEvents[event] : touchEvents[event];
      element[`${action}EventListener`](
        event,
        handlePointerTouch(eventHandler)
      );
    });
  };

  // ポインター/タッチ関連のイベントリスナーまとめ
  const pointerEvents = {
    pointerdown: startPointer,
    pointermove: movePointer,
    pointerup: endPointer,
    pointercancel: cancelPointer,
  };

  const touchEvents = {
    touchstart: startPointer,
    touchmove: movePointer,
    touchend: endPointer,
    touchcancel: cancelPointer,
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
