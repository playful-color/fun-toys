/**
 * 【キャラクター画像管理 Composable】
 * PC/SP別の画像セットのランダム選択、localStorageによる永続化、端末適合を管理。
 *
 * NOTE:
 * - キャラは単一（`characters[0]`）前提の設計（マルチキャラ未対応）。
 * - `img.onload`（ロード完了）をトリガーにCanvas側の再描画と同期する。
 * - `localStorage` 依存のため、そのままではSSR（Nuxt等）環境で動作しないので注意。
 *
 * TODO: ランダム切替のPromise化（ロード完了の外部制御）、画像プリロードの導入、Map化による高速化。
 */
import { ref, Ref } from 'vue';
import type { Character } from '@/types/painter';
import { pcImages, spImages } from '@/data/characterImages';

/** キャラクター変更に連動する処理（描画リセットや後続の同期コールバック）の制御オプション */
interface ChangeRandomCharacterOptions {
  resetPaint?: () => void;
  characters?: Character[];
  onAfterChange?: () => void;
}

export function useCharacterImage(isMobile: Ref<boolean>) {
  const currentImage: Ref<string | null> = ref(null);
  const getStorageKey = (): string =>
    isMobile.value ? 'currentCharacterSrc_sp' : 'currentCharacterSrc_pc';

  // --- ランダムキャラクター取得（重複回避） ------------
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

  // --- 初回キャラクター読み込み（永続化優先） -----------
  const loadRandomCharacterOnce = (): string => {
    const images = isMobile.value ? spImages : pcImages;
    const key = getStorageKey();
    const savedSrc = localStorage.getItem(key);

    if (savedSrc && images.includes(savedSrc)) return savedSrc;

    const randomSrc = images[Math.floor(Math.random() * images.length)];
    localStorage.setItem(key, randomSrc);
    return randomSrc;
  };

  // --- キャラクター変更 -------------------------------
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

  // --- 端末とキャラ整合性チェック ----------------------
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

  // --- 現在キャラクター種別取得 -----------------------
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
