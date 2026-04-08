import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import type { KeyState } from './useKeyboard'
import { createDynamicCapsule, createStaticBox, createWorld, readBodyPosition } from '../physics/ammo'

type SourceKind = 'Google Maps' | 'OpenStreetMap' | 'Tabelog'

export type TokyoPoint = {
  id: string
  x: number
  z: number
  lat: number
  lng: number
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
  onJump?: () => void
  onFootstep?: () => void
}

const BASE_LAT = 35.681236
const BASE_LNG = 139.767125
const METERS_PER_DEG_LAT = 111_320
const METERS_PER_DEG_LNG = METERS_PER_DEG_LAT * Math.cos((BASE_LAT * Math.PI) / 180)
const WORLD_SCALE = 1 / 180

function latLngToWorld(lat: number, lng: number): { x: number; z: number } {
  return {
    x: (lng - BASE_LNG) * METERS_PER_DEG_LNG * WORLD_SCALE,
    z: -((lat - BASE_LAT) * METERS_PER_DEG_LAT * WORLD_SCALE),
  }
}

function lngToTileX(lng: number, zoom: number) {
  return ((lng + 180) / 360) * Math.pow(2, zoom)
}

function latToTileY(lat: number, zoom: number) {
  const rad = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom)
}

function tileXToLng(x: number, zoom: number) {
  return (x / Math.pow(2, zoom)) * 360 - 180
}

