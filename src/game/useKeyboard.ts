import { useEffect, useMemo, useState } from 'react'

export type KeyState = {
  forward: boolean
  back: boolean
  left: boolean
  right: boolean
  jump: boolean
}

const defaultState: KeyState = {
  forward: false,
  back: false,
  left: false,
  right: false,
  jump: false,
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || target.isContentEditable
}

export function useKeyboard() {
  const [keys, setKeys] = useState<KeyState>(defaultState)

  const handlers = useMemo(() => {
    const set = (key: keyof KeyState, value: boolean) =>
      setKeys((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      if (e.code === 'KeyW' || e.code === 'ArrowUp') set('back', true)
      if (e.code === 'KeyS' || e.code === 'ArrowDown') set('forward', true)
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') set('left', true)
      if (e.code === 'KeyD' || e.code === 'ArrowRight') set('right', true)
      if (e.code === 'Space') set('jump', true)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') set('back', false)
      if (e.code === 'KeyS' || e.code === 'ArrowDown') set('forward', false)
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') set('left', false)
      if (e.code === 'KeyD' || e.code === 'ArrowRight') set('right', false)
      if (e.code === 'Space') set('jump', false)
    }

    return { onKeyDown, onKeyUp }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handlers.onKeyDown)
    window.addEventListener('keyup', handlers.onKeyUp)
    return () => {
      window.removeEventListener('keydown', handlers.onKeyDown)
      window.removeEventListener('keyup', handlers.onKeyUp)
    }
  }, [handlers])

  return keys
}

