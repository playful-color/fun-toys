import { ref } from 'vue';
import doSoundSrc from '@/assets/sounds/do.mp3';
import reSoundSrc from '@/assets/sounds/re.mp3';
import miSoundSrc from '@/assets/sounds/mi.mp3';
import faSoundSrc from '@/assets/sounds/fa.mp3';
import soSoundSrc from '@/assets/sounds/so.mp3';
import ponSoundSrc from '@/assets/sounds/pon.mp3';

export function useSound() {
  const soundEnabled = ref(false);
  const soundFiles = [
    { name: 'do', src: doSoundSrc },
    { name: 're', src: reSoundSrc },
    { name: 'mi', src: miSoundSrc },
    { name: 'fa', src: faSoundSrc },
    { name: 'so', src: soSoundSrc },
    { name: 'pon', src: ponSoundSrc },
  ];

  // soundFiles 配列から Audio オブジェクトを生成
  const audioElements = soundFiles.reduce((acc, { name, src }) => {
    acc[name] = new Audio(src);
    return acc;
  }, {});

  // 最新の音源のインデックスを追跡
  let lastPlayedSound = '';

  // ==================================================
  // 音の再生関数
  // ==================================================
  const playSound = () => {
    // サウンドが無効の場合は何もしない
    if (!soundEnabled.value) return;

    // すでに最後に再生した音を避けてランダムに音を選ぶ
    let soundToPlay;
    do {
      soundToPlay =
        Object.keys(audioElements)[
          Math.floor(Math.random() * Object.keys(audioElements).length)
        ];
    } while (soundToPlay === lastPlayedSound);

    // 再生する音をセットし、音を再生
    lastPlayedSound = soundToPlay;
    const audio = audioElements[soundToPlay];
    audio.currentTime = 0; // 再生位置をリセット
    audio.play().catch((error) => {
      console.error(`Error playing sound ${soundToPlay}:`, error);
    });
  };

  // "ポン" の音を再生
  const playPon = () => {
    if (!soundEnabled.value) return;

    const ponAudio = audioElements['pon'];
    ponAudio.currentTime = 0;
    ponAudio.play().catch((error) => {
      console.error('Error playing pon sound:', error);
    });
  };

  // ==================================================
  // サウンドのオン・オフ切り替え関数
  // ==================================================
  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value;
    // サウンドオフの場合は全ての音を一時停止
    if (!soundEnabled.value) {
      Object.values(audioElements).forEach((audio) => audio.pause());
    }
  };

  // ==================================================
  // 戻り値
  // ==================================================
  return {
    soundEnabled,
    playSound,
    playPon,
    toggleSound,
  };
}
