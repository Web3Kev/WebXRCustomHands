import { Suspense} from 'react';
import { Handedness } from './enum';
import {
  CombinedPointer,
  DefaultXRHandGrabPointer,
  DefaultXRHandTouchPointer,
  DefaultXRInputSourceRayPointer,
  DefaultXRInputSourceTeleportPointer,
} from '@react-three/xr';
import { ShadedHand } from './shadedHands';


interface CustomHandProps {
  handedness?: Handedness; // Optional prop with a default value
  showGrab?:boolean;
  showTouch?:boolean;
  useRay?:boolean;
  useTeleport?:boolean;
}

const CustomHand: React.FC<CustomHandProps> = ({ handedness = Handedness.Right, showGrab=true, showTouch=true, useTeleport=false, useRay=true }) => {


  return (
    <>

      <Suspense fallback={null}>
        <ShadedHand handedness={handedness}/>
      </Suspense>
        <CombinedPointer>
          {useRay && <DefaultXRInputSourceRayPointer makeDefault minDistance={0.2}/>}
          <DefaultXRHandGrabPointer cursorModel={showGrab} radius={0.07}/>
          {useTeleport && <DefaultXRInputSourceTeleportPointer/>}
          <DefaultXRHandTouchPointer cursorModel={showTouch} hoverRadius={0.1} downRadius={0.03}/>
        </CombinedPointer>

    </>
  );
};


export { CustomHand };


