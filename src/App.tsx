import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { useGameAudio } from './audio/useGameAudio'

type Obstacle = { id: number; x: number; width: number; height: number }
type Hole = { id: number; x: number; width: number }
type Ramen = { id: number; x: number; y: number }
type DamageCause = 'obstacle' | 'hole' | null

const WORLD_WIDTH = 980
const WORLD_HEIGHT = 430
const GROUND_Y = 330
const PLAYER_X = 170
const PLAYER_WIDTH = 52
const PLAYER_HEIGHT = 82
const RUN_SPEED = 320
const GRAVITY = 2100
const JUMP_VELOCITY = -850
const DAMAGE_COOLDOWN = 0.85
const FIRE_HITBOX_LEFT_OFFSET = -20
const FIRE_HITBOX_WIDTH = 96
const FIRE_HITBOX_TOP_OFFSET = -88
const FIRE_HITBOX_HEIGHT = 96
const SHOW_HITBOX_DEBUG = false
const FALL_IMAGE_SRC =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='150' viewBox='0 0 220 150'><rect width='220' height='150' rx='16' fill='%23111827'/><text x='110' y='52' text-anchor='middle' font-size='42'>😵</text><text x='110' y='88' text-anchor='middle' font-size='19' fill='%23fca5a5' font-family='Arial'>Fell into a hole!</text><text x='110' y='116' text-anchor='middle' font-size='14' fill='%23e5e7eb' font-family='Arial'>-1 life</text></svg>"

const START_STATE = {
  score: 0,
  ramenCount: 0,
  lives: 3,
  sceneryOffset: 0,
  playerY: GROUND_Y - PLAYER_HEIGHT,
  velocityY: 0,
  isGrounded: true,
  gameOver: false,
  damageCause: null as DamageCause,
  showFallImage: false,
  obstacles: [] as Obstacle[],
  holes: [] as Hole[],
  ramen: [] as Ramen[],
}