function tileYToLat(y: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

type TileDescriptor = {
  key: string
  url: string
  fallbackUrl: string
  center: [number, number, number]
  size: [number, number]
}

function buildTokyoTileDescriptors(zoom: number) {
  // Rough Greater Tokyo extent for full-city top-view coverage.
  const minLat = 35.52
  const maxLat = 35.84
  const minLng = 139.55
  const maxLng = 139.95

  const xMin = Math.floor(lngToTileX(minLng, zoom))
  const xMax = Math.floor(lngToTileX(maxLng, zoom))
  const yMin = Math.floor(latToTileY(maxLat, zoom))
  const yMax = Math.floor(latToTileY(minLat, zoom))

  const maxTile = Math.pow(2, zoom) - 1
  const tiles: TileDescriptor[] = []

  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      if (x < 0 || y < 0 || x > maxTile || y > maxTile) continue
      const westLng = tileXToLng(x, zoom)
      const eastLng = tileXToLng(x + 1, zoom)
      const northLat = tileYToLat(y, zoom)
      const southLat = tileYToLat(y + 1, zoom)
      const nw = latLngToWorld(northLat, westLng)
      const se = latLngToWorld(southLat, eastLng)
      const width = Math.abs(se.x - nw.x)
      const depth = Math.abs(se.z - nw.z)
      const center: [number, number, number] = [(nw.x + se.x) / 2, 0.01, (nw.z + se.z) / 2]

      tiles.push({
        key: `${zoom}-${x}-${y}`,
        url: `/osm-tiles/${zoom}/${x}/${y}.png`,
        fallbackUrl: `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,
        center,
        size: [width, depth],
      })
    }
  }

  return tiles
}

function OSMTile({ tile }: { tile: TileDescriptor }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    let cancelled = false
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    const apply = (loaded: THREE.Texture) => {
      if (cancelled) return
      loaded.colorSpace = THREE.SRGBColorSpace
      loaded.anisotropy = 8
      setTex(loaded)
    }

    loader.load(tile.url, apply, undefined, () => {
      // Fallback to remote tile when local cache file is missing.
      loader.load(tile.fallbackUrl, apply, undefined, () => {
        if (!cancelled) setTex(null)
      })
    })
    return () => {
      cancelled = true
    }
  }, [tile.fallbackUrl, tile.url])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={tile.center} receiveShadow>
      <planeGeometry args={[tile.size[0], tile.size[1], 1, 1]} />
      <meshStandardMaterial map={tex ?? undefined} color={tex ? '#ffffff' : '#1e293b'} />
    </mesh>
  )
}

function PinVisual({
  color,
  position,
  stamped,
}: {
  color: string
  position: [number, number, number]
  stamped: boolean
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.15}
          transparent
          opacity={0.45}
        />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.24, 16]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>
      {stamped && (
        <>
          <mesh position={[0, 1.58, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.05, 24]} />
            <meshStandardMaterial color="#ef4444" emissive="#7f1d1d" emissiveIntensity={0.25} />
          </mesh>
          <Text position={[0, 1.62, 0]} fontSize={0.12} color="#fee2e2" anchorX="center" anchorY="middle">
            STAMP
          </Text>
        </>
      )}
      {!stamped && (
        <mesh position={[0, 1.5, 0]}>
          <torusGeometry args={[0.24, 0.03, 16, 48]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
      )}
    </group>
  )
}

function ShopVisual({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 24]} />
        <meshStandardMaterial color="#6b4423" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <torusGeometry args={[0.13, 0.03, 16, 32]} />
        <meshStandardMaterial color="#f59e0b" emissive="#7c2d12" emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}

function BoyVisual({ position }: { position: THREE.Vector3 }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.68, 0]}>
        <capsuleGeometry args={[0.22, 0.6, 8, 16]} />
        <meshStandardMaterial color="#60a5fa" />
      </mesh>
      <mesh castShadow position={[0, 1.18, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#fde68a" />
      </mesh>
    </group>
  )
}

export function AmmoScene({ points, currentDay, visited, onVisit, keys, onJump, onFootstep }: Props) {
  const { camera } = useThree()
  const [ready, setReady] = useState(false)
  const [physicsReady, setPhysicsReady] = useState(false)
  const worldRef = useRef<Awaited<ReturnType<typeof createWorld>> | null>(null)

  const playerBodyRef = useRef<any>(null)
  const pinBodiesRef = useRef<Map<number, string>>(new Map())

  const playerPos = useRef(new THREE.Vector3(0, 0, 0))
  const playerRenderPos = useRef(new THREE.Vector3(0, 0, 0))
  const smoothedCameraTarget = useRef(new THREE.Vector3(0, 1.0, 0))
  const smoothedCameraPos = useRef(new THREE.Vector3(0, 5.5, 7.5))
  const tmpPos = useMemo(() => ({ x: 0, y: 0, z: 0 }), [])
  const jumpLatch = useRef(false)
  const footstepLast = useRef(0)
  const tileZoom = 12
  const tiles = useMemo(() => buildTokyoTileDescriptors(tileZoom), [])

  const bounds = useMemo(() => {
    const minX = Math.min(...points.map((p) => p.x))
    const maxX = Math.max(...points.map((p) => p.x))
    const minZ = Math.min(...points.map((p) => p.z))
    const maxZ = Math.max(...points.map((p) => p.z))
    return {
      width: Math.max(22, maxX - minX + 10),
      depth: Math.max(22, maxZ - minZ + 10),
    }
  }, [points])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const pw = await createWorld()
        if (cancelled) return

        worldRef.current = pw

        createStaticBox({
          Ammo: pw.Ammo,
          world: pw.world,
          halfExtents: [bounds.width / 2, 0.5, bounds.depth / 2],
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
            halfExtents: [0.55, 0.9, 0.55],
            position: [p.x, 0.75, p.z],
            friction: 0.0,
            restitution: 0.0,
            userIndex: pinIndex,
          })
          pinBodiesRef.current.set(pinIndex, p.id)
          void pin
        }

        setPhysicsReady(true)
      } catch {
        setPhysicsReady(false)
      } finally {
        setReady(true)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [bounds.depth, bounds.width, points])

  useFrame((_state, dt) => {
    const pw = worldRef.current
    const playerBody = playerBodyRef.current
    const input = new THREE.Vector3(
      (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
      0,
      (keys.back ? 1 : 0) - (keys.forward ? 1 : 0),
    )

    // Camera-relative movement on XZ plane.
    const camForward = new THREE.Vector3()
    camera.getWorldDirection(camForward)
    camForward.y = 0
    if (camForward.lengthSq() < 1e-6) camForward.set(0, 0, -1)
    camForward.normalize()
    const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize()

    const desiredMove = new THREE.Vector3()
    desiredMove.addScaledVector(camRight, input.x)
    desiredMove.addScaledVector(camForward, input.z)

    if (!pw || !playerBody || !physicsReady) {
      if (desiredMove.lengthSq() > 0) {
        desiredMove.normalize().multiplyScalar(18 * dt)
        playerPos.current.add(desiredMove)
        const now = performance.now()
        if (now - footstepLast.current > 280) {
          footstepLast.current = now
          onFootstep?.()
        }
      }

      const followOffset = new THREE.Vector3(0, 32, 0.01)
      const desiredCamPos = playerPos.current.clone().add(followOffset)
      const desiredLookAt = playerPos.current.clone()
      const lerpAlpha = 1 - Math.exp(-dt * 6)
      smoothedCameraPos.current.lerp(desiredCamPos, lerpAlpha)
      smoothedCameraTarget.current.lerp(desiredLookAt, lerpAlpha)
      camera.position.copy(smoothedCameraPos.current)
      camera.lookAt(smoothedCameraTarget.current)
      playerRenderPos.current.set(playerPos.current.x, 1.6, playerPos.current.z)
      return
    }

    const step = Math.min(dt, 1 / 30)

    // Basic movement in physics world (camera-relative, on XZ plane)
    const move = desiredMove
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(18)

    const Ammo = pw.Ammo
    const vel = playerBody.getLinearVelocity()
    const yVel = vel.y()

    const desiredVel = new Ammo.btVector3(move.x, yVel, move.z)
    playerBody.setLinearVelocity(desiredVel)

    if (keys.jump && Math.abs(yVel) < 0.05) {
      if (!jumpLatch.current) {
        jumpLatch.current = true
        onJump?.()
        playerBody.applyCentralImpulse(new Ammo.btVector3(0, 3.2, 0))
      }
    } else if (!keys.jump) {
      jumpLatch.current = false
    }

    pw.world.stepSimulation(step, 5)

    // Sync render position
    readBodyPosition({
      body: playerBody,
      out: tmpPos,
      tmpTransform: pw.tmpTransform,
    })
    playerPos.current.set(tmpPos.x, tmpPos.y, tmpPos.z)

    // Third-person follow camera with smoothing.
    const followOffset = new THREE.Vector3(0, 32, 0.01)
    const desiredCamPos = playerPos.current.clone().add(followOffset)
    const desiredLookAt = playerPos.current.clone()
    const lerpAlpha = 1 - Math.exp(-dt * 6)
    smoothedCameraPos.current.lerp(desiredCamPos, lerpAlpha)
    smoothedCameraTarget.current.lerp(desiredLookAt, lerpAlpha)
    camera.position.copy(smoothedCameraPos.current)
    camera.lookAt(smoothedCameraTarget.current)
    playerRenderPos.current.set(
      playerPos.current.x,
      1.6 + Math.sin(performance.now() * 0.004) * 0.12,
      playerPos.current.z,
    )

    if (move.lengthSq() > 0 && Math.abs(yVel) < 0.12) {
      const now = performance.now()
      if (now - footstepLast.current > 280) {
        footstepLast.current = now
        onFootstep?.()
      }
    }

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

  if (!ready) {
    return (
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[bounds.width, bounds.depth, 1, 1]} />
          <meshStandardMaterial color="#0a1222" />
        </mesh>
      </group>
    )
  }

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[bounds.width + 18, bounds.depth + 18, 1, 1]} />
        <meshStandardMaterial color="#0a1222" />
      </mesh>
      {tiles.map((tile) => (
        <OSMTile key={tile.key} tile={tile} />
      ))}
      <gridHelper args={[Math.max(bounds.width, bounds.depth) + 18, 24, '#1f2937', '#0b1220']} />

      {points.map((p) => {
        const isVisited = visited.has(p.id)
        const isToday = p.day === currentDay
        const color = isVisited ? '#22c55e' : isToday ? '#f97316' : '#4b5563'
        return (
          <group key={p.id}>
            <ShopVisual position={[p.x, 0, p.z]} />
            <PinVisual color={color} position={[p.x, 0, p.z]} stamped={isVisited} />
          </group>
        )
      })}

      <BoyVisual position={playerRenderPos.current} />
      {!physicsReady && (
        <Text
          position={[playerRenderPos.current.x, playerRenderPos.current.y + 2, playerRenderPos.current.z]}
          fontSize={0.22}
          color="#f97316"
        >
          Physics fallback mode
        </Text>
      )}
    </group>
  )
}

