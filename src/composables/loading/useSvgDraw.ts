import { ref, type Ref } from 'vue';
import { svgPaths } from '@/utils/svgPaths';

type UseSvgDrawOptions = {
  canvasRef: Ref<HTMLCanvasElement | null>;
  ctx: Ref<CanvasRenderingContext2D | null>;
  width: Ref<number>;
  height: Ref<number>;
  isMobile: Ref<boolean>;
};

type DrawPoint = {
  x: number;
  y: number;
};

type SvgPathItem = {
  svgPath: SVGPathElement;
  length: number;
  progress: number;
  speed: number;
};

type Offset = {
  x: number;
  y: number;
};

export function useSvgDraw({
  canvasRef,
  ctx,
  width,
  height,
  isMobile,
}: UseSvgDrawOptions) {
  const lastDrawPos = ref<DrawPoint>({ x: 0, y: 0 });

  // ==================================================
  // Pathデータの処理
  // ==================================================
  const processPaths = (): SvgPathItem[] => {
    return svgPaths.map((d: string) => {
      const p = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      ) as SVGPathElement;

      p.setAttribute('d', d);

      const length = p.getTotalLength();

      return {
        svgPath: p,
        length,
        progress: 0,
        speed: 12 + Math.min(length / 60, 30),
      };
    });
  };

  // ==================================================
  // モバイル対応: 描画行を分ける
  // ==================================================
  const splitPathsForMobile = (
    paths: SvgPathItem[]
  ): { line1: SvgPathItem[]; line2: SvgPathItem[] } => {
    if (!isMobile.value) {
      return { line1: paths, line2: [] };
    }

    const mid = Math.ceil(paths.length / 2);

    return {
      line1: paths.slice(0, mid),
      line2: paths.slice(mid),
    };
  };

  // ==================================================
  // SVGのBBox計算
  // ==================================================
  const getBBoxForPaths = (pathList: SvgPathItem[]): DOMRect => {
    const svg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    ) as SVGSVGElement;

    pathList.forEach((p) => {
      const el = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      ) as SVGPathElement;

      el.setAttribute('d', p.svgPath.getAttribute('d') || '');
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
  const setDrawingStyle = (): void => {
    if (!ctx.value) return;

    ctx.value.strokeStyle = 'rgba(209,179,138,0.9)';
    ctx.value.lineWidth = 6;
    ctx.value.lineCap = 'round';
  };

  // ==================================================
  // 描画処理
  // ==================================================
  const drawSegment = (
    target: SvgPathItem,
    scale: number,
    offsetLine1: Offset,
    offsetLine2: Offset | null,
    isMobileLayout: boolean,
    paths: SvgPathItem[],
    current: number,
    line1: SvgPathItem[],
    onFinish?: (pos: DrawPoint) => void
  ): void => {
    if (!ctx.value) return;

    ctx.value.beginPath();

    const step = 20;
    const offset =
      isMobileLayout && current >= line1.length && offsetLine2
        ? offsetLine2
        : offsetLine1;

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
        setTimeout(() => {
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
          );
        }, 60);
      } else {
        onFinish?.(lastDrawPos.value);
      }
    }
  };

  // ==================================================
  // 描画開始
  // ==================================================
  function drawNext(onFinish?: (pos: DrawPoint) => void): void {
    if (!canvasRef.value || !ctx.value) return;

    const paths = processPaths();
    if (!paths.length) return;

    const { line1, line2 } = splitPathsForMobile(paths);

    const box1 = getBBoxForPaths(line1);
    const box2 = line2.length ? getBBoxForPaths(line2) : null;

    const isMobileLayout = isMobile.value;

    const scale = isMobileLayout
      ? 0.65 * (width.value / box1.width)
      : 0.5 * (width.value / box1.width);

    const centerX = width.value / 2;
    const lineGap = isMobileLayout ? box1.height * scale * 0.7 : 0;

    const offsetLine1: Offset = {
      x: centerX - (box1.x + box1.width / 2) * scale,
      y: height.value / 2 - (box1.y + box1.height / 2) * scale - lineGap,
    };

    const offsetLine2: Offset | null = box2
      ? {
          x: centerX - (box2.x + box2.width / 2) * scale,
          y: height.value / 2 - (box2.y + box2.height / 2) * scale + lineGap,
        }
      : null;

    setDrawingStyle();

    drawSegment(
      paths[0],
      scale,
      offsetLine1,
      offsetLine2,
      isMobileLayout,
      paths,
      0,
      line1,
      onFinish
    );
  }

  return {
    drawNext,
    lastDrawPos,
  };
}
