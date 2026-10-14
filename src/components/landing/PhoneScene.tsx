"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { MutableRefObject, RefObject, useMemo, useRef } from "react";
import * as THREE from "three";
import { SCREEN_H, SCREEN_W } from "./PhoneScreens";

// Pose of the phone, written by the page's GSAP scroll timeline and eased toward here.
// x/y are fractions of the visible half-width/half-height so a pose reads the same at any aspect.
export interface PhonePose {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rz: number;
  s: number;
}

// Offsets layered on the scroll pose by the page's entrance animation
export interface PhoneIntro {
  y: number;
  ry: number;
}

interface SceneProps {
  poseRef: MutableRefObject<PhonePose>;
  introRef: MutableRefObject<PhoneIntro>;
  // A SCREEN_W × SCREEN_H element positioned at the canvas's top-left; projected onto the glass
  screenRef: RefObject<HTMLDivElement | null>;
  reduceMotion: boolean;
}

const BODY_W = 1.5;
const BODY_H = 3.1;
const BODY_D = 0.16;
const SCREEN_WORLD_W = BODY_W - 0.12;
const SCREEN_WORLD_H = (SCREEN_WORLD_W * SCREEN_H) / SCREEN_W;
const SCREEN_Z = BODY_D / 2 + 0.004;

