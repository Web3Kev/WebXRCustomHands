
import { useFrame, useLoader } from "@react-three/fiber"
import { useXRInputSourceStateContext, useXRSpace  } from "@react-three/xr"
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react"
import { Mesh, Object3D, ShaderMaterial, Color, FrontSide, BackSide } from "three"
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Handedness } from './enum';

const joints: Array<XRHandJoint> = [
  'wrist',
  'thumb-metacarpal',
  'thumb-phalanx-proximal',
  'thumb-phalanx-distal',
  'thumb-tip',
  'index-finger-metacarpal',
  'index-finger-phalanx-proximal',
  'index-finger-phalanx-intermediate',
  'index-finger-phalanx-distal',
  'index-finger-tip',
  'middle-finger-metacarpal',
  'middle-finger-phalanx-proximal',
  'middle-finger-phalanx-intermediate',
  'middle-finger-phalanx-distal',
  'middle-finger-tip',
  'ring-finger-metacarpal',
  'ring-finger-phalanx-proximal',
  'ring-finger-phalanx-intermediate',
  'ring-finger-phalanx-distal',
  'ring-finger-tip',
  'pinky-finger-metacarpal',
  'pinky-finger-phalanx-proximal',
  'pinky-finger-phalanx-intermediate',
  'pinky-finger-phalanx-distal',
  'pinky-finger-tip',
]

function createUpdateXRHandVisuals(
  hand: XRHand,
  handModel: Object3D,
  referenceSpace: XRSpace | (() => XRSpace | undefined),
): (frame: XRFrame | undefined) => void {
  const buffer = new Float32Array(hand.size * 16)
  const jointObjects = joints.map((joint) => {
    const jointObject = handModel.getObjectByName(joint)
    if (jointObject == null) {
      throw new Error(`missing joint "${joint}" in hand model`)
    }
    jointObject.matrixAutoUpdate = false
    return jointObject
  })
  return (frame) => {
    const resolvedReferenceSpace = typeof referenceSpace === 'function' ? referenceSpace() : referenceSpace
    if (frame == null || resolvedReferenceSpace == null) {
      return
    }
    frame.fillPoses(hand.values(), resolvedReferenceSpace, buffer)
    const length = jointObjects.length
    for (let i = 0; i < length; i++) {
      jointObjects[i].matrix.fromArray(buffer, i * 16)
    }
  }
}

function cloneXRHandGltf({ scene }: GLTF) {
    const result = cloneSkeleton(scene)
    const mesh = result.getObjectByProperty('type', 'SkinnedMesh')
    if (mesh == null) {
      throw new Error(`missing SkinnedMesh in loaded XRHand model`)
    }
    mesh.frustumCulled = false
    return result
  }

function rgbToThreeColor(rgbString: string): Color {
  const match = rgbString.match(/\d+/g);
  if (!match || match.length < 3) {
    console.warn('Invalid RGB format. Expected "rgb(r, g, b)"');
    return new Color(0, 0, 0);
  }
  const [r, g, b] = match.map(Number).map(v => v / 255);
  return new Color(r, g, b);
}

export type XRHandOptions = {
    handedness: Handedness.Right | Handedness.Left
}
  
