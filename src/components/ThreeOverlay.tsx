import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { MarkerPose, CameraIntrinsics } from '../lib/pose';
import type { PartAnchor } from '../types/equipment';

interface ThreeOverlayProps {
  width: number;
  height: number;
  markerPose: MarkerPose | null;
  intrinsics: CameraIntrinsics;
  activePart?: PartAnchor | null;
  markerSizeMeters?: number;
  showDebugAxes?: boolean;
}

export const ThreeOverlay: React.FC<ThreeOverlayProps> = ({
  width,
  height,
  markerPose,
  intrinsics,
  activePart,
  markerSizeMeters = 0.05,
  showDebugAxes = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const markerRootRef = useRef<THREE.Group | null>(null);
  const arrowGroupRef = useRef<THREE.Group | null>(null);
  const ringMeshRef = useRef<THREE.Mesh | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Set camera based on camera intrinsics FOV
    const fov = intrinsics.fovDegrees;
    const aspect = width / (height || 1);
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 100);
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // transparent background
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Ambient and directional lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0x22bb80, 1.2);
    dirLight.position.set(0, 5, 5);
    scene.add(dirLight);

    // Marker Root Group
    const markerRoot = new THREE.Group();
    scene.add(markerRoot);
    markerRootRef.current = markerRoot;

    // Coordinate Axes Helper (for debug)
    const axes = new THREE.AxesHelper(0.04);
    axes.visible = showDebugAxes;
    markerRoot.add(axes);
    axesHelperRef.current = axes;

    // 3D Arrow Group
    const arrowGroup = new THREE.Group();
    // Cone pointing down
    const coneGeo = new THREE.ConeGeometry(0.008, 0.02, 16);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x22bb80,
      emissive: 0x10b981,
      roughness: 0.3,
      metalness: 0.8,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 0.01;
    cone.rotation.x = Math.PI; // point down

    // Cylinder shaft
    const cylGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.025, 16);
    const cylMat = new THREE.MeshStandardMaterial({ color: 0x22bb80 });
    const cyl = new THREE.Mesh(cylGeo, cylMat);
    cyl.position.y = 0.032;

    arrowGroup.add(cone);
    arrowGroup.add(cyl);
    markerRoot.add(arrowGroup);
    arrowGroupRef.current = arrowGroup;

    // Pulsing target ring
    const ringGeo = new THREE.TorusGeometry(0.012, 0.002, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22bb80,
      transparent: true,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    markerRoot.add(ring);
    ringMeshRef.current = ring;

    // Animation Loop
    let animId: number;
    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);

      // Pulse ring scale and arrow bobbing
      const pulse = 1 + Math.sin(time * 0.006) * 0.2;
      if (ringMeshRef.current) {
        ringMeshRef.current.scale.set(pulse, pulse, pulse);
      }
      if (arrowGroupRef.current) {
        arrowGroupRef.current.position.y += Math.sin(time * 0.008) * 0.0003;
      }

      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    const container = mountRef.current;

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update canvas size
  useEffect(() => {
    if (rendererRef.current && cameraRef.current) {
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / (height || 1);
      cameraRef.current.fov = intrinsics.fovDegrees;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [width, height, intrinsics]);

  // Update axes visibility
  useEffect(() => {
    if (axesHelperRef.current) {
      axesHelperRef.current.visible = showDebugAxes;
    }
  }, [showDebugAxes]);

  // Update 3D pose and target part position
  useEffect(() => {
    if (!markerRootRef.current) return;

    if (markerPose) {
      markerRootRef.current.visible = true;
      // Set marker position & orientation in camera frame
      markerRootRef.current.position.copy(markerPose.position);
      markerRootRef.current.quaternion.copy(markerPose.quaternion);

      // Position the 3D arrow and ring at the active part's offset
      if (activePart) {
        const px = activePart.markerOffset.x * markerSizeMeters;
        const py = activePart.markerOffset.y * markerSizeMeters;
        const pz = activePart.markerOffset.z * markerSizeMeters;

        if (arrowGroupRef.current) {
          arrowGroupRef.current.position.set(px, py + 0.03, pz);
        }
        if (ringMeshRef.current) {
          ringMeshRef.current.position.set(px, py, pz);
        }
      }
    } else {
      markerRootRef.current.visible = false;
    }
  }, [markerPose, activePart, markerSizeMeters]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width, height }}
    />
  );
};
