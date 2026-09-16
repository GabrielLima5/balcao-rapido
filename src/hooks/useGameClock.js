import { useEffect, useRef } from 'react'

const MAX_DELTA_MS = 250

// Único lugar do jogo com requestAnimationFrame/Date — engine.js nunca toca
// timers ou DOM. Chama onTick(deltaMs) a cada frame enquanto `active` for
// true; deltaMs é capado para não gerar saltos grandes após trocar de aba.
export function useGameClock(active, onTick) {
  const rafRef = useRef(null)
  const lastRef = useRef(null)
  const onTickRef = useRef(onTick)
  onTickRef.current = onTick

  useEffect(() => {
    if (!active) {
      lastRef.current = null
      return undefined
    }

    const step = (now) => {
      if (lastRef.current != null) {
        const delta = Math.min(now - lastRef.current, MAX_DELTA_MS)
        onTickRef.current(delta)
      }
      lastRef.current = now
      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      lastRef.current = null
    }
  }, [active])
}
