import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF, Bounds, useBounds } from '@react-three/drei';

// Point the GLTF loader at the Draco decoder WASM bundled with three.js via CDN.
// This is required to decompress meshes compressed with gltfpack -cc (Draco).
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

/** Named shortcut for correcting a model's "up" axis before any extra orientation is applied. */
export type UpAxis = 'y' | '-y' | 'z' | '-z' | 'x' | '-x';

/** Euler rotation (degrees, XYZ order) that reorients each up-axis preset onto three.js's Y-up convention. */
const UP_AXIS_ROTATION_DEG: Record<UpAxis, [number, number, number]> = {
  y: [0, 0, 0], // already Y-up (the glTF standard) — no-op
  '-y': [180, 0, 0],
  z: [-90, 0, 0], // most CAD tools (SolidWorks, Fusion 360, Onshape) export Z-up
  '-z': [90, 0, 0],
  x: [0, 0, 90],
  '-x': [0, 0, -90],
};

function degToQuaternion([x, y, z]: [number, number, number]): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(THREE.MathUtils.degToRad(x), THREE.MathUtils.degToRad(y), THREE.MathUtils.degToRad(z))
  );
}

interface ModelProps {
  url: string;
  wireframe: boolean;
  /** Corrects the model's up axis (e.g. 'z' for CAD exports that are Z-up) before `orientation` is applied. Default 'y' (no-op). */
  upAxis?: UpAxis;
  /** Extra Euler rotation in degrees [x, y, z], applied on top of the up-axis correction. Default [0, 0, 0]. */
  orientation?: [number, number, number];
  onLoaded?: (info: { triangles: number; size: THREE.Vector3 }) => void;
}

/**
 * Loads a .glb/.gltf file and renders it. Wrapped by <Bounds> in the parent
 * so the camera automatically frames the model on load / reset.
 *
 * The up-axis correction + extra orientation are applied via a declarative
 * <group quaternion={...}> wrapper (not an imperative ref mutation) so that:
 *  (a) R3F's reconciler sees the transform as a normal prop change and
 *      correctly invalidates/re-renders even with frameloop="demand", and
 *  (b) the parent <Bounds> component measures the *already-rotated* object
 *      when it computes the auto-fit camera framing, instead of possibly
 *      racing an effect that rotates it after the fit already ran.
 */
function GltfModel({ url, wireframe, upAxis = 'y', orientation = [0, 0, 0], onLoaded }: ModelProps) {
  const { scene } = useGLTF(url) as unknown as { scene: THREE.Group };

  // Clone so repeated mounts of the same URL (e.g. HMR) don't mutate the cache.
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // Compose the up-axis correction with the caller's extra orientation via
  // quaternions, recomputed whenever either input changes.
  const [ox, oy, oz] = orientation;
  const quaternion = useMemo(() => {
    const upQuat = degToQuaternion(UP_AXIS_ROTATION_DEG[upAxis]);
    const orientQuat = degToQuaternion([ox, oy, oz]);
    return orientQuat.multiply(upQuat);
  }, [upAxis, ox, oy, oz]);

  useEffect(() => {
    let triangles = 0;
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const mat = m as THREE.MeshStandardMaterial;
          if (mat && 'wireframe' in mat) mat.wireframe = wireframe;
        });
        const geom = mesh.geometry;
        if (geom?.index) triangles += geom.index.count / 3;
        else if (geom?.attributes?.position) triangles += geom.attributes.position.count / 3;
      }
    });

    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    onLoaded?.({ triangles: Math.round(triangles), size });
    // Re-measure whenever the rotation changes too, since onLoaded reports
    // the (rotated) bounding box size.
  }, [cloned, wireframe, quaternion, onLoaded]);

  return (
    <group quaternion={quaternion}>
      <primitive object={cloned} />
    </group>
  );
}

interface AutoFitProps {
  fitSignal: number;
}

/** Triggers Bounds.fit() whenever fitSignal changes (used by "Reset View" button). */
function AutoFit({ fitSignal }: AutoFitProps) {
  const bounds = useBounds();
  const first = useRef(true);

  useEffect(() => {
    // Skip the very first mount fit-race; Bounds already fits once children arrive.
    if (first.current) {
      first.current = false;
      return;
    }
    bounds.refresh().fit();
  }, [fitSignal, bounds]);

  return null;
}

interface CadModelProps {
  url: string;
  wireframe: boolean;
  fitSignal: number;
  upAxis?: UpAxis;
  orientation?: [number, number, number];
  onLoaded?: (info: { triangles: number; size: THREE.Vector3 }) => void;
}

export default function CadModel({ url, wireframe, fitSignal, upAxis, orientation, onLoaded }: CadModelProps) {
  return (
    <Bounds fit clip observe margin={1.2}>
      <AutoFit fitSignal={fitSignal} />
      <GltfModel url={url} wireframe={wireframe} upAxis={upAxis} orientation={orientation} onLoaded={onLoaded} />
    </Bounds>
  );
}
