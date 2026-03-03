import { ref } from 'vue';
import doSoundSrc from '@/assets/sounds/do.mp3';
import reSoundSrc from '@/assets/sounds/re.mp3';
import miSoundSrc from '@/assets/sounds/mi.mp3';
import faSoundSrc from '@/assets/sounds/fa.mp3';
import soSoundSrc from '@/assets/sounds/so.mp3';
import ponSoundSrc from '@/assets/sounds/pon.mp3';

// ===============================
// 型定義
// ===============================

// ドレミ音（ランダム対象）
const NOTE_NAMES = ['do', 're', 'mi', 'fa', 'so'] as const;
type NoteSound = (typeof NOTE_NAMES)[number];

// ===============================
// Composable
// ===============================
export function useSound() {
  const soundEnabled = ref<boolean>(false);

  // 🎵 ドレミ音だけ管理
  const noteAudioMap: Record<NoteSound, HTMLAudioElement> = {
    do: new Audio(doSoundSrc),
    re: new Audio(reSoundSrc),
    mi: new Audio(miSoundSrc),
    fa: new Audio(faSoundSrc),
    so: new Audio(soSoundSrc),
  };

  // 🔔 ポンは完全分離
  const ponAudio = new Audio(ponSoundSrc);

  let lastPlayedSound: NoteSound | null = null;

  // ===============================
  // ドレミをランダム再生
  // ===============================
  const playSound = (): void => {
    if (!soundEnabled.value) return;

    let soundToPlay: NoteSound;

    do {
      soundToPlay = NOTE_NAMES[Math.floor(Math.random() * NOTE_NAMES.length)];
    } while (soundToPlay === lastPlayedSound);

    lastPlayedSound = soundToPlay;

    const audio = noteAudioMap[soundToPlay];
    audio.currentTime = 0;
    audio.play().catch(console.error);
  };

  // ===============================
  // ポン再生（削除時）
  // ===============================
  const playPon = (): void => {
    if (!soundEnabled.value) return;

    ponAudio.currentTime = 0;
    ponAudio.play().catch(console.error);
  };

  // ===============================
  // ON/OFF
  // ===============================
  const toggleSound = (): void => {
    soundEnabled.value = !soundEnabled.value;

    if (!soundEnabled.value) {
      Object.values(noteAudioMap).forEach((audio) => audio.pause());
      ponAudio.pause();
    }
  };

  return {
    soundEnabled,
    playSound,
    playPon,
    toggleSound,
  };
}
