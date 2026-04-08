import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import './App.css'
import { useGameAudio } from './audio/useGameAudio'
import { AmmoScene } from './game/AmmoScene'
import { useKeyboard } from './game/useKeyboard'

type SourceKind = 'Google Maps' | 'OpenStreetMap' | 'Tabelog'

type Restaurant = {
  id: string
  name: string
  area: string
  lat: number
  lng: number
  source: SourceKind
  ratingHint: string
}

type DayPlan = {
  day: number
  restaurants: Restaurant[]
}

const itinerary: DayPlan[] = [
  {
    day: 1,
    restaurants: [
      {
        id: 'jiro-mita',
        name: 'Ramen Jiro Mita Honten',
        area: 'Mita / Tamachi',
        lat: 35.6478,
        lng: 139.7471,
        source: 'Tabelog',
        ratingHint: 'Featured on Tabelog Ramens TOKYO 100',
      },
      {
        id: 'ichiran-nishi-shinjuku',
        name: 'Ichiran Nishi-Shinjuku',
        area: 'Nishi-Shinjuku',
        lat: 35.6945,
        lng: 139.6973,
        source: 'Google Maps',
        ratingHint: 'Solo-booth tonkotsu specialist',
      },
      {
        id: 'tokyo-eki-ikaruga',
        name: 'Tokyo Eki Ikaruga',
        area: 'Tokyo Station',
        lat: 35.6813,
        lng: 139.7669,
        source: 'Tabelog',
        ratingHint: 'Popular stop in Tokyo Ramen Street',
      },
    ],
  },
  {
    day: 2,
    restaurants: [
      {
        id: 'itoi-ramen-yokocho',
        name: 'Itoi Tokyo Ramen Yokocho',
        area: 'Tokyo Station',
        lat: 35.6816,
        lng: 139.7672,
        source: 'Tabelog',
        ratingHint: 'Shoyu ramen and tsukemen near Tokyo Station',
      },
      {
        id: 'tsugaru-niboshi',
        name: 'Tsugaru Niboshi Hirako-ya',
        area: 'Tokyo Station',
        lat: 35.6817,
        lng: 139.7674,
        source: 'Tabelog',
        ratingHint: 'Niboshi (dried-fish) broth specialist',
      },
      {
        id: 'ichiran-ueno',
        name: 'Ichiran Atre Ueno',
        area: 'Ueno',
        lat: 35.7111,
        lng: 139.7773,
        source: 'Google Maps',
        ratingHint: 'Atre Ueno branch of Ichiran',
      },
    ],
  },
  {
    day: 3,
    restaurants: [
      {
        id: 'genraku-ginza',
        name: 'Ramen Genraku Ginza',
        area: 'Ginza',
        lat: 35.6695,
        lng: 139.7671,
        source: 'OpenStreetMap',
        ratingHint: 'Classic Tokyo-style shoyu ramen',
      },
      {
        id: 'genraku-kuramae',
        name: 'Ramen Genraku Kuramae',
        area: 'Kuramae',
        lat: 35.704,
        lng: 139.7923,
        source: 'OpenStreetMap',
        ratingHint: 'Neighborhood favorite near Kuramae',
      },
      {
        id: 'ebimaru',
        name: 'Ebimaru Ramen',
        area: 'Jimbocho / Nishikanda',
        lat: 35.6964,
        lng: 139.7569,
        source: 'Google Maps',
        ratingHint: 'Shrimp-forward ramen in Nishikanda',
      },
    ],
  },
]

type TokyoPoint = {
  id: string
  x: number
  z: number
  lat: number
  lng: number
  source: SourceKind
  day: number
}

function projectToTokyoPlane(lat: number, lng: number): { x: number; z: number } {
  const baseLat = 35.681236
  const baseLng = 139.767125
  const metersPerDegreeLat = 111_320
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos((baseLat * Math.PI) / 180)
  const scale = 1 / 180
  const x = (lng - baseLng) * metersPerDegreeLng * scale
  const z = -((lat - baseLat) * metersPerDegreeLat * scale)
  return { x, z }
}

