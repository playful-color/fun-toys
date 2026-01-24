import { ref } from 'vue';
import pcA from '@/assets/images/home/01/2026_01a_pc.png';
import pcB from '@/assets/images/home/01/2026_01b_pc.png';
import pcC from '@/assets/images/home/01/2026_01c_pc.png';
import spA from '@/assets/images/home/01/2026_01a_sp.png';
import spB from '@/assets/images/home/01/2026_01b_sp.png';
import spC from '@/assets/images/home/01/2026_01c_sp.png';

const pcImages = [pcA, pcB, pcC];
const spImages = [spA, spB, spC];

export function useCharacter(isMobile) {
  const characters = ref([]);

  function getStorageKey() {
    return isMobile.value ? 'currentCharacterSrc_sp' : 'currentCharacterSrc_pc';
  }

  function loadRandomCharacterOnce() {
    const images = isMobile.value ? spImages : pcImages;
    const key = getStorageKey();
    const savedSrc = localStorage.getItem(key);

    if (savedSrc && images.includes(savedSrc)) return savedSrc;

    const randomSrc = images[Math.floor(Math.random() * images.length)];
    localStorage.setItem(key, randomSrc);
    return randomSrc;
  }

  function getRandomCharacterSrc() {
    const images = isMobile.value ? spImages : pcImages;
    const key = getStorageKey();
    const savedSrc = localStorage.getItem(key);
    let newSrc;

    do {
      newSrc = images[Math.floor(Math.random() * images.length)];
    } while (newSrc === savedSrc && images.length > 1);

    localStorage.setItem(key, newSrc);
    return newSrc;
  }

  function changeRandomCharacter(resetPaintFn) {
    const newSrc = getRandomCharacterSrc();
    const img = new Image();
    img.src = newSrc;
    img.onload = () => {
      resetPaintFn?.(); // 塗りリセット
      characters.value.splice(0, characters.value.length, {
        img,
        x: 0,
        y: 0,
        width: isMobile.value ? 400 : 1000,
        height:
          (isMobile.value ? 400 : 1000) *
          (img.naturalHeight / img.naturalWidth),
      });
    };
  }

  function ensureCharacterMatchesDevice(resetPaintFn) {
    if (!characters.value.length) return;
    const currentSrc = characters.value[0].img.src;
    const images = isMobile.value ? spImages : pcImages;
    if (!images.includes(currentSrc)) {
      changeRandomCharacter(resetPaintFn);
    }
  }

  return {
    characters,
    loadRandomCharacterOnce,
    changeRandomCharacter,
    ensureCharacterMatchesDevice,
  };
}
