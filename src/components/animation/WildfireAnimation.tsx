import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { HEADER_HEIGHT } from "../../constants/layout";

// --- SLOW BURN CONFIG ---
const CONFIG = {
  gridSize: 30,
  treeDensity: 0.6,
  burnSpeed: 0.7,
  spreadRadius: 3.2,
  spreadChance: 0.5,
  waterRadius: 5, // 물 범위
};

const PALETTE = {
  bg: 0x050510,
  ground: 0x0a0a15,
  healthy: 0x00ffaa, // Mint
  burning: 0xff5500, // Orange
  burnt: 0x111111, // Dark Grey
  ember: 0xffcc00, // Gold
  water: 0x00ffff, // Cyan
};

interface TreeData {
  id: number;
  x: number;
  z: number;
  state: "HEALTHY" | "BURNING" | "BURNT";
  hp: number;
  maxHp: number;
  scaleY: number;
  flashOffset: number;
}

const SlowBurnWildfire = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameIdRef = useRef<number>(0);
  const treesRef = useRef<TreeData[]>([]);

  const [stats, setStats] = useState({ healthy: 0, burning: 0, burnt: 0 });
  const mouseStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PALETTE.bg);

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(-30, 30, 30); // 줌인 상태 유지
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      powerPreference: "high-performance",
      antialias: false,
    });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    containerRef.current.appendChild(renderer.domElement);

    // 2. Bloom (은은하게)
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, // 강도 적절히
        0.4,
        0.1
      )
    );

    // 3. Environment
    scene.add(new THREE.AmbientLight(0x333355, 1.0));
    const dirLight = new THREE.DirectionalLight(0xaaccff, 0.5);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(CONFIG.gridSize * 2, CONFIG.gridSize * 2),
      new THREE.MeshStandardMaterial({ color: PALETTE.ground, roughness: 0.8 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(
      CONFIG.gridSize * 2,
      CONFIG.gridSize,
      0x333366,
      0x111122
    );
    gridHelper.position.y = -0.45;
    scene.add(gridHelper);

    // 4. Trees
    const treeCount = Math.floor(
      CONFIG.gridSize * CONFIG.gridSize * CONFIG.treeDensity
    );
    const treeGeo = new THREE.BoxGeometry(0.6, 1, 0.6);
    treeGeo.translate(0, 0.5, 0);
    const treeMesh = new THREE.InstancedMesh(
      treeGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
      treeCount
    );
    scene.add(treeMesh);

    // Init
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const trees: TreeData[] = [];
    let idx = 0;

    for (let x = -CONFIG.gridSize / 2; x < CONFIG.gridSize / 2; x++) {
      for (let z = -CONFIG.gridSize / 2; z < CONFIG.gridSize / 2; z++) {
        if (Math.random() > CONFIG.treeDensity) continue;
        if (idx >= treeCount) break;

        const h = 0.6 + Math.random() * 1.4;
        dummy.position.set(x, 0, z);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        treeMesh.setMatrixAt(idx, dummy.matrix);
        treeMesh.setColorAt(idx, color.setHex(PALETTE.healthy));

        // 중앙 발화
        const isFire = Math.sqrt(x * x + z * z) < 2.5;

        trees.push({
          id: idx,
          x,
          z,
          state: isFire ? "BURNING" : "HEALTHY",
          hp: 100,
          maxHp: 100,
          scaleY: h,
          flashOffset: Math.random() * 100,
        });
        idx++;
      }
    }
    treeMesh.instanceMatrix.needsUpdate = true;
    treeMesh.instanceColor!.needsUpdate = true;
    treesRef.current = trees;

    // 5. Particles
    const pCount = 1000;
    const pMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: PALETTE.ember }),
      pCount
    );
    scene.add(pMesh);
    const pData = Array.from({ length: pCount }, () => ({
      active: false,
      pos: new THREE.Vector3(0, -100, 0),
      vel: new THREE.Vector3(),
      life: 0,
    }));

    // 6. Water Ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: PALETTE.water,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.8, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);

    // Interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    controls.enableZoom = false;

    const onMouseDown = (e: MouseEvent) =>
      (mouseStart.current = { x: e.clientX, y: e.clientY });
    const onMouseUp = (e: MouseEvent) => {
      if (
        Math.hypot(
          e.clientX - mouseStart.current.x,
          e.clientY - mouseStart.current.y
        ) < 5
      )
        extinguish(e);
    };

    const extinguish = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects([ground, treeMesh]);

      if (intersects.length > 0) {
        const pt = intersects[0].point;
        ring.position.copy(pt);
        ring.position.y = 1;
        ringMat.opacity = 1;
        ring.scale.set(1, 1, 1);

        treesRef.current.forEach((t) => {
          if ((t.x - pt.x) ** 2 + (t.z - pt.z) ** 2 < CONFIG.waterRadius ** 2) {
            // 회복 시 완전히 회복
            if (t.state !== "HEALTHY") {
              t.state = "HEALTHY";
              t.hp = t.maxHp;
            }
          }
        });
      }
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mouseup", onMouseUp);

    // Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      let h = 0,
        b = 0,
        d = 0;

      const activeTrees = treesRef.current;

      for (let i = 0; i < activeTrees.length; i++) {
        const t = activeTrees[i];

        if (t.state === "HEALTHY") h++;
        else if (t.state === "BURNING") {
          b++;
          t.hp -= CONFIG.burnSpeed; // 천천히 탐

          // [핵심] Slow & Steady Spread Logic
          // 매 프레임 작은 확률(2%)로 전파 시도 -> 하지만 나무가 오래 타므로 결국엔 전파됨
          if (Math.random() < CONFIG.spreadChance) {
            // 랜덤 타겟팅
            const targetIdx = Math.floor(Math.random() * activeTrees.length);
            const target = activeTrees[targetIdx];
            if (target.state === "HEALTHY") {
              const distSq = (t.x - target.x) ** 2 + (t.z - target.z) ** 2;
              if (distSq < CONFIG.spreadRadius ** 2) {
                target.state = "BURNING";
              }
            }
          }

          if (t.hp <= 0) t.state = "BURNT";
        } else {
          d++;
        }

        // Visuals
        const dummyScale = new THREE.Vector3();
        if (t.state === "BURNING") {
          // 부드러운 깜빡임
          const pulse = Math.sin(time * 3 + t.flashOffset) * 0.5 + 0.5;
          color.setHex(PALETTE.burning);
          color.r += 0.5 * pulse;
          color.g += 0.3 * pulse;

          dummyScale.set(1.05, t.scaleY * 1.05, 1.05);

          // Particles (적당히)
          if (Math.random() < 0.05) {
            const p = pData.find((pd) => !pd.active);
            if (p) {
              p.active = true;
              p.life = 1.2;
              p.pos.set(t.x, t.scaleY, t.z);
              p.vel.set(
                (Math.random() - 0.5) * 0.03,
                0.04 + Math.random() * 0.04,
                (Math.random() - 0.5) * 0.03
              );
            }
          }
        } else if (t.state === "BURNT") {
          color.setHex(PALETTE.burnt);
          dummyScale.set(0.9, t.scaleY * 0.8, 0.9);
        } else {
          color.setHex(PALETTE.healthy);
          dummyScale.set(1, t.scaleY, 1);
        }
        treeMesh.setColorAt(i, color);
        dummy.position.set(t.x, 0, t.z);
        dummy.scale.copy(dummyScale);
        dummy.updateMatrix();
        treeMesh.setMatrixAt(i, dummy.matrix);
      }
      treeMesh.instanceColor!.needsUpdate = true;
      treeMesh.instanceMatrix.needsUpdate = true;
      setStats({ healthy: h, burning: b, burnt: d });

      // Particles Update
      for (let i = 0; i < pCount; i++) {
        const p = pData[i];
        if (p.active) {
          p.life -= 0.015;
          p.pos.add(p.vel);
          dummy.position.copy(p.pos);
          dummy.scale.set(p.life * 0.15, p.life * 0.15, p.life * 0.15);
          dummy.updateMatrix();
          pMesh.setMatrixAt(i, dummy.matrix);
          if (p.life <= 0) {
            p.active = false;
            dummy.scale.set(0, 0, 0);
            pMesh.setMatrixAt(i, dummy.matrix);
          }
        }
      }
      pMesh.instanceMatrix.needsUpdate = true;

      // Ring Animation
      if (ringMat.opacity > 0) {
        ring.scale.multiplyScalar(1.05);
        ringMat.opacity -= 0.03;
      }

      controls.update();
      composer.render();
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mouseup", onMouseUp);
      cancelAnimationFrame(frameIdRef.current);
      renderer.dispose();
      composer.dispose();
      treeGeo.dispose();
      treeMesh.dispose();
    };
  }, []);

  return (
    <Container ref={containerRef}>
      <StatusPanel>
        <StatusItem color="#00ffcc">LIVE {stats.healthy}</StatusItem>
        <StatusItem color="#ff5500">FIRE {stats.burning}</StatusItem>
        <StatusItem color="#666">DEAD {stats.burnt}</StatusItem>
      </StatusPanel>
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
  height: calc(100vh - ${HEADER_HEIGHT}px);
  overflow: hidden;
  position: relative; /* For absolute canvas and sticky UI */

  canvas {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
  }
`;

const StatusPanel = styled.div`
  position: sticky;
  top: 30px;
  left: 30px;
  width: fit-content;
  display: flex;
  flex-direction: column;
  gap: 15px;
  pointer-events: none;
  z-index: 10;
  padding: 20px;
`;

const StatusItem = styled.div<{ color: string }>`
  font-family: "Inter", sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: ${(p) => p.color};
  letter-spacing: 1px;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
`;

export default SlowBurnWildfire;
