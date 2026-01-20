<template>
  <div>
    <canvas ref="canvas" class="loading-canvas" :class="{ finished: isFinished }" ></canvas>
    <div
      v-if="isMessageVisible"
      class="message-to-erase"
      :style="{ top: `${messagePos.top}px`, left: `${messagePos.left}px` }"
    >
      けして<br>みてね！
    </div>
  </div>
</template>

<script setup>
//コード整理、管理分け予定
import { ref, onMounted, onBeforeUnmount } from 'vue';

const canvas = ref(null);
const isFinished = ref(false);
const isMobile = ref(false);
const isUserErasing = ref(false);

const emit = defineEmits(['finished']);
const isMessageVisible = ref(false);
const messagePos = ref({ top: 0, left: 0 });

import crayonBg from '@/assets/images/home/crayon-bg.jpg';
import eraserCursor from '@/assets/images/home/eraser-cursor.png';

let c, width, height;
let brush = { radius: 160, swayAngle: 0, sway: 40, x: 0, y: 0 };
let handleMouseMove = null;
let eraseAnimId = null;

function showMessageToErase(x, y) {
  const rect = canvas.value.getBoundingClientRect();
  messagePos.value.top = rect.top + y - 100;
  messagePos.value.left = rect.left + x - 30;
  isMessageVisible.value = true;

  setTimeout(() => { isMessageVisible.value = false; }, 3000);
}

function finishCanvas() {
  isFinished.value = true;
  emit('finished');
}

async function drawImageBackground(ctx, width, height, src) {
  return new Promise(resolve => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const pattern = ctx.createPattern(img, 'repeat');
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
      resolve();
    };
  });
}

