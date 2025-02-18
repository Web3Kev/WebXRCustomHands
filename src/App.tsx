import { Canvas } from '@react-three/fiber'
import {createXRStore, TeleportTarget, XR, XROrigin  } from '@react-three/xr'
import { Environment, Loader  } from '@react-three/drei'
import { Suspense, useEffect, useState } from 'react'

import './App.css'
import { Handedness } from './enum'
import { CustomHand } from './customHand'
import { Vector3 } from 'three'

const store = createXRStore({
  foveation: 0,
  hand: {
    left: () => <CustomHand handedness={Handedness.Left} useTeleport/>, 
    right: () => <CustomHand handedness={Handedness.Right}/>,
  },
})

function App() {

  useEffect(() => {
    const appHeight = () => {
      const doc = document.documentElement;
      doc.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    appHeight();
    window.addEventListener('resize', appHeight);
    window.addEventListener('orientationchange', appHeight);
    return () => {
      window.removeEventListener('resize', appHeight);
      window.removeEventListener('orientationchange', appHeight);
    };
  }, []);

  const [red, setRed] = useState(false)
  const [position, setPosition] = useState(new Vector3())

  return (
    <div className="app-container">
    <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '1rem',
          position: 'absolute',
          zIndex: 10000,
          top: '3rem',
          left: '50%',
          transform: 'translate(-50%, 0)',
        }}
        className="VRButtons"
      >
      <button onClick={() => store.enterVR()}>Enter VR</button>
      <button onClick={() => store.enterAR()}>Enter AR</button>
      </div>

      <Loader/>

      <Canvas shadows  camera={{ position: [0, 1.2, 0], rotation:[Math.PI/30,0,0]  }} >
        <Suspense>
        <XR store={store}>

          <Environment preset="warehouse" environmentIntensity={1}/> 
         
          <directionalLight color={"white"} intensity={1} position={[1,10,0]}castShadow/>

          <XROrigin position={position} />

          <mesh scale={0.2} castShadow pointerEventsType={{ deny: 'grab' }} onClick={() => setRed(!red)} position={[0, 1.4, -1]}>
            <boxGeometry />
            <meshStandardMaterial metalness={.3} roughness={0.3} color={red ? 'indianred' : 'royalblue'} />
          </mesh>

          <TeleportTarget onTeleport={setPosition}>
          <mesh  receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0,0,0]}>
              <planeGeometry args={[100, 100]} />
              <shadowMaterial opacity={0.4} color={"black"} />
          </mesh>
          </TeleportTarget>
        </XR>
        </Suspense>
      </Canvas>
    </div>
  )
}



export default App
