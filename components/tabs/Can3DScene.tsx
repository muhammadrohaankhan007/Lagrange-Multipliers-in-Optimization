"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Grid,
  Html,
  Lightformer,
  OrbitControls,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { heightOnConstraint } from "@/lib/gradients";

export interface ScaledRealCan3D {
  name: string;
  r: number;
  h: number;
  hOverD: number;
}

export interface Can3DSceneProps {
  targetR: number;
  minR: number;
  maxR: number;
  optR: number;
  optH: number;
  realCan: ScaledRealCan3D | null;
  autoRotate: boolean;
  resetCounter: number;
  v0: number;
}

const RADIAL_SEGMENTS = 48;
const GUIDE_LINE_COUNT = 8;

function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

interface SharedUnitGeometries {
  sideWall: THREE.CylinderGeometry;
  capDisc: THREE.CircleGeometry;
  solidCylinder: THREE.CylinderGeometry;
  rimCircle: THREE.BufferGeometry;
  verticalGuides: THREE.BufferGeometry;
  unitSegment: THREE.BufferGeometry;
}

function createSharedUnitGeometries(): SharedUnitGeometries {
  const sideWall = new THREE.CylinderGeometry(1, 1, 1, RADIAL_SEGMENTS, 1, true);
  const capDisc = new THREE.CircleGeometry(1, RADIAL_SEGMENTS);
  const solidCylinder = new THREE.CylinderGeometry(1, 1, 1, RADIAL_SEGMENTS, 1, false);

  const rimPts: THREE.Vector3[] = [];
  for (let i = 0; i <= RADIAL_SEGMENTS; i++) {
    const theta = (i / RADIAL_SEGMENTS) * Math.PI * 2;
    rimPts.push(new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)));
  }
  const rimCircle = new THREE.BufferGeometry().setFromPoints(rimPts);

  const guidePts: THREE.Vector3[] = [];
  for (let i = 0; i < GUIDE_LINE_COUNT; i++) {
    const theta = (i / GUIDE_LINE_COUNT) * Math.PI * 2;
    const x = Math.cos(theta);
    const z = Math.sin(theta);
    guidePts.push(new THREE.Vector3(x, 0, z));
    guidePts.push(new THREE.Vector3(x, 1, z));
  }
  const verticalGuides = new THREE.BufferGeometry().setFromPoints(guidePts);

  const unitSegment = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0),
  ]);

  return { sideWall, capDisc, solidCylinder, rimCircle, verticalGuides, unitSegment };
}

function disposeSharedUnitGeometries(g: SharedUnitGeometries) {
  g.sideWall.dispose();
  g.capDisc.dispose();
  g.solidCylinder.dispose();
  g.rimCircle.dispose();
  g.verticalGuides.dispose();
  g.unitSegment.dispose();
}

function GhostCan({
  geos,
  radius,
  height,
  xPos,
  fillColor,
  lineColor,
  opacity,
}: {
  geos: SharedUnitGeometries;
  radius: number;
  height: number;
  xPos: number;
  fillColor: string;
  lineColor: string;
  opacity: number;
}) {
  const fillMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: fillColor,
        transparent: true,
        opacity,
        depthWrite: false,
        roughness: 0.6,
        metalness: 0.1,
      }),
    [fillColor, opacity]
  );

  const lineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: 0.85,
      }),
    [lineColor]
  );

  const topRimObj = useMemo(() => new THREE.Line(geos.rimCircle, lineMat), [geos.rimCircle, lineMat]);
  const botRimObj = useMemo(() => new THREE.Line(geos.rimCircle, lineMat), [geos.rimCircle, lineMat]);
  const guidesObj = useMemo(
    () => new THREE.LineSegments(geos.verticalGuides, lineMat),
    [geos.verticalGuides, lineMat]
  );

  useEffect(() => {
    return () => {
      fillMat.dispose();
      lineMat.dispose();
    };
  }, [fillMat, lineMat]);

  return (
    <group position={[xPos, 0, 0]}>
      <mesh
        geometry={geos.solidCylinder}
        material={fillMat}
        position={[0, height / 2, 0]}
        scale={[radius, height, radius]}
      />
      <primitive object={topRimObj} position={[0, height, 0]} scale={[radius, 1, radius]} />
      <primitive object={botRimObj} position={[0, 0.002, 0]} scale={[radius, 1, radius]} />
      <primitive object={guidesObj} position={[0, 0, 0]} scale={[radius, height, radius]} />
    </group>
  );
}

