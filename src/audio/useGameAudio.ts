import { useCallback, useEffect, useRef } from 'react'
import useSound from 'use-sound'

const BGM = '/assets/audio/bgm_ambient.ogg'
const SFX_STAMP = '/assets/audio/sfx_stamp.ogg'
const SFX_DAY = '/assets/audio/sfx_day_complete.ogg'
const SFX_JUMP = '/assets/audio/sfx_jump.ogg'
const SFX_STEP = '/assets/audio/sfx_footstep.ogg'
const SFX_UI = '/assets/audio/sfx_ui.ogg'

export function useGameAudio(isRunning: boolean) {
  const [playBgm, { stop: stopBgm }] = useSound(BGM, {
    loop: true,
    volume: 0.22,
    interrupt: true,
  })

  const [playStamp] = useSound(SFX_STAMP, { volume: 0.55 })
  const [playDayComplete] = useSound(SFX_DAY, { volume: 0.45 })
  const [playJump] = useSound(SFX_JUMP, { volume: 0.35 })
  const [playFootstep] = useSound(SFX_STEP, { volume: 0.2 })
  const [playUi] = useSound(SFX_UI, { volume: 0.4 })

  useEffect(() => {
    if (isRunning) {
      playBgm()
    } else {
      stopBgm()
    }
    return () => {
      stopBgm()
    }
  }, [isRunning, playBgm, stopBgm])

  const onStamp = useCallback(() => {
    playStamp()
  }, [playStamp])

  const onDayComplete = useCallback(() => {
    playDayComplete()
  }, [playDayComplete])

  const onJump = useCallback(() => {
    playJump()
  }, [playJump])

  const footstepLast = useRef(0)
  const onFootstep = useCallback(() => {
    const now = performance.now()
    if (now - footstepLast.current < 280) return
    footstepLast.current = now
    playFootstep()
  }, [playFootstep])

  const onUi = useCallback(() => {
    playUi()
  }, [playUi])

  return {
    onStamp,
    onDayComplete,
    onJump,
    onFootstep,
    onUi,
  }
}
