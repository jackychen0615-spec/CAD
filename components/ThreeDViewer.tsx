
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
  const requestRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    while (container.firstChild) container.removeChild(container.firstChild);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(materialType === 'kraft' ? 0xe2e8f0 : 0xf1f5f9);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 10000);
    const maxDim = Math.max(params.w, params.d, params.h);
    camera.position.set(maxDim * 2.2, maxDim * 1.8, maxDim * 2.2);
    camera.lookAt(0, params.h * 0.3, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, params.h * 0.3, 0);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(maxDim * 3, maxDim * 5, maxDim * 3);
    sun.castShadow = true;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.2);
    fill.position.set(-maxDim * 2, maxDim, -maxDim * 2);
    scene.add(fill);

    // Ground plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(maxDim * 8, maxDim * 8),
      new THREE.MeshPhongMaterial({ color: 0xe2e8f0, depthWrite: false })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    const colors = { white: 0xfafafa, kraft: 0xc4a882, corrugated: 0x8d6e63 };
    const mat = new THREE.MeshPhongMaterial({
      color: colors[materialType],
      side: THREE.DoubleSide,
      flatShading: false,
      shininess: 20
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 });

    const { w, d, h } = params;
    const f = foldAmount * (Math.PI / 2); // fold angle: 0 = flat, PI/2 = fully folded

    // Helper: create a panel with pivot at one edge
    // pivotEdge: which edge is the hinge
    //   'bottom' = pivot at y=0 (fold upward around bottom edge)
    //   'top'    = pivot at y=ph
    //   'left'   = pivot at x=0
    //   'right'  = pivot at x=pw
    const makePanel = (pw: number, ph: number, pivotEdge: 'bottom' | 'top' | 'left' | 'right' = 'bottom') => {
      const group = new THREE.Group();
      if (pw <= 0 || ph <= 0) return group;

      const geom = new THREE.PlaneGeometry(pw, ph);

      // Shift geometry so the pivot edge is at the group's origin
      switch (pivotEdge) {
        case 'bottom': geom.translate(pw / 2, ph / 2, 0); break;
        case 'top':    geom.translate(pw / 2, -ph / 2, 0); break;
        case 'left':   geom.translate(pw / 2, ph / 2, 0); break;
        case 'right':  geom.translate(-pw / 2, ph / 2, 0); break;
      }

      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      group.add(mesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom), edgeMat));
      return group;
    };

    const root = new THREE.Group();
    scene.add(root);

    if (params.type === BoxType.MAILER) {
      // Mailer box: bottom → front wall → front flap, bottom → back wall → lid → tuck, bottom → left/right walls
      // Layout: lid on top folds over, front flap tucks in

      // Bottom panel (lies flat on XZ plane)
      const bottom = makePanel(w, d);
      bottom.rotation.x = -Math.PI / 2; // lay flat
      root.add(bottom);

      // Back wall: hinge at back edge of bottom (y=d in bottom's local = z in world before rotation)
      const backWall = makePanel(w, h, 'bottom');
      backWall.position.set(0, d, 0); // at back edge
      backWall.rotation.x = f; // fold up
      bottom.add(backWall);

      // Lid: hinge at top of back wall
      const lid = makePanel(w, d, 'bottom');
      lid.position.set(0, h, 0);
      lid.rotation.x = f; // fold over
      backWall.add(lid);

      // Tuck flap on lid
      const tuck = makePanel(w, h * 0.3, 'bottom');
      tuck.position.set(0, d, 0);
      tuck.rotation.x = f * 0.8; // tuck down slightly
      lid.add(tuck);

      // Front wall: hinge at front edge of bottom (y=0)
      const frontWall = makePanel(w, h, 'bottom');
      frontWall.rotation.x = -f; // fold up (opposite direction)
      bottom.add(frontWall);

      // Left wall: hinge at left edge of bottom (x=0)
      const leftWall = makePanel(d, h, 'bottom');
      leftWall.rotation.y = f; // fold up to the left
      bottom.add(leftWall);

      // Right wall: hinge at right edge of bottom (x=w)
      const rightWall = makePanel(d, h, 'bottom');
      rightWall.position.set(w, 0, 0);
      rightWall.rotation.y = -f; // fold up to the right
      bottom.add(rightWall);

      root.position.set(-w / 2, 0, d / 2);

    } else if (params.type === BoxType.TUCK_END) {
      // Tuck end box: 4 walls wrapping around, top tuck, bottom flaps
      const front = makePanel(w, h, 'bottom');
      front.position.set(-w / 2, 0, d / 2);
      root.add(front);

      // Right wall
      const right = makePanel(d, h, 'bottom');
      right.position.set(w, 0, 0);
      right.rotation.y = -f;
      front.add(right);

      // Back wall
      const back = makePanel(w, h, 'bottom');
      back.position.set(d, 0, 0);
      back.rotation.y = -f;
      right.add(back);

      // Left wall
      const left = makePanel(d, h, 'bottom');
      left.position.set(w, 0, 0);
      left.rotation.y = -f;
      back.add(left);

      // Top lid (tuck)
      const topLid = makePanel(w, d, 'bottom');
      topLid.position.set(0, h, 0);
      topLid.rotation.x = -f;
      front.add(topLid);

      // Top tuck flap
      const topTuck = makePanel(w, d * 0.3, 'bottom');
      topTuck.position.set(0, d, 0);
      topTuck.rotation.x = -f * 0.5;
      topLid.add(topTuck);

      // Bottom flap
      const bottomFlap = makePanel(w, d, 'bottom');
      bottomFlap.rotation.x = f;
      front.add(bottomFlap);

    } else if (params.type === BoxType.TELESCOPE) {
      // Telescope: separate top and bottom trays
      // Bottom tray
      const btmBase = makePanel(w, d);
      btmBase.rotation.x = -Math.PI / 2;
      root.add(btmBase);

      const btmFront = makePanel(w, h, 'bottom');
      btmFront.rotation.x = -f;
      btmBase.add(btmFront);

      const btmBack = makePanel(w, h, 'bottom');
      btmBack.position.set(0, d, 0);
      btmBack.rotation.x = f;
      btmBase.add(btmBack);

      const btmLeft = makePanel(d, h, 'bottom');
      btmLeft.rotation.y = f;
      btmBase.add(btmLeft);

      const btmRight = makePanel(d, h, 'bottom');
      btmRight.position.set(w, 0, 0);
      btmRight.rotation.y = -f;
      btmBase.add(btmRight);

      // Top lid (slightly larger, offset above)
      const lidOffset = h * foldAmount + 2;
      const topBase = makePanel(w + 4, d + 4);
      topBase.rotation.x = -Math.PI / 2;
      topBase.position.set(-2, lidOffset, 2);
      root.add(topBase);

      const topFront = makePanel(w + 4, h * 0.6, 'bottom');
      topFront.rotation.x = -f;
      topBase.add(topFront);

      const topBack = makePanel(w + 4, h * 0.6, 'bottom');
      topBack.position.set(0, d + 4, 0);
      topBack.rotation.x = f;
      topBase.add(topBack);

      const topLeft = makePanel(d + 4, h * 0.6, 'bottom');
      topLeft.rotation.y = f;
      topBase.add(topLeft);

      const topRight = makePanel(d + 4, h * 0.6, 'bottom');
      topRight.position.set(w + 4, 0, 0);
      topRight.rotation.y = -f;
      topBase.add(topRight);

      root.position.set(-w / 2, 0, d / 2);

    } else if (params.type === BoxType.GLUE_BOTTOM) {
      // Similar to tuck end but with glue bottom flaps
      const front = makePanel(w, h, 'bottom');
      front.position.set(-w / 2, 0, d / 2);
      root.add(front);

      const right = makePanel(d, h, 'bottom');
      right.position.set(w, 0, 0);
      right.rotation.y = -f;
      front.add(right);

      const back = makePanel(w, h, 'bottom');
      back.position.set(d, 0, 0);
      back.rotation.y = -f;
      right.add(back);

      const left = makePanel(d, h, 'bottom');
      left.position.set(w, 0, 0);
      left.rotation.y = -f;
      back.add(left);

      // Bottom flaps (4 pieces folding inward)
      const btmF = makePanel(w, d * 0.7, 'bottom');
      btmF.rotation.x = f;
      front.add(btmF);

      const btmR = makePanel(d, d * 0.7, 'bottom');
      btmR.rotation.x = f;
      right.add(btmR);

      const btmB = makePanel(w, d * 0.7, 'bottom');
      btmB.rotation.x = f;
      back.add(btmB);

      const btmL = makePanel(d, d * 0.7, 'bottom');
      btmL.rotation.x = f;
      left.add(btmL);

    } else if (params.type === BoxType.DRAWER) {
      // Drawer box: outer sleeve + inner tray
      // Outer sleeve (4 walls, no top/bottom)
      const sleeve = new THREE.Group();
      root.add(sleeve);

      const sw = w + 4; // slightly larger than inner
      const sd = d;

      const sF = makePanel(sw, h, 'bottom');
      sF.position.set(-sw / 2, 0, sd / 2);
      sleeve.add(sF);

      const sR = makePanel(sd, h, 'bottom');
      sR.position.set(sw, 0, 0);
      sR.rotation.y = -f;
      sF.add(sR);

      const sB = makePanel(sw, h, 'bottom');
      sB.position.set(sd, 0, 0);
      sB.rotation.y = -f;
      sR.add(sB);

      const sL = makePanel(sd, h, 'bottom');
      sL.position.set(sw, 0, 0);
      sL.rotation.y = -f;
      sB.add(sL);

      // Inner tray (slides out based on foldAmount inverted)
      const tray = new THREE.Group();
      const slideOut = (1 - foldAmount) * d * 0.6;
      tray.position.set(0, 0, slideOut);
      root.add(tray);

      const tBase = makePanel(w, d);
      tBase.rotation.x = -Math.PI / 2;
      tBase.position.set(-w / 2, 0, d / 2);
      tray.add(tBase);

      const tF = makePanel(w, h * 0.8, 'bottom');
      tF.rotation.x = -Math.PI / 2;
      tBase.add(tF);

      // Tray walls
      const twF = makePanel(w, h * 0.8, 'bottom');
      twF.rotation.x = -f;
      tBase.add(twF);

      const twB = makePanel(w, h * 0.8, 'bottom');
      twB.position.set(0, d, 0);
      twB.rotation.x = f;
      tBase.add(twB);

      const twL = makePanel(d, h * 0.8, 'bottom');
      twL.rotation.y = f;
      tBase.add(twL);

      const twR = makePanel(d, h * 0.8, 'bottom');
      twR.position.set(w, 0, 0);
      twR.rotation.y = -f;
      tBase.add(twR);

    } else if (params.type === BoxType.BOOK_STYLE) {
      // Book style: back cover + spine + front cover (like opening a book)
      const coverW = w + 6;
      const coverD = d + 6;
      const spineW = h + 4;
      const openAngle = (1 - foldAmount) * Math.PI * 0.6;

      // Back cover (flat)
      const backCover = makePanel(coverW, coverD);
      backCover.rotation.x = -Math.PI / 2;
      root.add(backCover);

      // Spine: hinge at right edge of back cover
      const spine = makePanel(spineW, coverD, 'bottom');
      spine.position.set(coverW, 0, 0);
      spine.rotation.y = -f;
      backCover.add(spine);

      // Front cover: hinge at right edge of spine
      const frontCover = makePanel(coverW, coverD, 'bottom');
      frontCover.position.set(spineW, 0, 0);
      frontCover.rotation.y = -f - openAngle;
      spine.add(frontCover);

      // Inner tray on back cover
      const innerTray = makePanel(w, d);
      innerTray.position.set(3, 3, 1.5);
      backCover.add(innerTray);

      root.position.set(-coverW / 2, 0, coverD / 2);

    } else if (params.type === BoxType.HANDLE) {
      // Handle box: like tuck end but with handle on top
      const front = makePanel(w, h, 'bottom');
      front.position.set(-w / 2, 0, d / 2);
      root.add(front);

      const right = makePanel(d, h, 'bottom');
      right.position.set(w, 0, 0);
      right.rotation.y = -f;
      front.add(right);

      const back = makePanel(w, h, 'bottom');
      back.position.set(d, 0, 0);
      back.rotation.y = -f;
      right.add(back);

      const left = makePanel(d, h, 'bottom');
      left.position.set(w, 0, 0);
      left.rotation.y = -f;
      back.add(left);

      // Handle panels (two halves meeting at top)
      const handleH = 40;
      const handleFront = makePanel(w, handleH, 'bottom');
      handleFront.position.set(0, h, 0);
      handleFront.rotation.x = -f;
      front.add(handleFront);

      const handleBack = makePanel(w, handleH, 'bottom');
      handleBack.position.set(0, h, 0);
      handleBack.rotation.x = -f;
      back.add(handleBack);

      // Bottom flap
      const btm = makePanel(w, d, 'bottom');
      btm.rotation.x = f;
      front.add(btm);

    } else {
      // Fallback: basic 4-wall box
      const front = makePanel(w, h, 'bottom');
      front.position.set(-w / 2, 0, d / 2);
      root.add(front);

      const right = makePanel(d, h, 'bottom');
      right.position.set(w, 0, 0);
      right.rotation.y = -f;
      front.add(right);

      const back = makePanel(w, h, 'bottom');
      back.position.set(d, 0, 0);
      back.rotation.y = -f;
      right.add(back);

      const left = makePanel(d, h, 'bottom');
      left.position.set(w, 0, 0);
      left.rotation.y = -f;
      back.add(left);

      const topLid = makePanel(w, d, 'bottom');
      topLid.position.set(0, h, 0);
      topLid.rotation.x = -f;
      front.add(topLid);

      const btm = makePanel(w, d, 'bottom');
      btm.rotation.x = f;
      front.add(btm);
    }

    // Animation loop
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      if (!container.clientWidth) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(requestRef.current);
      renderer.dispose();
      scene.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
        }
      });
    };
  }, [params.type, params.w, params.d, params.h, params.t, foldAmount, materialType]);

  return <div ref={containerRef} className="w-full h-full" />;
};