// CSS matrix3d that maps a w×h element (origin top-left) onto four points in pixels,
// ordered top-left, top-right, bottom-right, bottom-left (Heckbert's square-to-quad).
function quadMatrix(w: number, h: number, q: number[][]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, hh = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) < 1e-9) return null;
    g = (dx3 * dy2 - dx2 * dy3) / det;
    hh = (dx1 * dy3 - dx3 * dy1) / det;
  }
  const a = (x1 - x0 + g * x1) / w;
  const b = (x3 - x0 + hh * x3) / h;
  const d = (y1 - y0 + g * y1) / w;
  const e = (y3 - y0 + hh * y3) / h;
  g /= w;
  hh /= h;
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${x0},${y0},0,1)`;
}

const CORNERS = [
  [-SCREEN_WORLD_W / 2, SCREEN_WORLD_H / 2],
  [SCREEN_WORLD_W / 2, SCREEN_WORLD_H / 2],
  [SCREEN_WORLD_W / 2, -SCREEN_WORLD_H / 2],
  [-SCREEN_WORLD_W / 2, -SCREEN_WORLD_H / 2],
];

const FOV = 30;
const CAMERA_Z = 11;

// A thin slab with rounded corners in plan and a small bevel on its faces. drei's RoundedBox
// ties the bevel to the corner radius, which breaks down when the slab is thinner than the radius.
function useSlab(w: number, h: number, d: number, r: number, bevel: number) {
  return useMemo(() => {
    const x = -w / 2 + bevel;
    const y = -h / 2 + bevel;
    const iw = w - bevel * 2;
    const ih = h - bevel * 2;
    const ir = Math.max(0.001, r - bevel);
    const shape = new THREE.Shape();
    shape.moveTo(x + ir, y);
    shape.lineTo(x + iw - ir, y);
    shape.quadraticCurveTo(x + iw, y, x + iw, y + ir);
    shape.lineTo(x + iw, y + ih - ir);
    shape.quadraticCurveTo(x + iw, y + ih, x + iw - ir, y + ih);
    shape.lineTo(x + ir, y + ih);
    shape.quadraticCurveTo(x, y + ih, x, y + ih - ir);
    shape.lineTo(x, y + ir);
    shape.quadraticCurveTo(x, y, x + ir, y);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, d - bevel * 2),
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 6,
      curveSegments: 24,
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, [w, h, d, r, bevel]);
}

function Phone({ poseRef, introRef, screenRef, reduceMotion }: SceneProps) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const { viewport, camera, size } = useThree();
  const corner = useMemo(() => new THREE.Vector3(), []);
  const quad = useRef(CORNERS.map(() => [0, 0]));
  const normal = useMemo(() => new THREE.Vector3(), []);
  const toCamera = useMemo(() => new THREE.Vector3(), []);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const pointer = useRef({ x: 0, y: 0 });
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const body = useSlab(BODY_W, BODY_H, BODY_D, 0.22, 0.035);
  const band = useSlab(BODY_W + 0.02, BODY_H + 0.02, BODY_D * 0.6, 0.23, 0.01);
  const bump = useSlab(0.68, 0.7, 0.06, 0.16, 0.02);

  useFrame((state, delta) => {
    const g = outer.current;
    const r = inner.current;
    if (!g || !r) return;
    const p = poseRef.current;
    const o = introRef.current;
    const vp = viewport.getCurrentViewport(camera, [0, 0, 0]);
    const k = reduceMotion ? 1 : 1 - Math.exp(-delta * 7);
    const t = state.clock.elapsedTime;
    const float = reduceMotion ? 0 : Math.sin(t * 0.9) * 0.04;

    // Fine pointers get a little parallax; touch devices keep still
    if (!reduceMotion && size.width >= 768) {
      pointer.current.x += (state.pointer.x - pointer.current.x) * 0.05;
      pointer.current.y += (state.pointer.y - pointer.current.y) * 0.05;
    }

    g.position.x += ((p.x * vp.width) / 2 - g.position.x) * k;
    g.position.y += (((p.y + o.y) * vp.height) / 2 + float - g.position.y) * k;
    const s = p.s * Math.min(1, vp.height / 5.4);
    g.scale.setScalar(g.scale.x + (s - g.scale.x) * k);
    r.rotation.x += (p.rx - pointer.current.y * 0.08 - r.rotation.x) * k;
    r.rotation.y += (p.ry + o.ry + pointer.current.x * 0.12 - r.rotation.y) * k;
    r.rotation.z += (p.rz - r.rotation.z) * k;

    const el = screenRef.current;
    if (!el) return;

    // The DOM screen sits above the canvas, so fade it out as the phone turns away
    r.updateWorldMatrix(true, false);
    normal.set(0, 0, 1).applyQuaternion(r.getWorldQuaternion(quat));
    r.getWorldPosition(worldPos);
    toCamera.copy(camera.position).sub(worldPos).normalize();
    const opacity = THREE.MathUtils.smoothstep(normal.dot(toCamera), 0.12, 0.32);
    el.style.opacity = String(opacity);
    if (opacity < 0.01) {
      el.style.visibility = "hidden";
      return;
    }
    el.style.visibility = "visible";

    for (let i = 0; i < 4; i++) {
      corner.set(CORNERS[i][0], CORNERS[i][1], SCREEN_Z).applyMatrix4(r.matrixWorld).project(camera);
      quad.current[i][0] = ((corner.x + 1) / 2) * size.width;
      quad.current[i][1] = ((1 - corner.y) / 2) * size.height;
    }
    const m = quadMatrix(SCREEN_W, SCREEN_H, quad.current);
    if (m) el.style.transform = m;
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        {/* Body */}
        <mesh geometry={body}>
          <meshPhysicalMaterial color="#141416" metalness={0.55} roughness={0.32} clearcoat={1} clearcoatRoughness={0.2} />
        </mesh>
        {/* Frame band */}
        <mesh geometry={band}>
          <meshStandardMaterial color="#2a2b2f" metalness={0.9} roughness={0.25} />
        </mesh>
        {/* Side buttons */}
        <mesh position={[BODY_W / 2 + 0.012, 0.55, 0]}>
          <boxGeometry args={[0.03, 0.42, 0.06]} />
          <meshStandardMaterial color="#2a2b2f" metalness={0.9} roughness={0.3} />
        </mesh>
        {[0.85, 0.45].map((y) => (
          <mesh key={y} position={[-BODY_W / 2 - 0.012, y, 0]}>
            <boxGeometry args={[0.03, 0.26, 0.06]} />
            <meshStandardMaterial color="#2a2b2f" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
        {/* Glass behind the DOM screen, visible at grazing angles */}
        <mesh position={[0, 0, BODY_D / 2 + 0.001]}>
          <planeGeometry args={[SCREEN_WORLD_W, SCREEN_WORLD_H]} />
          <meshPhysicalMaterial color="#050506" roughness={0.08} metalness={0.2} clearcoat={1} />
        </mesh>
        {/* Camera bump on the back */}
        <group position={[-0.32, 1.02, -BODY_D / 2 - 0.028]}>
          <mesh geometry={bump}>
            <meshPhysicalMaterial color="#1c1d20" metalness={0.4} roughness={0.25} clearcoat={1} />
          </mesh>
          {[
            [-0.15, 0.15],
            [0.15, 0.15],
            [-0.15, -0.15],
          ].map(([x, y]) => (
            <mesh key={`${x}${y}`} position={[x, y, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.11, 0.12, 0.06, 40]} />
              <meshPhysicalMaterial color="#08080a" metalness={0.6} roughness={0.1} clearcoat={1} />
            </mesh>
          ))}
          <mesh position={[0.15, -0.15, -0.04]}>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial color="#f5f0d8" emissive="#fff6d8" emissiveIntensity={0.2} />
          </mesh>
        </group>
        {/* Back logo plate */}
        <mesh position={[0, -0.2, -BODY_D / 2 - 0.002]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.16, 48]} />
          <meshStandardMaterial color="#3a3b40" metalness={0.95} roughness={0.2} />
        </mesh>

      </group>
      <ContactShadows position={[0, -BODY_H / 2 - 0.45, 0]} opacity={0.32} scale={5} blur={2.6} far={2.5} color="#6b6b75" />
    </group>
  );
}

export default function PhoneScene({ poseRef, introRef, screenRef, reduceMotion }: SceneProps) {
  return (
    <Canvas
      camera={{ fov: FOV, position: [0, 0, CAMERA_Z], near: 0.1, far: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
      frameloop="always"
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[-4, 6, 6]} intensity={1.6} />
      <directionalLight position={[5, -2, 3]} intensity={0.5} color="#dfe6ff" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.4} position={[-3, 3, 4]} scale={[6, 3, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.2} position={[4, -1, 3]} scale={[3, 6, 1]} color="#eef0ff" />
        <Lightformer form="ring" intensity={0.8} position={[0, 0, -6]} scale={4} color="#ffffff" />
      </Environment>
      <Phone poseRef={poseRef} introRef={introRef} screenRef={screenRef} reduceMotion={reduceMotion} />
    </Canvas>
  );
}
