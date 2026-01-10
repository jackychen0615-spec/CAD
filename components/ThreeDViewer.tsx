
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BoxParams, BoxType } from '../types';

interface Props {
  params: BoxParams;
  foldAmount: number; // 0 to 1
}

export const ThreeDViewer: React.FC<Props> = ({ params, foldAmount }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 2000);
    camera.position.set(params.w, params.h * 2, params.d * 3);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(500, 500, 500);
    scene.add(directionalLight);

    // Box Geometry Creation (Simplified for common box types)
    const material = new THREE.MeshPhongMaterial({ 
      color: 0xffffff, 
      side: THREE.DoubleSide,
      flatShading: true
    });

    const boxGroup = new THREE.Group();
    scene.add(boxGroup);

    const { w, d, h } = params;

    // Create panels
    const panels = [
      { size: [w, d], pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], label: 'Bottom' },
      { size: [w, h], pos: [0, h/2, -d/2], rot: [0, 0, 0], label: 'Back' },
      { size: [w, h], pos: [0, h/2, d/2], rot: [0, 0, 0], label: 'Front' },
      { size: [h, d], pos: [-w/2, h/2, 0], rot: [0, Math.PI / 2, 0], label: 'Left' },
      { size: [h, d], pos: [w/2, h/2, 0], rot: [0, Math.PI / 2, 0], label: 'Right' },
      { size: [w, d], pos: [0, h, -d/2], rot: [Math.PI / 2, 0, 0], label: 'Top' },
    ];

    panels.forEach(p => {
      const geo = new THREE.PlaneGeometry(p.size[0], p.size[1]);
      const mesh = new THREE.Mesh(geo, material);
      
      // Basic folding simulation logic: Interpolate position based on foldAmount
      const targetPos = new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]);
      const startPos = new THREE.Vector3(p.pos[0] * 2, 0, p.pos[2] * 2);
      mesh.position.copy(startPos.lerp(targetPos, foldAmount));
      
      mesh.rotation.set(p.rot[0] * foldAmount, p.rot[1] * foldAmount, p.rot[2] * foldAmount);
      boxGroup.add(mesh);
    });

    const animate = () => {
      requestAnimationFrame(animate);
      boxGroup.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
    };
  }, [params, foldAmount]);

  return <div ref={containerRef} className="w-full h-full" />;
};
