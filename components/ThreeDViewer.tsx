
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'https://esm.sh/three@0.182.0/examples/jsm/controls/OrbitControls.js';
import { BoxParams, BoxType } from '../types';

interface Props {
  params: BoxParams;
  foldAmount: number;
  materialType?: 'white' | 'kraft' | 'corrugated';
}

export const ThreeDViewer: React.FC<Props> = ({ params, foldAmount, materialType = 'white' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const requestRef = useRef<number>(0);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    while (container.firstChild) container.removeChild(container.firstChild);

    const scene = new THREE.Scene();
    const colors = { white: 0xffffff, kraft: 0xd2b48c, corrugated: 0x8d6e63 };
    scene.background = new THREE.Color(materialType === 'kraft' ? 0xe2e8f0 : 0xf1f5f9);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 10000);
    const max = Math.max(params.w, params.d, params.h);
    camera.position.set(max * 2.5, max * 2.5, max * 2.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(max * 5, max * 5, max * 5);
    scene.add(sun);

    const boxGroup = new THREE.Group();
    scene.add(boxGroup);

    const { w, d, h, t } = params;
    const f = foldAmount * (Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({ color: colors[materialType], side: THREE.DoubleSide, flatShading: true });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 });

    const createPanel = (pw: number, ph: number, origin: 'bottom' | 'center' = 'bottom') => {
      const g = new THREE.Group();
      if (pw <= 0.1 || ph <= 0.1) return g;
      const geom = new THREE.PlaneGeometry(pw, ph);
      if (origin === 'bottom') geom.translate(pw / 2, ph / 2, 0);
      const mesh = new THREE.Mesh(geom, mat);
      g.add(mesh);
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom), edgeMat));
      return g;
    };

    if (params.type === BoxType.DRAWER) {
      // 外殼 (Sleeve)
      const sleeve = new THREE.Group();
      boxGroup.add(sleeve);
      const s1 = createPanel(w+5, d); s1.rotation.x = -Math.PI/2; sleeve.add(s1);
      const s2 = createPanel(h+5, d); s2.position.set(w+5,0,0); s2.rotation.y = -Math.PI/2; s1.add(s2);
      const s3 = createPanel(w+5, d); s3.position.set(h+5,0,0); s3.rotation.y = -Math.PI/2; s2.add(s3);
      const s4 = createPanel(h+5, d); s4.position.set(w+5,0,0); s4.rotation.y = -Math.PI/2; s3.add(s4);
      
      // 內盒 (Tray)
      const tray = new THREE.Group();
      tray.position.z = d * (1 - foldAmount) - d/2;
      boxGroup.add(tray);
      const base = createPanel(w, d); base.rotation.x = -Math.PI/2; tray.add(base);
      const walls = [[w,h,0,0,-f,0],[w,h,0,d,f,0],[h,d,0,0,0,f],[h,d,w,0,0,-f]];
      walls.forEach(c => {
        const wall = createPanel(c[0], c[1]);
        wall.position.set(c[2], c[3], 0); wall.rotation.x = c[4]; wall.rotation.y = c[5];
        base.add(wall);
      });
      boxGroup.position.set(-w/2, 0, d/2);
    } else if (params.type === BoxType.BOOK_STYLE) {
      // 皮殼 (翻書效果)
      const cover = new THREE.Group();
      boxGroup.add(cover);
      const pBack = createPanel(w+6, d+6); pBack.rotation.x = -Math.PI/2; cover.add(pBack);
      const spine = createPanel(h+4, d+6); spine.rotation.y = foldAmount * Math.PI; pBack.add(spine);
      const pFront = createPanel(w+6, d+6); pFront.position.set(h+4,0,0); pFront.rotation.y = 0; spine.add(pFront);
      // 內托
      const inner = createPanel(w, d); inner.position.set(3,3,1); pBack.add(inner);
      boxGroup.position.set(-w/2, 0, d/2);
    } else if (params.type === BoxType.MAILER) {
      const bottom = createPanel(w, d); bottom.rotation.x = -Math.PI/2; boxGroup.add(bottom);
      const back = createPanel(w, h); back.position.set(0,d,0); back.rotation.x = f; bottom.add(back);
      const top = createPanel(w, d); top.position.set(0,h,0); top.rotation.x = f; back.add(top);
      const front = createPanel(w, h); front.rotation.x = -f; bottom.add(front);
      const sL = createPanel(h, d); sL.rotation.y = f; bottom.add(sL);
      const sR = createPanel(h, d); sR.position.set(w,0,0); sR.rotation.y = -f; bottom.add(sR);
      boxGroup.position.set(-w/2, 0, d/2);
    } else {
      // 通用四方盒結構
      const p1 = createPanel(w, h); p1.position.set(-w/2,0,d/2); boxGroup.add(p1);
      const p2 = createPanel(d, h); p2.position.set(w,0,0); p2.rotation.y = f; p1.add(p2);
      const p3 = createPanel(w, h); p3.position.set(d,0,0); p3.rotation.y = f; p2.add(p3);
      const p4 = createPanel(d, h); p4.position.set(w,0,0); p4.rotation.y = f; p3.add(p4);
      const lid = createPanel(w, d); lid.position.set(0,h,0); lid.rotation.x = -f; p1.add(lid);
      const btm = createPanel(w, d); btm.rotation.x = f; p1.add(btm);
    }

    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current) rendererRef.current.render(sceneRef.current, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(requestRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
      scene.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
        }
      });
    };
  }, [params.type, params.w, params.d, params.h, foldAmount, materialType]);

  return <div ref={containerRef} className="w-full h-full" />;
};
