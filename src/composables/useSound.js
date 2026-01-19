// composables/useSound.js
import { ref } from 'vue'

// ドレミ音とポン音の音源をインポート
import doSoundSrc from '@/assets/sounds/do.mp3'
import reSoundSrc from '@/assets/sounds/re.mp3'
import miSoundSrc from '@/assets/sounds/mi.mp3'
import faSoundSrc from '@/assets/sounds/fa.mp3'
import soSoundSrc from '@/assets/sounds/so.mp3'
import ponSoundSrc from '@/assets/sounds/pon.mp3'

// useSound関数：音の制御を行うカスタムフック
export function useSound() {
  
  // サウンドのオン・オフ状態を保持する変数
  const soundEnabled = ref(false)

  // ドレミ音のサウンドファイルを配列に格納
  const sounds = [doSoundSrc, reSoundSrc, miSoundSrc, faSoundSrc, soSoundSrc]
  
  // 各音源に対応するAudioオブジェクトを作成
  const audios = sounds.map(src => new Audio(src))
  
  // "ポン" の音源も一つのAudioオブジェクトとして作成
  const ponAudio = new Audio(ponSoundSrc)
  
  // 最後に再生した音源のインデックスを保存しておくための変数
  let lastIndex = -1

  // ランダムにドレミ音を再生する関数
  const playSound = () => {
    // サウンドが無効になっている場合、音を再生しない
    if (!soundEnabled.value) return

    // 再生する音源のインデックスをランダムに決定
    let randomIndex
    do {
      randomIndex = Math.floor(Math.random() * audios.length)  // 0〜audios.length-1のランダムなインデックス
    } while (randomIndex === lastIndex)  // 直前に再生した音と同じ音を再生しないようにする

    // 再生する音源を設定
    lastIndex = randomIndex  // 現在のインデックスをlastIndexとして保存
    const s = audios[randomIndex]
    
    // 音を最初から再生するため、currentTimeを0にリセット
    s.currentTime = 0
    
    // 音を再生（エラーが発生した場合は無視）
    s.play().catch(() => {})
  }

  // "ポン" の音を再生する関数
  const playPon = () => {
    // サウンドが無効になっている場合、音を再生しない
    if (!soundEnabled.value) return

    // ポン音も最初から再生するため、currentTimeを0にリセット
    ponAudio.currentTime = 0

    // ポン音を再生（エラーが発生した場合は無視）
    ponAudio.play().catch(() => {})
  }

  // サウンドのオン・オフを切り替える関数
  const toggleSound = () => {
    // サウンドのオン・オフを切り替え
    soundEnabled.value = !soundEnabled.value
    
    // サウンドが無効になった場合、すべての音を一時停止
    if (!soundEnabled.value) {
      audios.forEach(a => a.pause())  // ドレミ音をすべて一時停止
      ponAudio.pause()  // "ポン" 音を一時停止
    }
  }

  // この関数で返すのは、音の状態や、音を再生するための関数
  return {
    soundEnabled,  // サウンドが有効か無効かの状態を管理
    playSound,     // ランダムにドレミ音を再生する関数
    playPon,       // "ポン" の音を再生する関数
    toggleSound    // サウンドのオン・オフを切り替える関数
  }
}
