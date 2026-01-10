
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
  const boxGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    while (container.firstChild) container.removeChild(container.firstChild);

    const scene = new THREE.Scene();
    const colors = { white: 0xffffff, kraft: 0xc2a68a, corrugated: 0x8d6e63 };
    scene.background = new THREE.Color(materialType === 'kraft' ? 0xe2e8f0 : 0xf1f5f9);
    sceneRef.current = scene;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    const maxDim = Math.max(params.w, params.d, params.h);
    camera.position.set(maxDim * 2.5, maxDim * 2.5, maxDim * 2.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const light = new THREE.DirectionalLight(0xffffff, 0.5);
    light.position.set(1000, 2000, 1500);
    scene.add(light);

    const boxGroup = new THREE.Group();
    scene.add(boxGroup);
    boxGroupRef.current = boxGroup;

    const { w, d, h } = params;
    const f = foldAmount * (Math.PI / 2);

    const cardMat = new THREE.MeshPhongMaterial({ color: colors[materialType], side: THREE.DoubleSide, flatShading: true });
    const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });

    const createPanel = (pw: number, ph: number, origin: 'center' | 'bottom' = 'bottom') => {
      const g = new THREE.Group();
      if (pw <= 0.1 || ph <= 0.1) return g;
      const geom = new THREE.PlaneGeometry(pw, ph);
      if (origin === 'bottom') geom.translate(pw / 2, ph / 2, 0);
      const mesh = new THREE.Mesh(geom, cardMat);
      g.add(mesh);
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geom), lineMat);
      g.add(wire);
      return g;
    };

    // 根據盒型渲染不同結構
    if (params.type === BoxType.MAILER) {
      const bottom = createPanel(w, d);
      bottom.rotation.x = -Math.PI / 2;
      bottom.position.set(-w/2, 0, d/2);
      boxGroup.add(bottom);

      const front = createPanel(w, h); front.rotation.x = -f; bottom.add(front);
      const back = createPanel(w, h); back.position.set(0, d, 0); back.rotation.x = f; bottom.add(back);
      const top = createPanel(w, d); top.position.set(0, h, 0); top.rotation.x = f; back.add(top);
      const flap = createPanel(w, 20); flap.position.set(0, d, 0); flap.rotation.x = f; top.add(flap);
      const sL = createPanel(h, d); sL.rotation.y = f; bottom.add(sL);
      const sR = createPanel(h, d); sR.position.set(w, 0, 0); sR.rotation.y = -f; bottom.add(sR);

    } else if (params.type === BoxType.TUCK_END) {
      const p1 = createPanel(w, h); p1.position.set(-w/2, 0, d/2); boxGroup.add(p1);
      const p2 = createPanel(d, h); p2.position.set(w, 0, 0); p2.rotation.y = f; p1.add(p2);
      const p3 = createPanel(w, h); p3.position.set(d, 0, 0); p3.rotation.y = f; p2.add(p3);
      const p4 = createPanel(d, h); p4.position.set(w, 0, 0); p4.rotation.y = f; p3.add(p4);
      // 插舌特有結構
      const lid = createPanel(w, d); lid.position.set(0, h, 0); lid.rotation.x = -f; p1.add(lid);
      const tFlap = createPanel(w, 15); tFlap.position.set(0, d, 0); tFlap.rotation.x = -f; lid.add(tFlap);
      const base = createPanel(w, d); base.rotation.x = f; p1.add(base);
      const bFlap = createPanel(w, 15); bFlap.position.set(0, d, 0); bFlap.rotation.x = f; base.add(bFlap);

    } else if (params.type === BoxType.GLUE_BOTTOM) {
      const p1 = createPanel(w, h); p1.position.set(-w/2, 0, d/2); boxGroup.add(p1);
      const p2 = createPanel(d, h); p2.position.set(w, 0, 0); p2.rotation.y = f; p1.add(p2);
      const p3 = createPanel(w, h); p3.position.set(d, 0, 0); p3.rotation.y = f; p2.add(p3);
      const p4 = createPanel(d, h); p4.position.set(w, 0, 0); p4.rotation.y = f; p3.add(p4);
      // 糊底盒特有封底（簡化表示為四片交叉）
      [p1, p2, p3, p4].forEach((p, i) => {
        const flapW = (i % 2 === 0) ? w : d;
        const b = createPanel(flapW, d * 0.5); b.rotation.x = f; p.add(b);
      });

    } else if (params.type === BoxType.DRAWER) {
      // 運輸箱 RSC 結構
      const p1 = createPanel(w, h); p1.position.set(-w/2, 0, d/2); boxGroup.add(p1);
      const p2 = createPanel(d, h); p2.position.set(w, 0, 0); p2.rotation.y = f; p1.add(p2);
      const p3 = createPanel(w, h); p3.position.set(d, 0, 0); p3.rotation.y = f; p2.add(p3);
      const p4 = createPanel(d, h); p4.position.set(w, 0, 0); p4.rotation.y = f; p3.add(p4);
      [p1, p2, p3, p4].forEach((p, i) => {
        const fw = (i % 2 === 0) ? w : d;
        const topF = createPanel(fw, d*0.5); topF.position.set(0, h, 0); topF.rotation.x = -f; p.add(topF);
        const btmF = createPanel(fw, d*0.5); btmF.rotation.x = f; p.add(btmF);
      });

    } else if (params.type === BoxType.TELESCOPE) {
      const tray = createPanel(w, d); tray.rotation.x = -Math.PI / 2; tray.position.set(-w/2, 0, d/2); boxGroup.add(tray);
      const sides = [[w, h, 0, 0, -f, 0], [w, h, 0, d, f, 0], [h, d, 0, 0, 0, f], [h, d, w, 0, 0, -f]];
      sides.forEach(s => {
        const wall = createPanel(s[0], s[1]);
        wall.position.set(s[2], s[3], 0); wall.rotation.x = s[4]; wall.rotation.y = s[5];
        tray.add(wall);
      });
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

  return <div ref={containerRef} className="w-full h-full outline-none" />;
};
