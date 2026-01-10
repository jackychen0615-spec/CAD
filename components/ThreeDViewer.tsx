
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

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 5000);
    camera.position.set(params.w * 1.5, params.h * 2, params.d * 2.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(500, 500, 500);
    scene.add(pointLight);

    // 3. Materials
    const cardMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff, 
      side: THREE.DoubleSide,
      flatShading: true,
      shininess: 10
    });
    
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc });

    const boxGroup = new THREE.Group();
    scene.add(boxGroup);

    // 4. Geometry Logic based on BoxType
    const { w, d, h } = params;
    const f = foldAmount * (Math.PI / 2); // 90 degree fold

    const createPanel = (width: number, height: number, color?: number) => {
      const group = new THREE.Group();
      const geometry = new THREE.PlaneGeometry(width, height);
      // Offset geometry to make rotation happen at edge (pivot)
      geometry.translate(width / 2, height / 2, 0);
      const mesh = new THREE.Mesh(geometry, color ? new THREE.MeshPhongMaterial({color, side: THREE.DoubleSide}) : cardMaterial);
      group.add(mesh);

      // Add edge lines
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(edges, edgeMaterial);
      group.add(line);
      
      return group;
    };

    if (params.type === BoxType.MAILER) {
      // Mailer Box: T-Shape Folding
      const bottom = createPanel(w, d);
      bottom.position.set(-w/2, 0, -d/2);
      bottom.rotation.x = -Math.PI / 2;
      boxGroup.add(bottom);

      // Back wall & Top
      const back = createPanel(w, h);
      back.position.set(0, d, 0); // Relative to bottom
      back.rotation.x = f;
      bottom.add(back);

      const top = createPanel(w, d);
      top.position.set(0, h, 0);
      top.rotation.x = f;
      back.add(top);

      const flap = createPanel(w, 20);
      flap.position.set(0, d, 0);
      flap.rotation.x = f;
      top.add(flap);

      // Front wall
      const front = createPanel(w, h);
      front.position.set(0, 0, 0);
      front.rotation.x = -f;
      bottom.add(front);

      // Sides
      const sideL = createPanel(h, d);
      sideL.position.set(0, 0, 0);
      sideL.rotation.y = f;
      bottom.add(sideL);

      const sideR = createPanel(h, d);
      sideR.position.set(w, 0, 0);
      sideR.rotation.y = -f;
      bottom.add(sideR);

    } else if (params.type === BoxType.TELESCOPE) {
      // Telescope Box (Two parts: Base and Lid)
      const buildTray = (tw: number, td: number, th: number, offsetY: number) => {
        const tray = new THREE.Group();
        const base = createPanel(tw, td);
        base.position.set(-tw/2, offsetY, -td/2);
        base.rotation.x = -Math.PI / 2;
        tray.add(base);

        const sides = [
          {w: tw, h: th, pos: [0,0,0], rot: [-f,0,0]},
          {w: tw, h: th, pos: [0,td,0], rot: [f,0,0]},
          {w: th, h: td, pos: [0,0,0], rot: [0,f,0]},
          {w: th, h: td, pos: [tw,0,0], rot: [0,-f,0]},
        ];

        sides.forEach(s => {
          const p = createPanel(s.w, s.h);
          p.position.set(s.pos[0], s.pos[1], 0);
          p.rotation.set(s.rot[0], s.rot[1], 0);
          base.add(p);
        });
        return tray;
      };

      boxGroup.add(buildTray(w, d, h, 0));
      boxGroup.add(buildTray(w+5, d+5, h/2, h + 20 * (1 - foldAmount))); // Lid moves up when unfolding

    } else {
      // Default: Tube-style (Tuck End / Glue Bottom)
      const p1 = createPanel(w, h); p1.position.set(-w, 0, d/2);
      boxGroup.add(p1);
      
      const p2 = createPanel(d, h); p2.position.set(w, 0, 0); p2.rotation.y = f;
      p1.add(p2);
      
      const p3 = createPanel(w, h); p3.position.set(d, 0, 0); p3.rotation.y = f;
      p2.add(p3);
      
      const p4 = createPanel(d, h); p4.position.set(w, 0, 0); p4.rotation.y = f;
      p3.add(p4);

      // Top Lid
      const lid = createPanel(w, d); lid.position.set(0, h, 0); lid.rotation.x = -f;
      p1.add(lid);
    }

    // 5. Animation Loop
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
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
      cancelAnimationFrame(frame);
      renderer.dispose();
      if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
    };
  }, [params, foldAmount]);

  return <div ref={containerRef} className="w-full h-full" />;
};