onMounted(async () => {
  isMobile.value = window.matchMedia("(pointer: coarse)").matches;
  c = canvas.value.getContext('2d');
  width = canvas.value.width = window.innerWidth;
  height = canvas.value.height = window.innerHeight;

  // 背景描画（同期）
  await drawImageBackground(c, width, height, crayonBg);


  const svgPaths = [
    "m 98.872004,82.161242 c 13.083026,-0.825128 25.977606,0.579178 38.991776,1.392563 28.73441,1.795902 57.58144,1.679071 86.33893,2.785128 8.81305,0.338964 17.69955,-1.030489 26.45871,0 7.50467,0.882903 14.79087,3.179005 22.28101,4.177691 0.60457,0.08061 58.78186,2.785126 27.85127,2.785126",
    "m 87.731497,169.89274 c 23.942613,-5.58413 48.090963,-3.64895 72.413293,-4.17769 21.61869,-0.46997 42.78802,-2.36332 64.05792,0 13.40548,1.48949 27.08038,0.5678 40.38434,2.78512 15.7823,2.63039 2.08891,2.20491 13.92563,4.17769 23.06635,3.8444 31.39615,12.66001 41.77691,33.42153 2.27622,4.55245 6.29652,8.59526 6.96281,13.92563 2.241,17.92799 2.554,53.76682 -6.96281,69.62817 -8.8438,14.73966 -25.52685,22.5243 -38.99178,32.02896 -39.94572,28.19698 -71.51685,38.1579 -119.76045,47.34716 -4.12916,0.7865 -8.44141,0.42982 -12.53307,1.39256 -14.22434,3.3469 -28.22435,8.35538 -43.16947,8.35538",
    "m 462.33106,108.61995 c 44.54514,2.268 90.17299,4.43992 133.68609,15.31819 11.66941,2.91736 23.87261,12.53308 36.20664,12.53308",
    "m 451.19055,313.32677 c 26.15136,12.37234 54.86714,25.53654 83.55381,30.6364 21.05601,3.74329 29.79676,-3.46548 48.73971,-5.57026 15.61236,-1.7347 35.32804,-1.90651 44.56203,-11.14051 0.87206,-0.87206 2.72882,0.0563 4.17769,-1.39256",
    "m 615.51303,75.198425 c 28.536,25.365325 -5.44863,-6.168755 27.85127,30.636395 3.75011,4.14486 8.58066,7.18809 12.53307,11.14051",
    "m 655.89737,59.880227 c 4.89272,8.322612 34.81409,22.564292 34.81409,32.02896",
    "M 946.94314,122.54558 746.41399,222.81015 935.80263,350.92598",
    "m 1063.9185,116.97533 94.6943,100.26456",
    "m 1375.8527,155.9671 c -50.125,2.7002 -230.0331,40.64445 -261.802,72.4133 -2.6989,2.69897 -12.954,65.02953 -11.1405,66.84305 10.3191,10.31908 32.1271,16.06355 44.5621,22.28101 81.3292,40.66463 103.1123,38.99178 194.9588,38.99178",
    "m 1565.2413,155.9671 c 73.4175,-21.624 144.6113,11.14051 217.2399,11.14051",
    "m 1676.6464,55.702537 c 0,90.980813 0,181.961623 0,272.942433 0,10.72329 2.885,33.02167 0,44.56203 -3.0836,12.3343 -5.5703,20.31105 -5.5703,33.42152",
    "m 1737.9192,233.95066 c 21.4531,-26.80408 172.6804,0 116.9753,0",
    "m 1732.3489,339.78548 c 23.6052,6.07673 42.272,18.35087 61.2728,27.85126 12.6629,6.33147 122.5456,-0.93664 122.5456,-5.57025",
    "m 2230.8118,180.24525 c -14.1337,21.95501 -54.1005,110.10364 -74.4273,126.1187 -7.6807,6.05142 -15.0572,12.20388 -22.2811,18.79961 -4.2684,3.89728 -8.6581,8.22756 -12.533,12.53307 -0.9942,1.10463 -1.6247,2.55303 -2.7851,3.48141 -0.8495,0.67953 -8.1508,5.11981 -9.0517,5.57025 -2.7726,1.38632 -17.2648,-4.97237 -20.8885,-6.26653 -22.1225,-7.9009 -45.078,-22.9927 -51.5248,-47.34716 -3.1125,-11.75814 0.9548,-26.70343 2.7851,-38.29549 2.0235,-12.8157 3.2825,-27.37054 13.2294,-36.90293 17.8895,-17.14418 56.2972,-36.27143 79.9734,-40.89118 14.306,-2.79142 40.447,-1.98558 54.9858,-3.02406 5.0931,-0.36379 10.2136,0.1245 15.3182,0 15.8757,-0.38721 29.0434,2.10578 44.6815,6.31602 21.209,5.71012 38.9622,24.86945 48.7397,43.86575 16.8602,32.75697 29.9624,65.11916 21.5847,102.35341 -4.1388,18.39474 -12.579,19.14953 -26.4587,29.24384 -6.0489,4.39918 -10.5478,5.08119 -13.2294,10.44422",
    "m 2417.4901,128.11583 c 15.7987,30.38123 27.9007,61.56935 33.4215,94.69432 4.8854,29.31197 18.509,129.91401 38.9918,150.39685 15.4972,15.49716 41.0081,22.78509 61.2728,27.85127 53.7561,13.43903 69.7397,-31.19392 77.9835,-72.4133 2.0634,-10.31655 21.1591,-55.70254 5.5703,-55.70254",
    "m 2768.4161,189.38863 c 42.7765,30.42265 37.3252,91.21858 66.843,128.11583 12.1042,15.13027 26.2977,20.72743 38.9918,33.42152",
    "m 2963.375,150.39685 c 27.9486,19.91523 50.5941,46.30096 77.9835,66.84304 32.5395,24.40461 38.9918,23.68258 38.9918,61.27279",
  ];


  // Path オブジェクト化
  const paths = svgPaths.map(d => {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    return { svgPath: p, length: p.getTotalLength(), progress: 0, speed: 12 + Math.min(p.getTotalLength() / 60, 30) };
  });

  const isMobileLayout = isMobile.value;
  let line1 = [], line2 = [];
  if (isMobileLayout) {
    const mid = Math.ceil(paths.length / 2);
    line1 = paths.slice(0, mid);
    line2 = paths.slice(mid);
  } else {
    line1 = paths;
  }

  function getBBoxForPaths(pathList) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    pathList.forEach(p => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
      el.setAttribute("d", p.svgPath.getAttribute("d"));
      svg.appendChild(el);
    });
    document.body.appendChild(svg);
    const box = svg.getBBox();
    document.body.removeChild(svg);
    return box;
  }

  const box1 = getBBoxForPaths(line1);
  const box2 = line2.length ? getBBoxForPaths(line2) : null;
  const scale = (width / box1.width) * (isMobileLayout ? 0.65 : 0.5);
  const centerX = width / 2;
  const lineGap = isMobileLayout ? box1.height * scale * 0.7 : 0;

  const offsetLine1 = { x: centerX - (box1.x + box1.width/2) * scale, y: height/2 - (box1.y + box1.height/2) * scale - lineGap };
  const offsetLine2 = box2 ? { x: centerX - (box2.x + box2.width/2) * scale, y: height/2 - (box2.y + box2.height/2) * scale + lineGap } : null;

  c.strokeStyle = `rgba(209,179,138,${0.7 + Math.random()*0.3})`;
  c.lineWidth = 6 + Math.random()*3;
  c.lineCap = "round";

  let current = 0;
  const lastDrawPos = { x: 0, y: 0 };

  function drawNext() {
    const target = paths[current];
    c.globalCompositeOperation = "source-over";

    function drawSegment() {
      c.beginPath();
      const step = 20;
      for (let i = Math.max(0, target.progress - 60); i <= target.progress; i += step) {
        const pt = target.svgPath.getPointAtLength(i);
        const isSecondLine = isMobileLayout && current >= line1.length;
        const offset = isSecondLine ? offsetLine2 : offsetLine1;

        const jitterX = (Math.random() - 0.5) * 1;
        const jitterY = (Math.random() - 0.5) * 1;
        const x = pt.x * scale + offset.x + jitterX;
        const y = pt.y * scale + offset.y + jitterY;

        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);

        lastDrawPos.x = x; lastDrawPos.y = y;
      }
      c.stroke();
      target.progress += target.speed;
      if (target.progress < target.length) requestAnimationFrame(drawSegment);
      else {
        current++;
        if (current < paths.length) setTimeout(() => requestAnimationFrame(drawNext), 60);
        else showMessageToErase(lastDrawPos.x + 30, lastDrawPos.y - 100), startErase();
      }
    }
    drawSegment();
  }

  function startErase() {
    if (!canvas.value) return;

    const eraseScale = isMobile.value ? 0.35 : 1;
    brush.radius = 160 * eraseScale;
    brush.sway = 40 * eraseScale;
    canvas.value.style.cursor = `url(${eraserCursor}) 16 16, auto`;
    c.globalCompositeOperation = "destination-out";

    let lastMouse = { x: 0, y: 0, t: Date.now() };

    function getEraseProgress() {
      const imgData = c.getImageData(0,0,width,height).data;
      let total = imgData.length/4/16, count=0;
      for (let i=0;i<imgData.length;i+=4*16) if(imgData[i+3]<50) count++;
      return count/total;
    }

    handleMouseMove = (e) => {
      if(!canvas.value) return;
      const now = Date.now();
      const dt = now - lastMouse.t || 16;
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      const speed = Math.sqrt(dx*dx+dy*dy)/dt;
      let baseRadius = brush.radius + 30*(1-Math.min(speed*10,1));

      for(let i=0;i<3;i++){
        const offsetX=(Math.random()-0.5)*20;
        const offsetY=(Math.random()-0.5)*20;
        const radius=baseRadius*(0.7+Math.random()*0.6);
        const rx=radius*(0.8+Math.random()*0.4);
        const ry=radius*(0.6+Math.random()*0.5);
        const grad=c.createRadialGradient(e.clientX+offsetX,e.clientY+offsetY,0,e.clientX+offsetX,e.clientY+offsetY,radius);
        grad.addColorStop(0,"rgba(0,0,0,1)");
        grad.addColorStop(1,"rgba(0,0,0,0)");
        c.fillStyle=grad;
        c.beginPath();
        c.ellipse(e.clientX+offsetX,e.clientY+offsetY,rx,ry,0,0,Math.PI*2);
        c.fill();
      }
      lastMouse={x:e.clientX,y:e.clientY,t:now};
    };

    canvas.value.addEventListener("mousemove", handleMouseMove);

    // タッチイベント
    if(isMobile.value){
      function handleTouchStart(){ isUserErasing.value=true; }
      function handleTouchEnd(){ isUserErasing.value=false; }
      function handleTouchMove(e){ handleMouseMove({clientX:e.touches[0].clientX,clientY:e.touches[0].clientY}); }

      canvas.value.addEventListener("touchstart",handleTouchStart,{passive:true});
      canvas.value.addEventListener("touchend",handleTouchEnd,{passive:true});
      canvas.value.addEventListener("touchcancel",handleTouchEnd,{passive:true});
      canvas.value.addEventListener("touchmove",handleTouchMove,{passive:true});

      onBeforeUnmount(()=>{
        canvas.value.removeEventListener("touchstart",handleTouchStart);
        canvas.value.removeEventListener("touchend",handleTouchEnd);
        canvas.value.removeEventListener("touchcancel",handleTouchEnd);
        canvas.value.removeEventListener("touchmove",handleTouchMove);
      });
    }

    function autoErase() {
      const angle=Math.random()*Math.PI*2;
      const dist = isMobile.value?20+Math.random()*20:30+Math.random()*30;
      brush.x = Math.max(0,Math.min(width,brush.x+Math.cos(angle)*dist));
      brush.y = Math.max(0,Math.min(height,brush.y+Math.sin(angle)*dist));
      brush.swayAngle += 0.5;
      const sway=Math.sin(brush.swayAngle)*brush.sway;

      for(let i=0;i<3;i++){
        const offsetX=(Math.random()-0.5)*20;
        const offsetY=(Math.random()-0.5)*20;
        const radius=brush.radius*(0.7+Math.random()*0.6);
        const rx=radius*(0.8+Math.random()*0.4);
        const ry=radius*(0.6+Math.random()*0.5);
        const grad=c.createRadialGradient(brush.x+sway+offsetX,brush.y+offsetY,0,brush.x+sway+offsetX,brush.y+offsetY,radius);
        grad.addColorStop(0,"rgba(0,0,0,1)");
        grad.addColorStop(1,"rgba(0,0,0,0)");
        c.fillStyle=grad;
        c.beginPath();
        c.ellipse(brush.x+sway+offsetX,brush.y+offsetY,rx,ry,0,0,Math.PI*2);
        c.fill();
      }
    }

    function eraseLoop() {
      if(!canvas.value) return;
      if(!(isMobile.value && isUserErasing.value)) autoErase();
      if(getEraseProgress()>=0.9){ finishCanvas(); return; }
      eraseAnimId = requestAnimationFrame(eraseLoop);
    }
    eraseAnimId = requestAnimationFrame(eraseLoop);
  }

  drawNext();
});

