import { useEffect, useMemo, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import './App.css'
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

type PlayerLocation = { lat: number; lng: number }

const VISIT_RADIUS_METERS = 120
const MOVE_SPEED_METERS_PER_SECOND = 95

const boyIcon = L.divIcon({
  className: 'boy-map-icon',
  html: '<div class="boy-dot">HG</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

function haversineMeters(a: PlayerLocation, b: PlayerLocation) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

function FollowPlayerMap({ player }: { player: PlayerLocation }) {
  const map = useMap()
  useEffect(() => {
    map.panTo([player.lat, player.lng], { animate: true, duration: 0.15 })
  }, [map, player.lat, player.lng])
  return null
}

function App() {
  const [dayIndex, setDayIndex] = useState(0)
  const [visited, setVisited] = useState<Set<string>>(() => new Set())
  const keys = useKeyboard()
  const [player, setPlayer] = useState<PlayerLocation>({
    lat: itinerary[0].restaurants[0].lat,
    lng: itinerary[0].restaurants[0].lng,
  })

  const allRestaurants = useMemo(() => itinerary.flatMap((d) => d.restaurants), [])

  const today = itinerary[dayIndex]
  const daysVisited = dayIndex
  const totalVisited = itinerary
    .slice(0, dayIndex + 1)
    .reduce((acc, d) => acc + d.restaurants.filter((r) => visited.has(r.id)).length, 0)
  const maxDays = itinerary.length

  const todayVisitedCount = today.restaurants.filter((r) => visited.has(r.id)).length
  const todayGoal = today.restaurants.length
  const canAdvance = todayVisitedCount >= todayGoal

  useEffect(() => {
    const id = window.setInterval(() => {
      const x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
      const y = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0)
      if (x === 0 && y === 0) return

      const dt = 0.05
      const meters = MOVE_SPEED_METERS_PER_SECOND * dt
      const len = Math.hypot(x, y) || 1
      const nx = x / len
      const ny = y / len

      setPlayer((prev) => {
        const metersPerDegLat = 111_320
        const metersPerDegLng = metersPerDegLat * Math.cos((prev.lat * Math.PI) / 180)
        const nextLat = prev.lat + (ny * meters) / metersPerDegLat
        const nextLng = prev.lng + (nx * meters) / Math.max(1, metersPerDegLng)
        return { lat: nextLat, lng: nextLng }
      })
    }, 50)
    return () => window.clearInterval(id)
  }, [keys])

  useEffect(() => {
    for (const r of today.restaurants) {
      if (visited.has(r.id)) continue
      const dist = haversineMeters(player, { lat: r.lat, lng: r.lng })
      if (dist <= VISIT_RADIUS_METERS) handleVisit(r.id)
    }
  }, [player, today.restaurants, visited])

  const handleVisit = (id: string) => {
    setVisited((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const handleNextDay = () => {
    if (!canAdvance) return
    setDayIndex((prev) => (prev + 1 < itinerary.length ? prev + 1 : prev))
  }

  const handleReset = () => {
    setDayIndex(0)
    setVisited(new Set())
    setPlayer({
      lat: itinerary[0].restaurants[0].lat,
      lng: itinerary[0].restaurants[0].lng,
    })
  }

  return (
    <div className="app-root">
      <section className="app-canvas">
        <MapContainer center={[player.lat, player.lng]} zoom={13} className="tokyo-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FollowPlayerMap player={player} />

          <Marker position={[player.lat, player.lng]} icon={boyIcon}>
            <Popup>Hungry G (you)</Popup>
          </Marker>

          <Circle
            center={[player.lat, player.lng]}
            radius={VISIT_RADIUS_METERS}
            pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.08 }}
          />

          {allRestaurants.map((r) => {
            const isVisited = visited.has(r.id)
            const isToday = today.restaurants.some((todayR) => todayR.id === r.id)
            const color = isVisited ? '#22c55e' : isToday ? '#f97316' : '#6b7280'

            return (
              <CircleMarker
                key={r.id}
                center={[r.lat, r.lng]}
                radius={8}
                pathOptions={{
                  color,
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.8,
                }}
              >
                <Popup>
                  <strong>{r.name}</strong>
                  <br />
                  {r.area}
                  <br />
                  Source: {r.source}
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
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
          Controls: WASD / Arrow keys move Hungry G on a real OpenStreetMap basemap of Tokyo.
          Enter the blue circle near orange shops to visit them.
        </p>
      </aside>
    </div>
  )
}

export default App