export const ShadedHand = forwardRef<Object3D, XRHandOptions>(({handedness}, ref) => {
    const state = useXRInputSourceStateContext('hand')
    const gltf = useLoader(GLTFLoader, handedness === Handedness.Right ? '/rightgradient.glb' :'/leftgradient.glb')//'/leftgradient.glb')
    const model = useMemo(() => cloneXRHandGltf(gltf), [gltf])

    const customShaderMaterialRef = useRef<ShaderMaterial>(new ShaderMaterial({
      uniforms: {
        baseColor: { value: rgbToThreeColor("rgb(30, 29, 31)") }, //rgbToThreeColor("rgb(209, 202, 245)") 
        fingerColor: { value: rgbToThreeColor("rgb(49, 50, 55)") }, //rgbToThreeColor("rgb(24, 45, 184)") 
        globalOpacity: { value: 1 },
        colorGradientStart: { value: 0.85 },
        colorGradientEnd: { value: 0.45 },
        opacityGradientStart: { value: 0.5 },
        opacityGradientEnd: { value: 0.25 },
        opacityStart: { value: 1 },
        opacityEnd: { value: 0.0 }
      },
      vertexShader: /* glsl */`
        #include <common>
        #include <skinning_pars_vertex>
        varying vec2 vUv;
        void main() {
          #include <skinbase_vertex>
          #include <beginnormal_vertex>
          #include <skinnormal_vertex>
          #include <defaultnormal_vertex>
          vec3 transformed = vec3(position);
          #include <skinning_vertex>
          vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vUv = uv;
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 baseColor;
        uniform vec3 fingerColor;
        uniform float globalOpacity;
        uniform float colorGradientStart;
        uniform float colorGradientEnd;
        uniform float opacityGradientStart;
        uniform float opacityGradientEnd;
        uniform float opacityStart;
        uniform float opacityEnd;
        varying vec2 vUv;
    
        float remap(float value, float oldMin, float oldMax, float newMin, float newMax) {
          return newMin + (value - oldMin) * (newMax - newMin) / (oldMax - oldMin);
        }
    
        void main() {
          float colorProgress = remap(1.0 - vUv.y, colorGradientStart, colorGradientEnd, 0.0, 1.0);
          colorProgress = clamp(colorProgress, 0.0, 1.0);
    
          float opacityProgress = remap(1.0 - vUv.y, opacityGradientStart, opacityGradientEnd, 0.0, 1.0);
          opacityProgress = clamp(opacityProgress, 0.0, 1.0);
    
          vec3 finalColor = mix(baseColor, fingerColor, colorProgress);
          float alpha = mix(opacityStart, opacityEnd, opacityProgress);
          alpha = clamp(alpha, 0.0, 1.0) * globalOpacity;
    
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,

      transparent: true,
      depthWrite: true, 
      depthTest: true,
      alphaTest: 0.05,   
      side: FrontSide, 
    }));
    
    const outlineMaterialRef = useRef<ShaderMaterial>(new ShaderMaterial({
      uniforms: {
        outlineColor: { value: rgbToThreeColor("rgb(159, 141, 248)") }, // Solid black outline
        globalOpacity: { value: .8 },
        opacityGradientStart: { value: 0.5 },
        opacityGradientEnd: { value: 0.25 },
        opacityStart: { value: 1 },
        opacityEnd: { value: 0.0 },
        outlineThickness: { value: 0.002 }, // Adjust outline size
      },
      vertexShader: /* glsl */`
        #include <common>
        #include <skinning_pars_vertex>

        uniform float outlineThickness;
        varying vec2 vUv;

        void main() {
        #include <skinbase_vertex>
        #include <beginnormal_vertex>
        #include <skinnormal_vertex>
        #include <defaultnormal_vertex>

        vec3 transformed = position + normal * outlineThickness; // Expand along normals
        #include <skinning_vertex>

        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        vUv = uv;
        }
      `,
      fragmentShader: /* glsl */`
       uniform vec3 outlineColor; // Solid outline color
        uniform float globalOpacity;
        uniform float opacityGradientStart;
        uniform float opacityGradientEnd;
        uniform float opacityStart;
        uniform float opacityEnd;
        varying vec2 vUv;

        float remap(float value, float oldMin, float oldMax, float newMin, float newMax) {
        return newMin + (value - oldMin) * (newMax - newMin) / (oldMax - oldMin);
        }

        void main() {
        // Apply same opacity gradient as main shader
        float opacityProgress = remap(1.0 - vUv.y, opacityGradientStart, opacityGradientEnd, 0.0, 1.0);
        opacityProgress = clamp(opacityProgress, 0.0, 1.0);

        float alpha = mix(opacityStart, opacityEnd, opacityProgress);
        alpha = clamp(alpha, 0.0, 1.0) * globalOpacity;

        gl_FragColor = vec4(outlineColor, alpha);
        }
      `,
      
      side: BackSide,
      transparent: true, 
      depthWrite: false, 
      depthTest: true,
    }));

    useMemo(() => {
      model.traverse((child) => {
        if ((child as Mesh).isMesh) {
          const mesh = child as Mesh;
    
          const outlineMesh = mesh.clone();
          outlineMesh.material = outlineMaterialRef.current;
          mesh.parent?.add(outlineMesh);
          
          const mainMaterial = customShaderMaterialRef.current;
          mainMaterial.transparent = true;
          mesh.material = mainMaterial;
        }
      });
    }, [model, customShaderMaterialRef, outlineMaterialRef]);

    // customShaderMaterialRef.current.uniforms.globalOpacity.value = 0;
    // outlineMaterialRef.current.uniforms.globalOpacity.value = UIshown? 1 : 0;

    state.object = model;

    useImperativeHandle(ref, () => model, [model])
    
    const referenceSpace = useXRSpace()
    
    const update = useMemo(
      () => createUpdateXRHandVisuals(state.inputSource.hand, model, referenceSpace),
      [state.inputSource, model, referenceSpace],
    )
    
    useFrame((state, delta, frame) => {
      void state; 
      void delta;
        update(frame);
    })

    return <primitive object={model} />
   
  })