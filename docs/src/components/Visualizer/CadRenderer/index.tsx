import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Center } from '@react-three/drei';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useBaseUrl from '@docusaurus/useBaseUrl';
import CadModel, { UpAxis } from './Model';
import CadErrorBoundary from './ErrorBoundary';
import styles from './styles.module.css';

export interface CadRendererProps {
  /** URL (or imported asset path) of the .glb / .gltf file to display. */
  src: string;
  /** Display name shown in the toolbar. Defaults to the filename from `src`. */
  name?: string;
  /** Height of the viewer, e.g. "480px" or "60vh". Default "480px". */
  height?: string;
  /** Allow the user to drop their own .glb file onto the canvas to preview it. */
  allowUpload?: boolean;
  /** Show the orbit/pan/zoom hint text in the corner. Default true. */
  showHint?: boolean;
  /**
   * Corrects the model's "up" axis before display. Many CAD tools (SolidWorks,
   * Fusion 360, Onshape) export with Z pointing up, while three.js/glTF expects
   * Y-up — set `upAxis="z"` to fix that. Default `"y"` (no correction).
   */
  upAxis?: UpAxis;
  /**
   * Extra fixed rotation in degrees, applied as `[x, y, z]` on top of the
   * `upAxis` correction, for orienting the model to a specific pose (e.g.
   * showing a part face-on). Default `[0, 0, 0]`.
   */
  orientation?: [number, number, number];
  /** Show the up-axis picker control in the toolbar, letting the viewer adjust orientation live. Default false. */
  allowOrientationControl?: boolean;
}

type LoadInfo = { triangles: number; size: THREE.Vector3 };

const UP_AXIS_OPTIONS: { value: UpAxis; label: string }[] = [
  { value: 'y', label: '+Y up (glTF default)' },
  { value: '-y', label: '−Y up' },
  { value: 'z', label: '+Z up (SolidWorks/Fusion/Onshape)' },
  { value: '-z', label: '−Z up' },
  { value: 'x', label: '+X up' },
  { value: '-x', label: '−X up' },
];

function Loading() {
  return (
    <div className={styles.centerMessage}>Loading model…</div>
  );
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className={`${styles.centerMessage} ${styles.errorMessage}`}>
      Failed to load CAD model.
      <br />
      {error.message}
    </div>
  );
}

function Scene({
  url,
  wireframe,
  fitSignal,
  upAxis,
  orientation,
  onLoaded,
}: {
  url: string;
  wireframe: boolean;
  fitSignal: number;
  upAxis: UpAxis;
  orientation: [number, number, number];
  onLoaded: (info: LoadInfo) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
      />
      <directionalLight position={[-5, -3, -5]} intensity={0.3} />
      <Environment preset="city" />

      <Grid
        infiniteGrid
        cellSize={0.5}
        sectionSize={2.5}
        fadeDistance={30}
        fadeStrength={1.5}
        cellColor="#3a3f47"
        sectionColor="#565d68"
        position={[0, -0.001, 0]}
      />

      <Center>
        <CadModel
          url={url}
          wireframe={wireframe}
          fitSignal={fitSignal}
          upAxis={upAxis}
          orientation={orientation}
          onLoaded={onLoaded}
        />
      </Center>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.2}
        maxDistance={200}
      />
    </>
  );
}

