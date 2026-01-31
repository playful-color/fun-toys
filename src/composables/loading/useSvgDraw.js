import { ref } from 'vue';
import { svgPaths } from '@/utils/svgPaths';

// ==================================================
// 初期化処理：描画位置の初期設定
// ==================================================
export function useSvgDraw({ canvasRef, ctx, width, height, isMobile }) {
  const lastDrawPos = ref({ x: 0, y: 0 });

  // ==================================================
  // Pathデータの処理
  // ==================================================
  const processPaths = () => {
    // Pathオブジェクト化
    const paths = svgPaths.map((d) => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      return {
        svgPath: p,
        length: p.getTotalLength(),
        progress: 0,
        speed: 12 + Math.min(p.getTotalLength() / 60, 30),
      };
    });

    return paths;
  };

  // ==================================================
  // モバイル対応: 描画行を分ける
  // ==================================================
  const splitPathsForMobile = (paths) => {
    const isMobileLayout = isMobile.value;
    let line1 = [],
      line2 = [];

    if (isMobileLayout) {
      const mid = Math.ceil(paths.length / 2);
      line1 = paths.slice(0, mid);
      line2 = paths.slice(mid);
    } else {
      line1 = paths;
    }

    return { line1, line2 };
  };

  // ==================================================
  // SVGのBBox計算（行揃え用）
  // ==================================================
  const getBBoxForPaths = (pathList) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    pathList.forEach((p) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', p.svgPath.getAttribute('d'));
      svg.appendChild(el);
    });
    document.body.appendChild(svg);
    const box = svg.getBBox();
    document.body.removeChild(svg);
    return box;
  };

  // ==================================================
  // 描画スタイル設定
  // ==================================================
  const setDrawingStyle = () => {
    ctx.value.strokeStyle = 'rgba(209,179,138,0.9)';
    ctx.value.lineWidth = 6;
    ctx.value.lineCap = 'round';
  };

  // ==================================================
  // 描画処理：1セグメントを描画
  // ==================================================
  const drawSegment = (
    target,
    scale,
    offsetLine1,
    offsetLine2,
    isMobileLayout,
    paths,
    current,
    line1,
    onFinish
  ) => {
    ctx.value.beginPath();
    const step = 20;
    const offset =
      isMobileLayout && current >= line1.length ? offsetLine2 : offsetLine1;

    for (
      let i = Math.max(0, target.progress - 60);
      i <= target.progress;
      i += step
    ) {
      const pt = target.svgPath.getPointAtLength(i);
      const x = pt.x * scale + offset.x;
      const y = pt.y * scale + offset.y;

      if (i === 0) ctx.value.moveTo(x, y);
      else ctx.value.lineTo(x, y);

      lastDrawPos.value = { x, y };
    }

    ctx.value.stroke();
    target.progress += target.speed;

    if (target.progress < target.length) {
      requestAnimationFrame(() =>
        drawSegment(
          target,
          scale,
          offsetLine1,
          offsetLine2,
          isMobileLayout,
          paths,
          current,
          line1,
          onFinish
        )
      );
    } else {
      current++;
      if (current < paths.length) {
        setTimeout(
          () =>
            requestAnimationFrame(() =>
              drawSegment(
                paths[current],
                scale,
                offsetLine1,
                offsetLine2,
                isMobileLayout,
                paths,
                current,
                line1,
                onFinish
              )
            ),
          60
        );
      } else {
        // 完了時コールバック
        onFinish && onFinish(lastDrawPos.value);
      }
    }
  };

  // ==================================================
  // 描画開始処理
  // ==================================================
  function drawNext(onFinish) {
    if (!canvasRef.value) return;

    const paths = processPaths();
    const { line1, line2 } = splitPathsForMobile(paths);

    const box1 = getBBoxForPaths(line1);
    const box2 = line2.length ? getBBoxForPaths(line2) : null;
    const isMobileLayout = isMobile.value;
    const scale = isMobileLayout
      ? 0.65 * (width.value / box1.width)
      : 0.5 * (width.value / box1.width);
    const centerX = width.value / 2;
    const lineGap = isMobileLayout ? box1.height * scale * 0.7 : 0;

    const offsetLine1 = {
      x: centerX - (box1.x + box1.width / 2) * scale,
      y: height.value / 2 - (box1.y + box1.height / 2) * scale - lineGap,
    };
    const offsetLine2 = box2
      ? {
          x: centerX - (box2.x + box2.width / 2) * scale,
          y: height.value / 2 - (box2.y + box2.height / 2) * scale + lineGap,
        }
      : null;

    // 描画スタイルの設定
    setDrawingStyle();

    let current = 0;

    // 描画開始
    if (paths.length > 0)
      drawSegment(
        paths[0],
        scale,
        offsetLine1,
        offsetLine2,
        isMobileLayout,
        paths,
        current,
        line1,
        onFinish
      );
  }

  // ==================================================
  // 戻り値
  // ==================================================
  return { drawNext, lastDrawPos };
}
