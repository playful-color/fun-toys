export function usePointer({
  onTap = () => {},
  onThrow = () => {},
  onDown = () => {},
  tapDistanceThreshold = 20,
  throwDistanceThreshold = 40,
  tapTimeThreshold = 300
}) {
  const touchStates = new Map()

  // イベントからポインター位置を取得するユーティリティ関数
  const getPos = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    let x, y
    if (e instanceof PointerEvent || e instanceof MouseEvent) {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    } else if (e instanceof TouchEvent) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    }
    return { x, y }
  }

   // タッチまたはポインターが押された時の処理
  const startPointer = (e) => {
    onDown?.(e)
    e.preventDefault()
    const pos = getPos(e)
    const id = e.pointerId ?? e.identifier

    touchStates.set(id, {
      startX: pos.x,
      startY: pos.y,
      startTime: Date.now(),
      tappedBall: false
    })
  }

  // ドラッグ中のフラグと更新時間を管理
  let dragInProgress = false;
  let lastDragTime = 0;

  // ポインターまたはタッチの移動時の処理
  const movePointer = (e) => {
    e.preventDefault();
    const id = e.pointerId ?? e.identifier;
    const state = touchStates.get(id);
    if (!state) return;

    const pos = getPos(e);
    const dx = pos.x - state.startX;
    const dy = pos.y - state.startY;

    if (Math.hypot(dx, dy) > 10) {
      const now = Date.now();
      // 60fpsでの更新を強調
      if (now - lastDragTime > 16) {
        lastDragTime = now;
      }
      dragInProgress = true;
    }
  };

  // ポインターが離れた（タッチ終了、ポインター終了）ときの処理
  const endPointer = (e) => {
    e.preventDefault()
    const id = e.pointerId ?? e.identifier
    const state = touchStates.get(id)
    if (!state) return

    const pos = getPos(e)
    const dx = pos.x - state.startX
    const dy = pos.y - state.startY
    const distance = Math.hypot(dx, dy)
    const time = Date.now() - state.startTime

    if (distance < tapDistanceThreshold && time < tapTimeThreshold) {
      const OFFSET_RANGE = 16 // 好きな値でOK（px）
      const offsetX = (Math.random() - 0.5) * OFFSET_RANGE
      const offsetY = (Math.random() - 0.5) * OFFSET_RANGE
      onTap?.(
        state.startX + offsetX,
        state.startY + offsetY
      )
    } else if (distance > throwDistanceThreshold ) {
      onThrow?.(state.startX, state.startY, dx, dy)
    }

    // ドラッグ終了時にフラグをリセット
    dragInProgress = false

    touchStates.delete(id)
  }

  // ポインターやタッチがキャンセルされた場合の処理
  const cancelPointer = (e) => {
    const id = e.pointerId ?? e.identifier
    if (!id) return // もし ID がない場合は処理を行わない

    touchStates.delete(id)
  }

  // ポインター関連のイベントリスナーを登録
  const pointerEvents = {
    pointerdown: startPointer,
    pointermove: movePointer,
    pointerup: endPointer,
    pointercancel: cancelPointer
  }

  // タッチ関連のイベントリスナーを登録
  const touchEvents = {
    touchstart: startPointer,
    touchmove: movePointer,
    touchend: endPointer,
    touchcancel: cancelPointer
  }

  // イベントリスナーを要素に追加
  const attachEvents = (element) => {
    Object.entries(pointerEvents).forEach(([event, handler]) => {
      element.addEventListener(event, handler)
    })
    
    Object.entries(touchEvents).forEach(([event, handler]) => {
      element.addEventListener(event, handler)
    })
  }

  // イベントリスナーを要素から削除
  const removeEvents = (element) => {
    Object.entries(pointerEvents).forEach(([event, handler]) => {
      element.removeEventListener(event, handler)
    })
    
    Object.entries(touchEvents).forEach(([event, handler]) => {
      element.removeEventListener(event, handler)
    })
  }

  return { startPointer, movePointer, endPointer, cancelPointer, attachEvents, removeEvents }
}