function App() {
  const [game, setGame] = useState(START_STATE)
  const [isRunning, setIsRunning] = useState(true)
  const worldRef = useRef<HTMLElement | null>(null)
  const gameRef = useRef(game)
  const spawnRef = useRef(0.65)
  const damageRef = useRef(0)
  const idRef = useRef(0)
  const { onStamp, onJump, onUi } = useGameAudio(isRunning)

  useEffect(() => {
    gameRef.current = game
  }, [game])

  const restart = () => {
    onUi()
    spawnRef.current = 0.65
    damageRef.current = 0
    setGame(START_STATE)
    setIsRunning(true)
  }

  const triggerJump = () => {
    if (!isRunning) return
    setGame((prev) => {
      if (prev.gameOver || !prev.isGrounded) return prev
      onJump()
      return {
        ...prev,
        velocityY: JUMP_VELOCITY,
        isGrounded: false,
      }
    })
  }

  useEffect(() => {
    worldRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        triggerJump()
      }
      if (event.code === 'KeyR' && gameRef.current.gameOver) restart()
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 0) triggerJump()
    }
    const onBlur = () => {
      // no-op
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('blur', onBlur)
    }
  }, [isRunning])

  useEffect(() => {
    let raf = 0
    let previous = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.033)
      previous = now
      if (isRunning) {
        setGame((prev) => updateGame(prev, dt))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isRunning])

  const topScore = useMemo(() => game.score.toLocaleString(), [game.score])
  const ramenTier = useMemo(() => {
    if (game.ramenCount <= 9) return 'Ramen Newbie'
    if (game.ramenCount <= 30) return 'Beginner'
    if (game.ramenCount <= 60) return 'Intermediate'
    if (game.ramenCount <= 100) return 'Advanced'
    return 'Ramen Otaku'
  }, [game.ramenCount])

  return (
    <div className="app-root">
      <section
        ref={worldRef}
        className="runner-world"
        tabIndex={0}
        onMouseDown={() => {
          if (isRunning) triggerJump()
          worldRef.current?.focus()
        }}
        onKeyDown={(event) => {
          if (event.code === 'Space' || event.key === ' ') {
            event.preventDefault()
            triggerJump()
          }
          if (event.code === 'KeyR' && gameRef.current.gameOver) {
            restart()
          }
        }}
      >
        <button
          className="run-toggle"
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsRunning((prev) => !prev)
            worldRef.current?.focus()
          }}
          aria-label={isRunning ? 'Stop game' : 'Start game'}
          title={isRunning ? 'Stop' : 'Start'}
        >
          {isRunning ? '⏸️' : '▶️'}
        </button>

        <div className="sky" />
        <div
          className="scenery-layer"
          aria-hidden="true"
          style={{ transform: `translateX(${-game.sceneryOffset}px)` }}
        >
          <div className="scenery-chunk">
            <div className="cloud cloud-a" />
            <div className="cloud cloud-b" />
            <div className="cloud cloud-c" />

            <div className="mountain mountain-a" />
            <div className="mountain mountain-b" />
            <div className="mountain mountain-c" />

            <div className="building building-a" />
            <div className="building building-b" />
            <div className="building building-c" />
            <div className="building building-d" />
          </div>
          <div className="scenery-chunk" style={{ left: WORLD_WIDTH }}>
            <div className="cloud cloud-a" />
            <div className="cloud cloud-b" />
            <div className="cloud cloud-c" />

            <div className="mountain mountain-a" />
            <div className="mountain mountain-b" />
            <div className="mountain mountain-c" />

            <div className="building building-a" />
            <div className="building building-b" />
            <div className="building building-c" />
            <div className="building building-d" />
          </div>
        </div>
        <div className="ground" />
        <div className="ramen-counter">🍜 x {game.ramenCount}</div>

        {game.holes.map((hole) => (
          <div key={hole.id} className="hole" style={{ left: hole.x, width: hole.width }} />
        ))}

        {game.obstacles.map((obs) => (
          <div key={obs.id}>
            <div className="obstacle" style={{ left: obs.x, fontSize: obs.height * 0.8 }}>
              🔥
            </div>
            {SHOW_HITBOX_DEBUG && (
              <div
                className="fire-hitbox-debug"
                style={{
                  left: obs.x + FIRE_HITBOX_LEFT_OFFSET,
                  top: GROUND_Y + FIRE_HITBOX_TOP_OFFSET,
                  width: FIRE_HITBOX_WIDTH,
                  height: FIRE_HITBOX_HEIGHT,
                }}
              />
            )}
          </div>
        ))}

        {game.ramen.map((item) => (
          <div key={item.id} className="ramen" style={{ left: item.x, top: item.y }}>
            🍜
          </div>
        ))}

        <div className="player" style={{ left: PLAYER_X, top: game.playerY }}>
          <div className="boy-head" />
          <div className="boy-body" />
        </div>
      </section>

      <aside className="app-ui">
        <h1 className="app-title">Hungry G Runner</h1>
        <p className="app-subtitle">Boy runs left to right. Jump with SPACE or left click.</p>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Score</div>
            <div className="stat-value">{topScore}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Lives</div>
            <div className="stat-value">{game.lives}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Tier</div>
            <div className="stat-value">{ramenTier}</div>
          </div>
        </div>

        <button className="btn-primary" type="button" tabIndex={-1} onClick={restart}>
          Restart
        </button>
        {game.showFallImage && (
          <img className="fall-image" src={FALL_IMAGE_SRC} alt="Character fell into a hole" />
        )}
        {game.gameOver && <div className="game-over">Game Over</div>}
      </aside>
    </div>
  )

  function updateGame(prev: typeof START_STATE, dt: number): typeof START_STATE {
    if (prev.gameOver) return prev

    let playerY = prev.playerY
    let velocityY = prev.velocityY
    let isGrounded = prev.isGrounded
    let score = prev.score + Math.floor(dt * 120)
    let ramenCount = prev.ramenCount
    let lives = prev.lives
    let sceneryOffset = prev.sceneryOffset + RUN_SPEED * dt
    if (sceneryOffset >= WORLD_WIDTH) {
      sceneryOffset -= WORLD_WIDTH
    }
    let damageCause: DamageCause = null
    let showFallImage = prev.showFallImage

    velocityY += GRAVITY * dt
    playerY += velocityY * dt
    const floorY = GROUND_Y - PLAYER_HEIGHT
    if (playerY >= floorY) {
      playerY = floorY
      velocityY = 0
      isGrounded = true
    }

    spawnRef.current -= dt
    let obstacles = prev.obstacles
    let holes = prev.holes
    let ramen = prev.ramen

    if (spawnRef.current <= 0) {
      const roll = Math.random()
      const x = WORLD_WIDTH + 40 + Math.random() * 120
      idRef.current += 1
      if (roll < 0.47) {
        obstacles = [
          ...obstacles,
          { id: idRef.current, x, width: 42 + Math.random() * 36, height: 42 + Math.random() * 48 },
        ]
      } else if (roll < 0.76) {
        holes = [...holes, { id: idRef.current, x, width: 90 + Math.random() * 70 }]
      } else {
        const ramenBatch: Ramen[] = []
        for (let i = 0; i < 3; i += 1) {
          idRef.current += 1
          ramenBatch.push({
            id: idRef.current,
            x: x + i * 46,
            y: 160 + Math.random() * 96,
          })
        }
        ramen = [...ramen, ...ramenBatch]
      }
      spawnRef.current = 0.75 + Math.random() * 0.85
    }

    obstacles = obstacles
      .map((obs) => ({ ...obs, x: obs.x - RUN_SPEED * dt }))
      .filter((obs) => obs.x + obs.width > -50)
    holes = holes.map((h) => ({ ...h, x: h.x - RUN_SPEED * dt })).filter((h) => h.x + h.width > -50)
    ramen = ramen.map((item) => ({ ...item, x: item.x - RUN_SPEED * dt })).filter((item) => item.x > -40)

    const playerLeft = PLAYER_X
    const playerRight = PLAYER_X + PLAYER_WIDTH
    const playerTop = playerY
    const playerBottom = playerY + PLAYER_HEIGHT
    const playerHitLeft = playerLeft + 10
    const playerHitRight = playerRight - 10
    const playerHitTop = playerTop + 12
    const playerHitBottom = playerBottom - 8

    let hit = false
    for (const obs of obstacles) {
      // Exact fire hitbox rectangle used for both collision and debug rendering.
      const fireLeft = obs.x + FIRE_HITBOX_LEFT_OFFSET
      const fireRight = fireLeft + FIRE_HITBOX_WIDTH
      const fireTop = GROUND_Y + FIRE_HITBOX_TOP_OFFSET
      const fireBottom = fireTop + FIRE_HITBOX_HEIGHT
      // Fire is intentionally forgiving: use full player body overlap.
      const overlapX = playerRight > fireLeft && playerLeft < fireRight
      const overlapY = playerBottom > fireTop && playerTop < fireBottom
      if (overlapX && overlapY) {
        hit = true
        break
      }
    }
    for (const hole of holes) {
      const overlapX = playerHitRight > hole.x + 10 && playerHitLeft < hole.x + hole.width - 10
      if (overlapX && isGrounded) {
        hit = true
        break
      }
    }

    if (damageRef.current > 0) damageRef.current -= dt
    if (hit && damageRef.current <= 0) {
      lives -= 1
      damageRef.current = DAMAGE_COOLDOWN
      onUi()
      damageCause = detectDamageCause(obstacles, holes, playerLeft, playerRight, isGrounded)
      showFallImage = damageCause === 'hole'
    }
    if (showFallImage && damageRef.current <= 0.3) showFallImage = false

    const keptRamen: Ramen[] = []
    for (const item of ramen) {
      const closeX = Math.abs(item.x - (PLAYER_X + 20)) < 35
      const closeY = Math.abs(item.y - playerTop) < 55
      if (closeX && closeY) {
        score += 1000
        ramenCount += 1
        onStamp()
      } else {
        keptRamen.push(item)
      }
    }

    return {
      score,
      ramenCount,
      lives: Math.max(lives, 0),
      sceneryOffset,
      playerY,
      velocityY,
      isGrounded,
      gameOver: lives <= 0,
      damageCause,
      showFallImage,
      obstacles,
      holes,
      ramen: keptRamen,
    }
  }

  function detectDamageCause(
    obstacles: Obstacle[],
    holes: Hole[],
    playerLeft: number,
    playerRight: number,
    isGrounded: boolean,
  ): DamageCause {
    for (const obs of obstacles) {
      const fireLeft = obs.x + FIRE_HITBOX_LEFT_OFFSET
      const fireRight = fireLeft + FIRE_HITBOX_WIDTH
      if (playerRight > fireLeft && playerLeft < fireRight && isGrounded) {
        return 'obstacle'
      }
    }
    if (isGrounded) {
      for (const hole of holes) {
        if (playerRight > hole.x && playerLeft < hole.x + hole.width) return 'hole'
      }
    }
    return null
  }
}

export default App