function SceneContents({
  targetR,
  minR,
  maxR,
  optR,
  optH,
  realCan,
  autoRotate,
  resetCounter,
  v0,
  reducedMotion,
  pageVisible,
}: {
  targetR: number;
  minR: number;
  maxR: number;
  optR: number;
  optH: number;
  realCan: ScaledRealCan3D | null;
  autoRotate: boolean;
  resetCounter: number;
  v0: number;
  reducedMotion: boolean;
  pageVisible: boolean;
}) {
  const { invalidate, camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  // Create unit geometries ONCE on mount (zero recreation on slider updates)
  const geos = useMemo(() => createSharedUnitGeometries(), []);
  useEffect(() => {
    return () => disposeSharedUnitGeometries(geos);
  }, [geos]);

  // Light-theme brushed-aluminum silver-teal materials
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#5b9a95",
        metalness: 0.72,
        roughness: 0.34,
        flatShading: false,
      }),
    []
  );

  const capMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#dce7e6",
        metalness: 0.65,
        roughness: 0.3,
        flatShading: false,
      }),
    []
  );

  const rimMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#f1f5f9",
        transparent: true,
        opacity: 0.92,
      }),
    []
  );

  const dimLineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#334155",
      }),
    []
  );

  const topRim = useMemo(() => new THREE.Line(geos.rimCircle, rimMat), [geos.rimCircle, rimMat]);
  const botRim = useMemo(() => new THREE.Line(geos.rimCircle, rimMat), [geos.rimCircle, rimMat]);
  const hDimLine = useMemo(
    () => new THREE.Line(geos.unitSegment, dimLineMat),
    [geos.unitSegment, dimLineMat]
  );
  const rDimLine = useMemo(
    () => new THREE.Line(geos.unitSegment, dimLineMat),
    [geos.unitSegment, dimLineMat]
  );

  useEffect(() => {
    return () => {
      bodyMat.dispose();
      capMat.dispose();
      rimMat.dispose();
      dimLineMat.dispose();
    };
  }, [bodyMat, capMat, rimMat, dimLineMat]);

  const { sceneScale, defaultCamPos, targetY } = useMemo(() => {
    const tallestH = Math.max(heightOnConstraint(minR, v0), optH, realCan?.h ?? 0);
    const widestD = Math.max(2 * maxR, 2 * optR, realCan ? 2 * realCan.r : 0);
    const maxExtent = Math.max(tallestH, widestD * 1.15, 1);
    const s = 4.6 / maxExtent;
    const fittedTallest = tallestH * s;
    const midY = fittedTallest * 0.42;
    return {
      sceneScale: s,
      defaultCamPos: [0, midY + 1.8, 9.6] as [number, number, number],
      targetY: midY,
    };
  }, [minR, maxR, optR, optH, realCan, v0]);

  const displayedRRef = useRef<number>(targetR);
  const bodyMeshRef = useRef<THREE.Mesh | null>(null);
  const topCapRef = useRef<THREE.Mesh | null>(null);
  const botCapRef = useRef<THREE.Mesh | null>(null);
  const topRimRef = useRef<THREE.Object3D | null>(null);
  const botRimRef = useRef<THREE.Object3D | null>(null);
  const hLineRef = useRef<THREE.Object3D | null>(null);
  const rLineRef = useRef<THREE.Object3D | null>(null);

  const [labelDims, setLabelDims] = useState<{ r: number; h: number }>({
    r: targetR,
    h: heightOnConstraint(targetR, v0),
  });

  const oR = optR * sceneScale;
  const oH = optH * sceneScale;
  const realR = realCan ? realCan.r * sceneScale : 0;
  const realH = realCan ? realCan.h * sceneScale : 0;
  const mainX = realCan ? -(Math.max(maxR * sceneScale, oR) + 0.55) : 0;
  const realX = realCan ? realR + 0.55 : 0;

  const applyCanTransforms = (rCm: number) => {
    const hCm = heightOnConstraint(rCm, v0);
    const rScene = rCm * sceneScale;
    const hScene = hCm * sceneScale;

    if (bodyMeshRef.current) {
      bodyMeshRef.current.scale.set(rScene, hScene, rScene);
      bodyMeshRef.current.position.set(mainX, hScene / 2, 0);
    }
    if (topCapRef.current) {
      topCapRef.current.scale.set(rScene, rScene, 1);
      topCapRef.current.position.set(mainX, hScene, 0);
    }
    if (botCapRef.current) {
      botCapRef.current.scale.set(rScene, rScene, 1);
      botCapRef.current.position.set(mainX, 0.001, 0);
    }
    if (topRimRef.current) {
      topRimRef.current.scale.set(rScene, 1, rScene);
      topRimRef.current.position.set(mainX, hScene + 0.002, 0);
    }
    if (botRimRef.current) {
      botRimRef.current.scale.set(rScene, 1, rScene);
      botRimRef.current.position.set(mainX, 0.003, 0);
    }
    if (hLineRef.current) {
      hLineRef.current.position.set(mainX - rScene - 0.35, 0, 0);
      hLineRef.current.rotation.set(0, 0, Math.PI / 2);
      hLineRef.current.scale.set(hScene, 1, 1);
    }
    if (rLineRef.current) {
      rLineRef.current.position.set(mainX, hScene + 0.08, 0);
      rLineRef.current.rotation.set(0, 0, 0);
      rLineRef.current.scale.set(rScene, 1, 1);
    }
  };

  useEffect(() => {
    if (reducedMotion) {
      displayedRRef.current = targetR;
      applyCanTransforms(targetR);
      setLabelDims({ r: targetR, h: heightOnConstraint(targetR, v0) });
    }
    invalidate();
  });

  useEffect(() => {
    camera.position.set(...defaultCamPos);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, targetY, 0);
      controlsRef.current.update();
    }
    invalidate();
  }, [resetCounter, camera, defaultCamPos, targetY, invalidate]);

  useFrame((_, delta) => {
    if (!pageVisible) return;

    const current = displayedRRef.current;
    const diff = targetR - current;
    const animatingSlider = !reducedMotion && Math.abs(diff) > 1e-4;

    if (animatingSlider) {
      const alpha = 1 - Math.exp(-Math.min(delta, 0.05) / 0.12);
      const next = current + diff * alpha;
      displayedRRef.current = Math.abs(targetR - next) < 1e-4 ? targetR : next;
      applyCanTransforms(displayedRRef.current);
      if (Math.abs(displayedRRef.current - labelDims.r) > 0.01 || displayedRRef.current === targetR) {
        setLabelDims({
          r: displayedRRef.current,
          h: heightOnConstraint(displayedRRef.current, v0),
        });
      }
      invalidate();
    } else if (displayedRRef.current !== targetR) {
      displayedRRef.current = targetR;
      applyCanTransforms(targetR);
      setLabelDims({ r: targetR, h: heightOnConstraint(targetR, v0) });
    } else {
      applyCanTransforms(targetR);
    }

    if (autoRotate && controlsRef.current) {
      controlsRef.current.update();
      invalidate();
    }
  });

  const labelRScene = labelDims.r * sceneScale;
  const labelHScene = labelDims.h * sceneScale;
  const showHLabel = labelHScene > 0.45;
  const showRLabel = labelRScene > 0.32;

  return (
    <>
      <hemisphereLight args={["#f8fafc", "#94a3b8", 0.9]} />
      <directionalLight position={[7, 11, 8]} intensity={1.05} />
      <directionalLight position={[-6, 5, -5]} intensity={0.35} />

      <Environment resolution={128} frames={1}>
        <Lightformer
          form="rect"
          intensity={1.5}
          color="#ffffff"
          scale={[10, 6, 1]}
          position={[0, 8, 6]}
          rotation={[-Math.PI / 4, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.9}
          color="#e2e8f0"
          scale={[8, 4, 1]}
          position={[-8, 4, 2]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.75}
          color="#f8fafc"
          scale={[8, 4, 1]}
          position={[8, 3, -3]}
          rotation={[0, -Math.PI / 2, 0]}
        />
      </Environment>

      <mesh
        ref={bodyMeshRef}
        geometry={geos.sideWall}
        material={bodyMat}
        position={[mainX, (heightOnConstraint(targetR, v0) * sceneScale) / 2, 0]}
        scale={[
          targetR * sceneScale,
          heightOnConstraint(targetR, v0) * sceneScale,
          targetR * sceneScale,
        ]}
      />
      <mesh
        ref={topCapRef}
        geometry={geos.capDisc}
        material={capMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[mainX, heightOnConstraint(targetR, v0) * sceneScale, 0]}
        scale={[targetR * sceneScale, targetR * sceneScale, 1]}
      />
      <mesh
        ref={botCapRef}
        geometry={geos.capDisc}
        material={capMat}
        rotation={[Math.PI / 2, 0, 0]}
        position={[mainX, 0.001, 0]}
        scale={[targetR * sceneScale, targetR * sceneScale, 1]}
      />
      <primitive ref={topRimRef} object={topRim} />
      <primitive ref={botRimRef} object={botRim} />

      <primitive ref={hLineRef} object={hDimLine} />
      <primitive ref={rLineRef} object={rDimLine} />

      {showHLabel && (
        <Html
          position={[mainX - labelRScene - 0.52, labelHScene / 2, 0]}
          center
          style={{ pointerEvents: "none" }}
        >
          <div className="whitespace-nowrap rounded bg-white/95 border border-[#cbd5e1] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#0f172a] shadow-sm">
            h = {labelDims.h.toFixed(2)} cm
          </div>
        </Html>
      )}

      {showRLabel && (
        <Html
          position={[mainX + labelRScene / 2, labelHScene + 0.28, 0]}
          center
          style={{ pointerEvents: "none" }}
        >
          <div className="whitespace-nowrap rounded bg-white/95 border border-[#cbd5e1] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#0f172a] shadow-sm">
            r = {labelDims.r.toFixed(2)} cm
          </div>
        </Html>
      )}

      <GhostCan
        geos={geos}
        radius={oR}
        height={oH}
        xPos={mainX}
        fillColor="#d97706"
        lineColor="#b45309"
        opacity={0.15}
      />

      {realCan && (
        <GhostCan
          geos={geos}
          radius={realR}
          height={realH}
          xPos={realX}
          fillColor="#64748b"
          lineColor="#475569"
          opacity={0.2}
        />
      )}

      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.28}
        scale={16}
        blur={2.2}
        far={6}
        resolution={256}
        frames={1}
      />

      <Grid
        position={[0, 0, 0]}
        args={[22, 22]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#cbd5e1"
        sectionSize={4}
        sectionThickness={0.8}
        sectionColor="#94a3b8"
        fadeDistance={18}
        fadeStrength={1.5}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate && pageVisible}
        autoRotateSpeed={1.1}
        minDistance={4}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2 - 0.04}
        target={[0, targetY, 0]}
        onChange={() => invalidate()}
      />
    </>
  );
}

