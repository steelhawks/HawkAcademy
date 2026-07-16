import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF, Bounds, useBounds } from '@react-three/drei';

interface ModelProps {
  url: string;
  wireframe: boolean;
  onLoaded?: (info: { triangles: number; size: THREE.Vector3 }) => void;
}

/**
 * Loads a .glb/.gltf file and renders it. Wrapped by <Bounds> in the parent
 * so the camera automatically frames the model on load / reset.
 */
function GltfModel({ url, wireframe, onLoaded }: ModelProps) {
  const { scene } = useGLTF(url) as unknown as { scene: THREE.Group };
  const groupRef = useRef<THREE.Group>(null);

  // Clone so repeated mounts of the same URL (e.g. HMR) don't mutate the cache.
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    let triangles = 0;
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
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
  }, [cloned, wireframe, onLoaded]);

  return <primitive ref={groupRef} object={cloned} />;
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
  onLoaded?: (info: { triangles: number; size: THREE.Vector3 }) => void;
}

export default function CadModel({ url, wireframe, fitSignal, onLoaded }: CadModelProps) {
  return (
    <Bounds fit clip observe margin={1.2}>
      <AutoFit fitSignal={fitSignal} />
      <GltfModel url={url} wireframe={wireframe} onLoaded={onLoaded} />
    </Bounds>
  );
}