onBeforeUnmount(() => {
  if(canvas.value && handleMouseMove) canvas.value.removeEventListener("mousemove",handleMouseMove);
  if(eraseAnimId) cancelAnimationFrame(eraseAnimId);
});
</script>


<style lang="scss" scoped>
@use "@/assets/styles/variables" as vars;
@use "@/assets/styles/mixins" as *; // mixins は as * で使う
.loading-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9998;
  transition: opacity 0.5s;
  &.finished {
    opacity: 0;
    pointer-events: none;
    z-index: -1;
  }
}

.message-to-erase {
  position: fixed;
  background-color: rgba(0,0,0,0.8);
  color: #fff;
  padding: 5px 10px 10px;
  font-size: 16px;
  line-height: 1.4;
  border-radius: 20px;
  text-align: center;
  z-index: 99999;
  white-space: pre-line;
  animation: fadeOut 2s ease-in-out forwards;
  transform: rotate(45deg);
  transform-origin: left top;
  &::after {
  content: "";
    position: absolute;
    bottom: -10px;  /* 吹き出しの三角 */
    left: 50%;
    transform: translateX(-50%);
    border-width: 10px 10px 0 10px;
    border-style: solid;
    border-color: rgba(0,0,0,0.8) transparent transparent transparent;
  }
  @include sp {
    width: 25vw;
    font-size: vw(16);
  }
}

@keyframes fadeOut {
  0% { opacity: 1; transform: rotate(45deg); }
  100% { opacity: 0; transform: rotate(45deg) translateY(-10px); }
}


</style>