export default function Can3DScene(props: Can3DSceneProps) {
  const [webglOk, setWebglOk] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [pageVisible, setPageVisible] = useState<boolean>(true);

  useEffect(() => {
    setWebglOk(isWebGLAvailable());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const currentH = heightOnConstraint(props.targetR, props.v0);

  const srDescription = useMemo(() => {
    const parts = [
      `3D comparison at fixed volume ${props.v0} cubic centimeters.`,
      `Solid brushed silver-teal cylinder: current can with exact radius ${props.targetR.toFixed(
        2
      )} cm and height ${currentH.toFixed(2)} cm.`,
      `Translucent amber outline cylinder: SymPy optimal can with radius ${props.optR.toFixed(
        2
      )} cm and height ${props.optH.toFixed(2)} cm.`,
    ];
    if (props.realCan) {
      parts.push(
        `Translucent slate outline cylinder: ${props.realCan.name} scaled to ${
          props.v0
        } cm³ preserving its h/d ratio of ${props.realCan.hOverD.toFixed(
          2
        )} (radius ${props.realCan.r.toFixed(2)} cm, height ${props.realCan.h.toFixed(2)} cm).`
      );
    }
    return parts.join(" ");
  }, [props.v0, props.targetR, currentH, props.optR, props.optH, props.realCan]);

  if (!webglOk) {
    return (
      <div
        role="region"
        aria-label="3D Can Viewer Fallback"
        className="rounded-xl border border-amber-200 bg-[#fffbeb] p-6 text-sm text-[#b45309] space-y-2"
      >
        <div className="font-semibold">WebGL is not available in this browser or device.</div>
        <p className="text-xs leading-relaxed text-[#334155]">{srDescription}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[440px] rounded-xl border border-[#e2e8f0] overflow-hidden bg-gradient-to-b from-[#f8fafc] to-[#eef2f6]">
      <p className="sr-only">{srDescription}</p>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 3.8, 9.6], fov: 40 }}
      >
        <SceneContents
          {...props}
          reducedMotion={reducedMotion}
          pageVisible={pageVisible}
        />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 text-[11px] font-medium">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 border border-[#cbd5e1] px-2.5 py-0.5 text-[#0f172a]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5b9a95]" />
          Solid = Current can
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 border border-[#cbd5e1] px-2.5 py-0.5 text-[#0f172a]">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-[#b45309]" />
          Amber outline = Optimal can
        </span>
        {props.realCan && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 border border-[#cbd5e1] px-2.5 py-0.5 text-[#0f172a]">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#475569]" />
            Slate outline = {props.realCan.name}
          </span>
        )}
      </div>
    </div>
  );
}
