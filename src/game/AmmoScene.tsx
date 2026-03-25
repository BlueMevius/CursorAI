import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import type { KeyState } from './useKeyboard'
import { createDynamicCapsule, createStaticBox, createWorld, readBodyPosition } from '../physics/ammo'

type SourceKind = 'Google Maps' | 'OpenStreetMap' | 'Tabelog'

export type TokyoPoint = {
  id: string
  x: number
  z: number
  source: SourceKind
  day: number
}

const USERINDEX_PLAYER = 1
const USERINDEX_PIN_BASE = 10_000

type Props = {
  points: TokyoPoint[]
  currentDay: number
  visited: Set<string>
  onVisit: (id: string) => void
  keys: KeyState
}

function TokyoGroundVisual() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40, 1, 1]} />
        <meshStandardMaterial color="#0b1220" />
      </mesh>
      <gridHelper args={[40, 40, '#1f2937', '#0b1220']} />
    </group>
  )
}

function PinVisual({ color, position }: { color: string; position: [number, number, number] }) {
  const bowl = useGLTF('/assets/kenney/food-kit/Models/GLB%20format/bowl-broth.glb')
  return (
    <group position={position}>
      <primitive
        object={bowl.scene}
        scale={0.35}
        position={[0, 0.02, 0]}
        rotation={[0, 0.35, 0]}
      />
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
      </mesh>
    </group>
  )
}

function BoyVisual({ position }: { position: THREE.Vector3 }) {
  const boy = useGLTF('/assets/kenney/blocky-characters/Models/GLB%20format/character-g.glb')
  return (
    <group position={position}>
      <primitive object={boy.scene} scale={0.65} position={[0, 0.0, 0]} />
    </group>
  )
}

export function AmmoScene({ points, currentDay, visited, onVisit, keys }: Props) {
  const [ready, setReady] = useState(false)
  const worldRef = useRef<Awaited<ReturnType<typeof createWorld>> | null>(null)

  const playerBodyRef = useRef<any>(null)
  const pinBodiesRef = useRef<Map<number, string>>(new Map())

  const playerPos = useRef(new THREE.Vector3(0, 0, 0))
  const tmpPos = useMemo(() => ({ x: 0, y: 0, z: 0 }), [])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const pw = await createWorld()
      if (cancelled) return

      worldRef.current = pw

      createStaticBox({
        Ammo: pw.Ammo,
        world: pw.world,
        halfExtents: [20, 0.5, 20],
        position: [0, -0.5, 0],
        friction: 1.0,
        userIndex: 0,
      })

      const player = createDynamicCapsule({
        Ammo: pw.Ammo,
        world: pw.world,
        radius: 0.25,
        height: 0.7,
        mass: 1,
        position: [0, 1.2, 0],
        friction: 1.0,
        restitution: 0.0,
        angularFactor: [0, 0, 0],
        userIndex: USERINDEX_PLAYER,
      })

      player.body.setDamping(0.15, 0.9)
      playerBodyRef.current = player.body

      // Create a static collider for each pin (small box around it)
      for (const [idx, p] of points.entries()) {
        const pinIndex = USERINDEX_PIN_BASE + idx
        const pin = createStaticBox({
          Ammo: pw.Ammo,
          world: pw.world,
          halfExtents: [0.25, 0.6, 0.25],
          position: [p.x, 0.3, p.z],
          friction: 0.0,
          restitution: 0.0,
          userIndex: pinIndex,
        })
        pinBodiesRef.current.set(pinIndex, p.id)
        // keep pin around; visuals are separate
        void pin
      }

      setReady(true)
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [points])

  useFrame((_state, dt) => {
    const pw = worldRef.current
    const playerBody = playerBodyRef.current
    if (!pw || !playerBody) return

    const step = Math.min(dt, 1 / 30)

    // Basic movement (impulses in XZ)
    const move = new THREE.Vector3(
      (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
      0,
      (keys.back ? 1 : 0) - (keys.forward ? 1 : 0),
    )

    if (move.lengthSq() > 0) move.normalize().multiplyScalar(6)

    const Ammo = pw.Ammo
    const vel = playerBody.getLinearVelocity()
    const yVel = vel.y()

    const desiredVel = new Ammo.btVector3(move.x, yVel, move.z)
    playerBody.setLinearVelocity(desiredVel)

    if (keys.jump && Math.abs(yVel) < 0.05) {
      playerBody.applyCentralImpulse(new Ammo.btVector3(0, 3.2, 0))
    }

    pw.world.stepSimulation(step, 5)

    // Sync render position
    readBodyPosition({
      body: playerBody,
      out: tmpPos,
      tmpTransform: pw.tmpTransform,
    })
    playerPos.current.set(tmpPos.x, tmpPos.y, tmpPos.z)

    // Detect contacts: player vs pins
    const dispatcher = pw.dispatcher
    const numManifolds = dispatcher.getNumManifolds()
    for (let i = 0; i < numManifolds; i++) {
      const manifold = dispatcher.getManifoldByIndexInternal(i)
      const body0 = manifold.getBody0() as unknown as { getUserIndex: () => number }
      const body1 = manifold.getBody1() as unknown as { getUserIndex: () => number }
      const idx0 = body0.getUserIndex()
      const idx1 = body1.getUserIndex()
      const numContacts = manifold.getNumContacts()
      if (numContacts === 0) continue

      const isPlayer0 = idx0 === USERINDEX_PLAYER
      const isPlayer1 = idx1 === USERINDEX_PLAYER
      if (!isPlayer0 && !isPlayer1) continue

      const pinIdx = isPlayer0 ? idx1 : idx0
      const pinId = pinBodiesRef.current.get(pinIdx)
      if (!pinId) continue

      const point = points.find((p) => p.id === pinId)
      if (!point) continue
      if (point.day !== currentDay) continue
      if (visited.has(pinId)) continue

      onVisit(pinId)
    }
  })

  const playerRenderPos = playerPos.current

  if (!ready) {
    return (
      <group>
        <TokyoGroundVisual />
      </group>
    )
  }

  return (
    <group>
      <TokyoGroundVisual />

      {points.map((p) => {
        const isVisited = visited.has(p.id)
        const isToday = p.day === currentDay
        const color = isVisited ? '#22c55e' : isToday ? '#f97316' : '#4b5563'
        return <PinVisual key={p.id} color={color} position={[p.x, 0, p.z]} />
      })}

      <BoyVisual position={playerRenderPos} />
    </group>
  )
}

