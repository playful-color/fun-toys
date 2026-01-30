import { ref } from 'vue';
import { svgPaths } from '@/utils/svgPaths';

export function useSvgDraw({ canvasRef, ctx, width, height, isMobile }) {
  const lastDrawPos = ref({ x: 0, y: 0 });

  function drawNext(onFinish) {
    if (!canvasRef.value) return;

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

    // モバイル時は2行に分ける
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

    // SVGのBBox計算（行揃え用）
    function getBBoxForPaths(pathList) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      pathList.forEach((p) => {
        const el = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path'
        );
        el.setAttribute('d', p.svgPath.getAttribute('d'));
        svg.appendChild(el);
      });
      document.body.appendChild(svg);
      const box = svg.getBBox();
      document.body.removeChild(svg);
      return box;
    }

    const box1 = getBBoxForPaths(line1);
    const box2 = line2.length ? getBBoxForPaths(line2) : null;
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

    // 線の描画スタイル（固定）
    ctx.value.strokeStyle = 'rgba(209,179,138,0.9)';
    ctx.value.lineWidth = 6;
    ctx.value.lineCap = 'round';

    let current = 0;

    function drawSegment(target) {
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
        requestAnimationFrame(() => drawSegment(target));
      } else {
        current++;
        if (current < paths.length) {
          setTimeout(
            () => requestAnimationFrame(() => drawSegment(paths[current])),
            60
          );
        } else {
          // 完了時コールバック
          onFinish && onFinish(lastDrawPos.value);
        }
      }
    }

    // 描画開始
    if (paths.length > 0) drawSegment(paths[0]);
  }

  return { drawNext, lastDrawPos };
}