function CadRendererInner({
  src,
  name,
  height = '480px',
  allowUpload = true,
  showHint = true,
  upAxis = 'y',
  orientation = [0, 0, 0],
  allowOrientationControl = false,
}: CadRendererProps) {
  const resolvedSrc = useBaseUrl(src);
  const [url, setUrl] = useState(resolvedSrc);
  const [displayName, setDisplayName] = useState(name ?? src.split('/').pop() ?? 'model.glb');
  const [wireframe, setWireframe] = useState(false);
  const [fitSignal, setFitSignal] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [info, setInfo] = useState<LoadInfo | null>(null);
  const [activeUpAxis, setActiveUpAxis] = useState<UpAxis>(upAxis);
  const objectUrlRef = useRef<string | null>(null);

  const handleLoaded = useCallback((loaded: LoadInfo) => setInfo(loaded), []);

  // Keep the picker in sync if the caller changes the `upAxis` prop, and re-fit
  // the camera whenever the effective up axis changes (the model's bounds rotate).
  useEffect(() => {
    setActiveUpAxis(upAxis);
    setFitSignal((n) => n + 1);
  }, [upAxis]);

  const handleUpAxisChange = (next: UpAxis) => {
    setActiveUpAxis(next);
    setFitSignal((n) => n + 1);
  };

  const revokePrevious = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const loadFile = (file: File) => {
    if (!/\.(glb|gltf)$/i.test(file.name)) return;
    revokePrevious();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setUrl(objectUrl);
    setDisplayName(file.name);
    setInfo(null);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = '';
  };

  const resetToOriginal = () => {
    revokePrevious();
    setUrl(resolvedSrc);
    setDisplayName(name ?? src.split('/').pop() ?? 'model.glb');
    setInfo(null);
    setFitSignal((n) => n + 1);
  };

  const canvasStyle = useMemo(() => ({ '--cad-height': height } as React.CSSProperties), [height]);

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.filename} title={displayName}>{displayName}</span>
        <div className={styles.buttons}>
          <button className={wireframe ? styles.active : ''} onClick={() => setWireframe((w) => !w)}>
            {wireframe ? '◧ Solid' : '◨ Wireframe'}
          </button>
          <button onClick={() => setFitSignal((n) => n + 1)}>⤢ Reset View</button>
          {allowOrientationControl && (
            <select
              className={styles.select}
              value={activeUpAxis}
              onChange={(e) => handleUpAxisChange(e.target.value as UpAxis)}
              title="Correct the model's up axis"
            >
              {UP_AXIS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {allowUpload && (
            <>
              {url !== resolvedSrc && <button onClick={resetToOriginal}>↺ Original</button>}
              <label className={styles.filename} style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  accept=".glb,.gltf"
                  style={{ display: 'none' }}
                  onChange={onFileInput}
                />
                📁 Upload
              </label>
            </>
          )}
        </div>
      </div>

      <div
        className={styles.canvasBox}
        style={canvasStyle}
        onDragOver={(e) => {
          if (!allowUpload) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={allowUpload ? onDrop : undefined}
      >
        <CadErrorBoundary key={url} fallback={(error) => <ErrorFallback error={error} />}>
          <Suspense fallback={<Loading />}>
            <Canvas
              frameloop="demand"
              camera={{ position: [4, 3, 6], fov: 45, near: 0.01, far: 1000 }}
              dpr={[1, 1.5]}
            >
              <Scene
                url={url}
                wireframe={wireframe}
                fitSignal={fitSignal}
                upAxis={activeUpAxis}
                orientation={orientation}
                onLoaded={handleLoaded}
              />
            </Canvas>
          </Suspense>
        </CadErrorBoundary>

        {dragOver && (
          <div className={styles.centerMessage}>Drop .glb / .gltf file to preview…</div>
        )}

        {info && (
          <span className={styles.badge}>{info.triangles.toLocaleString()} tris</span>
        )}

        {showHint && (
          <div className={styles.hint}>
            Left-drag: rotate · Right-drag: pan · Scroll: zoom
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * CadRenderer
 *
 * Renders a .glb/.gltf CAD model inside an interactive 3D viewport.
 * Users can orbit (rotate), pan, and zoom the model like a CAD editor,
 * toggle wireframe mode, reset the camera, and (optionally) drag & drop
 * their own .glb file to preview it in place.
 *
 * Wrapped in BrowserOnly because three.js / WebGL require the DOM and
 * cannot run during Docusaurus's server-side rendering pass.
 */
export default function CadRenderer(props: CadRendererProps) {
  return (
    <BrowserOnly fallback={<div className={styles.centerMessage}>Loading viewer…</div>}>
      {() => <CadRendererInner {...props} />}
    </BrowserOnly>
  );
}
