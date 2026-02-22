import { ref, Ref } from 'vue';
import { pcImages, spImages } from '@/data/characterImages';

export interface Character {
  img: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ChangeRandomCharacterOptions {
  resetPaint?: () => void;
  characters?: Character[];
  onAfterChange?: () => void;
}

export function useCharacterImage(isMobile: Ref<boolean>) {
  const currentImage: Ref<string | null> = ref(null);

  // localStorageキー取得
  const getStorageKey = (): string =>
    isMobile.value ? 'currentCharacterSrc_sp' : 'currentCharacterSrc_pc';

  // 前回と被らないランダム画像
  const getRandomCharacterSrc = (): string => {
    const images = isMobile.value ? spImages : pcImages;
    const key = getStorageKey();
    const savedSrc = localStorage.getItem(key);
    let newSrc: string;

    do {
      newSrc = images[Math.floor(Math.random() * images.length)];
    } while (newSrc === savedSrc && images.length > 1);

    localStorage.setItem(key, newSrc);
    return newSrc;
  };

  // 初回のみランダム取得
  const loadRandomCharacterOnce = (): string => {
    const images = isMobile.value ? spImages : pcImages;
    const key = getStorageKey();
    const savedSrc = localStorage.getItem(key);

    if (savedSrc && images.includes(savedSrc)) return savedSrc;

    const randomSrc = images[Math.floor(Math.random() * images.length)];
    localStorage.setItem(key, randomSrc);
    return randomSrc;
  };

  //キャラクター切り替え
  const changeRandomCharacter = (
    options: ChangeRandomCharacterOptions = {}
  ): void => {
    const { resetPaint, characters, onAfterChange } = options;
    const newSrc = getRandomCharacterSrc();
    const img = new Image();
    img.src = newSrc;

    img.onload = () => {
      resetPaint?.();

      if (characters) {
        characters.splice(0, characters.length, {
          img,
          x: 0,
          y: 0,
          width: isMobile.value ? 400 : 1000,
          height:
            (isMobile.value ? 400 : 1000) *
            (img.naturalHeight / img.naturalWidth),
        });
      }

      onAfterChange?.();
    };
  };

  // 端末とキャラ画像の不一致を防ぐ
  const ensureCharacterMatchesDevice = (
    characters: Character[] | undefined,
    changeFn: (options?: ChangeRandomCharacterOptions) => void
  ): void => {
    if (!characters?.length) return;

    const src = characters[0].img.src;
    const currentType = pcImages.includes(src)
      ? 'pc'
      : spImages.includes(src)
        ? 'sp'
        : null;

    const shouldBe = isMobile.value ? 'sp' : 'pc';

    if (currentType && currentType !== shouldBe) {
      changeFn({ characters });
    }
  };

  // 現在の画像種別取得
  const getCurrentImageType = (
    characters: Character[] | undefined
  ): 'pc' | 'sp' | null => {
    if (!characters?.length) return null;
    const src = characters[0].img.src;

    if (pcImages.includes(src)) return 'pc';
    if (spImages.includes(src)) return 'sp';

    return null;
  };

  return {
    currentImage,
    getRandomCharacterSrc,
    loadRandomCharacterOnce,
    changeRandomCharacter,
    ensureCharacterMatchesDevice,
    getCurrentImageType,
  };
}
