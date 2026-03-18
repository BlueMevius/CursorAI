import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import './App.css'

function App() {
  return (
    <main style={{ width: '100%', height: '100vh', margin: 0 }}>
      <Canvas camera={{ position: [3, 3, 3], fov: 60 }}>
        <color attach="background" args={['#101018']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 8, 4]} intensity={1.2} />

        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ffcc33" />
        </mesh>

        <OrbitControls />
      </Canvas>
    </main>
  )
}

export default App