function App() {
  const [dayIndex, setDayIndex] = useState(0)
  const [visited, setVisited] = useState<Set<string>>(() => new Set())
  const keys = useKeyboard()
  const { onStamp, onDayComplete, onJump, onFootstep, onUi } = useGameAudio()

  const flatPoints = useMemo<TokyoPoint[]>(() => {
    const pts: TokyoPoint[] = []
    for (const day of itinerary) {
      for (const r of day.restaurants) {
        const { x, z } = projectToTokyoPlane(r.lat, r.lng)
        pts.push({ id: r.id, x, z, lat: r.lat, lng: r.lng, source: r.source, day: day.day })
      }
    }
    return pts
  }, [])

  const today = itinerary[dayIndex]
  const daysVisited = dayIndex
  const totalVisited = itinerary
    .slice(0, dayIndex + 1)
    .reduce((acc, d) => acc + d.restaurants.filter((r) => visited.has(r.id)).length, 0)
  const maxDays = itinerary.length

  const todayVisitedCount = today.restaurants.filter((r) => visited.has(r.id)).length
  const todayGoal = today.restaurants.length
  const canAdvance = todayVisitedCount >= todayGoal

  const handleVisit = (id: string) => {
    setVisited((prev) => {
      if (prev.has(id)) return prev
      onStamp()
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const handleNextDay = () => {
    if (!canAdvance) return
    onDayComplete()
    setDayIndex((prev) => (prev + 1 < itinerary.length ? prev + 1 : prev))
  }

  const handleReset = () => {
    onUi()
    setDayIndex(0)
    setVisited(new Set())
  }

  return (
    <div className="app-root">
      <section className="app-canvas">
        <Canvas camera={{ position: [0, 12, 14], fov: 55 }}>
          <color attach="background" args={['#020617']} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[8, 16, 6]} intensity={1.4} />
          <directionalLight position={[-6, 10, -8]} intensity={0.4} />
          <AmmoScene
            points={flatPoints}
            currentDay={today.day}
            visited={visited}
            onVisit={handleVisit}
            keys={keys}
            onJump={onJump}
            onFootstep={onFootstep}
          />
        </Canvas>
      </section>

      <aside className="app-ui">
        <div>
          <div className="day-badge">Day {today.day}</div>
          <h1 className="app-title">Hungry G</h1>
          <p className="app-subtitle">
            A boy wanders through Tokyo, hunting bowls of ramen. Visit 3–5 shops
            per day and track everywhere he&apos;s been.
          </p>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total visited</div>
            <div className="stat-value">{totalVisited}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Days explored</div>
            <div className="stat-value">
              {daysVisited + 1} / {maxDays}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Today</div>
            <div className="stat-value">
              {todayVisitedCount} / {todayGoal}
            </div>
          </div>
        </div>

        <div>
          <h2 style={{ margin: '8px 0 4px' }}>Today&apos;s route</h2>
          <ul className="restaurant-list">
            {today.restaurants.map((r) => (
              <li key={r.id} className="restaurant-item">
                <div className="restaurant-header">
                  <span className="restaurant-name">{r.name}</span>
                  <span className="restaurant-source">{r.source}</span>
                </div>
                <div className="restaurant-meta">
                  <span className="restaurant-area">{r.area}</span>
                  <span>{r.ratingHint}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="timeline">
          {itinerary.map((d, idx) => {
            const isVisited = idx < dayIndex
            const isToday = idx === dayIndex
            const className = `timeline-dot${
              isToday ? ' timeline-dot--today' : isVisited ? ' timeline-dot--visited' : ''
            }`
            return <div key={d.day} className={className} />
          })}
        </div>

        <div className="controls-row">
          <button
            className="btn-primary"
            type="button"
            onClick={handleNextDay}
            disabled={dayIndex === itinerary.length - 1 || !canAdvance}
          >
            {dayIndex === itinerary.length - 1
              ? 'Trip complete'
              : canAdvance
                ? 'Next day in Tokyo'
                : 'Visit all today’s shops'}
          </button>
          <button className="btn-secondary" type="button" onClick={handleReset}>
            Start over
          </button>
        </div>

        <div className="legend">
          <span className="legend-item">
            <span className="legend-color legend-color--today" />
            Today&apos;s ramen
          </span>
          <span className="legend-item">
            <span className="legend-color legend-color--visited" />
            Visited days
          </span>
          <span className="legend-item">
            <span className="legend-color legend-color--locked" />
            Upcoming days
          </span>
        </div>

        <p className="footer-note">
          Controls: WASD / Arrow keys to move, Space to jump. Collide with today’s orange pins to
          “visit” them.
        </p>
      </aside>
    </div>
  )
}

export default App
