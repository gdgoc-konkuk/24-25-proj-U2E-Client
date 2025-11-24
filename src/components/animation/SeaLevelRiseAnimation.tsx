import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { HEADER_HEIGHT } from "../../constants/layout";

// --- CONFIGURATION ---
const GRID_SIZE = 16;
const TILE_SIZE = 1.2;
const FLOOD_SPEED = 0.002;
const MAX_ENERGY = 500;
const BUILD_COST = 10;
const WIN_WATER_LEVEL = 3.5;

const PALETTE = {
  bg: 0x050510,
  water: 0x00aaff,
  waterEmissive: 0x003388,
  ground: 0x222222,
  building: 0xffffff,
  buildingFlooded: 0x111111,
  wall: 0xff9900,
  cursor: 0x00ff00,
};

interface TileData {
  id: number;
  x: number;
  z: number;
  gridX: number;
  gridZ: number;
  type: "GROUND" | "BUILDING" | "WALL";
  height: number;
  isFlooded: boolean;
  instanceId: number;
}

const SeaLevelDefenseFinal = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameIdRef = useRef<number>(0);
  const tilesRef = useRef<TileData[]>([]);
  const waterLevelRef = useRef(-1.5);

  // Game Logic Refs
  const energyRef = useRef(MAX_ENERGY);
  const gameStateRef = useRef<"PLAYING" | "GAME_OVER" | "VICTORY">("PLAYING");
  const floodedCountRef = useRef(0);

  // UI State
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [floodedCount, setFloodedCount] = useState(0);
  const [totalBuildings, setTotalBuildings] = useState(0);
  const [waterLevelDisplay, setWaterLevelDisplay] = useState(0);
  const [gameState, setGameState] = useState<
    "PLAYING" | "GAME_OVER" | "VICTORY"
  >("PLAYING");

  const mouseRef = useRef(new THREE.Vector2());
  const raycaster = new THREE.Raycaster();
  const interactionPlaneRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PALETTE.bg);
    scene.fog = new THREE.FogExp2(PALETTE.bg, 0.012);

    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(30, 30, 20);

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
    renderer.toneMappingExposure = 1.4;

    // Canvas Positioning for Sticky UI support
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.zIndex = "0";

    containerRef.current.appendChild(renderer.domElement);

    // 2. Post-Processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,
      0.5,
      0.8
    );
    composer.addPass(renderPass);
    composer.addPass(bloomPass);

    // 3. Lights
    const ambientLight = new THREE.AmbientLight(0x666688, 2.0);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 4. Interaction Plane
    const planeGeo = new THREE.PlaneGeometry(100, 100);
    const planeMat = new THREE.MeshBasicMaterial({ visible: false });
    const interactionPlane = new THREE.Mesh(planeGeo, planeMat);
    interactionPlane.rotation.x = -Math.PI / 2;
    interactionPlane.position.y = 0.5;
    scene.add(interactionPlane);
    interactionPlaneRef.current = interactionPlane;

    // 5. Water System
    const tileCount = GRID_SIZE * GRID_SIZE;

    // A. Outer Ocean (Infinite water with a hole for the grid)
    const oceanShape = new THREE.Shape();
    oceanShape.moveTo(-50, -50);
    oceanShape.lineTo(50, -50);
    oceanShape.lineTo(50, 50);
    oceanShape.lineTo(-50, 50);
    oceanShape.lineTo(-50, -50);

    const holePath = new THREE.Path();
    const halfSize = (GRID_SIZE * TILE_SIZE) / 2;
    holePath.moveTo(-halfSize, -halfSize);
    holePath.lineTo(halfSize, -halfSize);
    holePath.lineTo(halfSize, halfSize);
    holePath.lineTo(-halfSize, halfSize);
    holePath.lineTo(-halfSize, -halfSize);
    oceanShape.holes.push(holePath);

    const oceanGeo = new THREE.ShapeGeometry(oceanShape);
    const waterMat = new THREE.MeshStandardMaterial({
      color: PALETTE.water,
      transparent: true,
      opacity: 0.8,
      emissive: PALETTE.waterEmissive,
      emissiveIntensity: 0.6,
      roughness: 0.0,
      side: THREE.DoubleSide,
    });
    const outerWater = new THREE.Mesh(oceanGeo, waterMat);
    outerWater.rotation.x = -Math.PI / 2;
    scene.add(outerWater);

    // B. Inner Water (Instanced tiles for the grid)
    const innerWaterGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    const innerWaterMesh = new THREE.InstancedMesh(
      innerWaterGeo,
      waterMat,
      tileCount
    );
    scene.add(innerWaterMesh);

    // 6. City Generation
    const boxGeo = new THREE.BoxGeometry(TILE_SIZE * 0.95, 1, TILE_SIZE * 0.95);
    boxGeo.translate(0, 0.5, 0);

    const buildingMat = new THREE.MeshStandardMaterial({
      color: PALETTE.building,
      roughness: 0.3,
    });
    const groundMat = new THREE.MeshStandardMaterial({
      color: PALETTE.ground,
      roughness: 1.0,
    });
    const wallMat = new THREE.MeshStandardMaterial({
      color: PALETTE.wall,
      emissive: 0xff6600,
      roughness: 0.5,
    });

    const buildingMesh = new THREE.InstancedMesh(
      boxGeo,
      buildingMat,
      tileCount
    );
    const groundMesh = new THREE.InstancedMesh(boxGeo, groundMat, tileCount);
    const wallMesh = new THREE.InstancedMesh(boxGeo, wallMat, tileCount);

    scene.add(buildingMesh);
    scene.add(groundMesh);
    scene.add(wallMesh);

    const tiles: TileData[] = [];
    const dummy = new THREE.Object3D();
    let bIdx = 0,
      gIdx = 0,
      buildingCount = 0;

    // Initialize matrices
    for (let i = 0; i < tileCount; i++) {
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      wallMesh.setMatrixAt(i, dummy.matrix);
      innerWaterMesh.setMatrixAt(i, dummy.matrix); // Init inner water hidden
    }

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        // [수정] Gap Fix: Center the grid properly
        const worldX = (x - GRID_SIZE / 2 + 0.5) * TILE_SIZE;
        const worldZ = (z - GRID_SIZE / 2 + 0.5) * TILE_SIZE;
        const dist = Math.sqrt(worldX * worldX + worldZ * worldZ);

        const isBuilding = dist < 6.5 && Math.random() > 0.35;
        let height = Math.max(0.5, 3.0 - dist * 0.2 + Math.random() * 0.5);
        if (!isBuilding) height = 0.5;

        dummy.position.set(worldX, 0, worldZ);
        dummy.scale.set(1, height, 1);
        dummy.updateMatrix();

        let type: "GROUND" | "BUILDING" = "GROUND";
        let instanceId = gIdx;
        if (isBuilding) {
          type = "BUILDING";
          instanceId = bIdx;
          buildingMesh.setMatrixAt(bIdx++, dummy.matrix);
          buildingCount++;
        } else {
          groundMesh.setMatrixAt(gIdx++, dummy.matrix);
        }

        tiles.push({
          id: tiles.length,
          x: worldX,
          z: worldZ,
          gridX: x,
          gridZ: z,
          type,
          height,
          isFlooded: false,
          instanceId,
        });
      }
    }
    buildingMesh.instanceMatrix.needsUpdate = true;
    groundMesh.instanceMatrix.needsUpdate = true;
    wallMesh.instanceMatrix.needsUpdate = true;
    tilesRef.current = tiles;
    setTotalBuildings(buildingCount);

    // 7. Ghost Cursor
    const ghostGeo = new THREE.BoxGeometry(TILE_SIZE, 4, TILE_SIZE);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: PALETTE.cursor,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
      depthTest: false,
    });
    const ghostCursor = new THREE.Mesh(ghostGeo, ghostMat);
    scene.add(ghostCursor);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.enableZoom = false;

    // Handlers
    const handleMouseMove = (e: MouseEvent) => {
      if (gameStateRef.current !== "PLAYING" || !interactionPlaneRef.current)
        return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseRef.current, camera);
      const intersects = raycaster.intersectObject(interactionPlaneRef.current);

      if (intersects.length > 0) {
        const p = intersects[0].point;
        // [수정] Snap logic for centered grid
        // Since grid is offset by 0.5 * TILE_SIZE, standard round might be off?
        // Grid centers are at (i + 0.5) * TILE_SIZE.
        // Let's find closest tile in tilesRef instead of math snapping for precision

        // Optimization: Math snap is faster.
        // Grid starts at -GRID_SIZE/2 * TILE_SIZE + 0.5 * TILE_SIZE
        // = (-8 + 0.5) * 1.2 = -7.5 * 1.2 = -9.0
        // Next is -7.8, etc.
        // It's (n) * 1.2 where n is half-integer?
        // Let's just use the tile finding logic for the cursor position

        const closest = tilesRef.current.reduce((prev, curr) => {
          const distPrev = (prev.x - p.x) ** 2 + (prev.z - p.z) ** 2;
          const distCurr = (curr.x - p.x) ** 2 + (curr.z - p.z) ** 2;
          return distCurr < distPrev ? curr : prev;
        });

        if (
          Math.abs(closest.x - p.x) < TILE_SIZE &&
          Math.abs(closest.z - p.z) < TILE_SIZE
        ) {
          ghostCursor.position.set(closest.x, 2, closest.z);
          ghostCursor.visible = true;
        } else {
          ghostCursor.visible = false;
        }
      } else {
        ghostCursor.visible = false;
      }
    };

    const handleClick = () => {
      if (gameStateRef.current !== "PLAYING" || energyRef.current < BUILD_COST)
        return;
      const cx = ghostCursor.position.x;
      const cz = ghostCursor.position.z;

      const target = tilesRef.current.find(
        (t) => Math.abs(t.x - cx) < 0.1 && Math.abs(t.z - cz) < 0.1
      );

      if (target && target.type !== "WALL") {
        energyRef.current -= BUILD_COST;
        setEnergy(energyRef.current);

        target.type = "WALL";
        target.height += 4.0;
        target.isFlooded = false;

        // [핵심 수정] 더미 객체의 회전값 초기화! (물을 그릴 때 돌려놨던 것을 되돌림)
        dummy.rotation.set(0, 0, 0);
        dummy.position.set(target.x, 0, target.z);
        dummy.scale.set(1, target.height, 1);
        dummy.updateMatrix();

        wallMesh.setMatrixAt(target.id, dummy.matrix);
        wallMesh.instanceMatrix.needsUpdate = true;

        // 물 제거
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        innerWaterMesh.setMatrixAt(target.id, dummy.matrix);
        innerWaterMesh.instanceMatrix.needsUpdate = true;
      }
    };

    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("mousedown", handleClick);

    // Animation Loop
    const clock = new THREE.Clock();
    const color = new THREE.Color();

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      if (gameStateRef.current === "PLAYING") {
        waterLevelRef.current += FLOOD_SPEED;
        const currentWaterLevel = waterLevelRef.current;
        const timeVal = Math.sin(time) * 0.1;

        outerWater.position.y = currentWaterLevel + timeVal;

        // Flood Logic
        const tiles = tilesRef.current;
        const flooded = new Set<number>();
        const queue: number[] = [];

        tiles.forEach((t) => {
          t.isFlooded = false;
          if (t.type !== "WALL") {
            if (
              t.gridX === 0 ||
              t.gridX === GRID_SIZE - 1 ||
              t.gridZ === 0 ||
              t.gridZ === GRID_SIZE - 1
            ) {
              if (t.height < currentWaterLevel) {
                flooded.add(t.id);
                queue.push(t.id);
              }
            }
          }
        });

        while (queue.length > 0) {
          const id = queue.shift()!;
          const t = tiles[id];
          t.isFlooded = true;

          const neighbors = [
            tiles.find(
              (n) => n && n.gridX === t.gridX + 1 && n.gridZ === t.gridZ
            ),
            tiles.find(
              (n) => n && n.gridX === t.gridX - 1 && n.gridZ === t.gridZ
            ),
            tiles.find(
              (n) => n && n.gridX === t.gridX && n.gridZ === t.gridZ + 1
            ),
            tiles.find(
              (n) => n && n.gridX === t.gridX && n.gridZ === t.gridZ - 1
            ),
          ];

          for (const n of neighbors) {
            if (
              n &&
              !flooded.has(n.id) &&
              n.type !== "WALL" &&
              n.height < currentWaterLevel
            ) {
              flooded.add(n.id);
              queue.push(n.id);
            }
          }
        }

        // Visuals
        let currentFloodedCount = 0;

        // Reset Inner Water
        for (let i = 0; i < tileCount; i++) {
          dummy.rotation.set(0, 0, 0); // 기본 회전 초기화
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          innerWaterMesh.setMatrixAt(i, dummy.matrix);
        }

        tiles.forEach((t) => {
          // Building Color
          if (t.isFlooded && t.type === "BUILDING") {
            currentFloodedCount++;
            buildingMesh.setColorAt(
              t.instanceId,
              color.setHex(PALETTE.buildingFlooded)
            );
          } else if (t.type === "BUILDING") {
            buildingMesh.setColorAt(
              t.instanceId,
              color.setHex(PALETTE.building)
            );
          }

          // Water Visual
          if (t.isFlooded && t.type !== "WALL") {
            // [주의] 물을 그리기 위해 dummy를 회전시킴 -> handleClick에서 이를 초기화해야 함
            dummy.rotation.set(-Math.PI / 2, 0, 0);
            dummy.position.set(t.x, currentWaterLevel + timeVal, t.z);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            innerWaterMesh.setMatrixAt(t.id, dummy.matrix);
          }
        });

        buildingMesh.instanceColor!.needsUpdate = true;
        innerWaterMesh.instanceMatrix.needsUpdate = true;

        if (currentFloodedCount !== floodedCountRef.current) {
          floodedCountRef.current = currentFloodedCount;
          setFloodedCount(currentFloodedCount);
        }

        // Update Water Level Display (Throttled roughly)
        if (Math.random() < 0.1) {
          setWaterLevelDisplay(currentWaterLevel);
        }

        // Win/Loss Check
        if (currentFloodedCount > buildingCount * 0.7) {
          gameStateRef.current = "GAME_OVER";
          setGameState("GAME_OVER");
        } else if (currentWaterLevel >= WIN_WATER_LEVEL) {
          gameStateRef.current = "VICTORY";
          setGameState("VICTORY");
        }
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

    const container = containerRef.current;
    return () => {
      window.removeEventListener("resize", handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener("mousemove", handleMouseMove);
        renderer.domElement.removeEventListener("mousedown", handleClick);
      }
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);

      // Dispose of resources first
      planeGeo.dispose();
      planeMat.dispose();
      oceanGeo.dispose();
      innerWaterGeo.dispose();
      waterMat.dispose();
      boxGeo.dispose();
      ghostGeo.dispose();
      ghostMat.dispose();
      buildingMat.dispose();
      groundMat.dispose();
      wallMat.dispose();

      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();

      if (container && renderer.domElement)
        container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <Container ref={containerRef}>
      <MinimalUI>
        <StatItem>ENERGY: {energy}</StatItem>
        <StatItem $danger={floodedCount > 0}>
          FLOODED: {floodedCount} / {Math.floor(totalBuildings * 0.7)}
        </StatItem>
        <StatItem>LEVEL: {(waterLevelDisplay + 1.5).toFixed(2)}m</StatItem>

        {gameState === "PLAYING" && <Guide>Click to build Sea Wall</Guide>}

        {gameState === "GAME_OVER" && (
          <>
            <StatusText $color="#ff4444">CITY LOST</StatusText>
            <TextButton onClick={() => window.location.reload()}>
              TRY AGAIN
            </TextButton>
          </>
        )}

        {gameState === "VICTORY" && (
          <>
            <StatusText $color="#00ffaa">CITY SAVED</StatusText>
            <TextButton onClick={() => window.location.reload()}>
              PLAY AGAIN
            </TextButton>
          </>
        )}
      </MinimalUI>
    </Container>
  );
};

// Styles
const Container = styled.div`
  width: 100%;
  height: calc(100vh - ${HEADER_HEIGHT}px);
  background: #050510;
  overflow: hidden;
  position: relative; /* For absolute canvas and sticky UI */
`;

const MinimalUI = styled.div`
  position: sticky;
  top: 30px;
  left: 30px;
  width: fit-content;
  display: flex;
  flex-direction: column;
  gap: 15px;
  font-family: "Inter", sans-serif;
  color: #fff;
  user-select: none;
  pointer-events: none;
  z-index: 10;
  padding: 20px; /* Add padding to ensure it's not too close to edge */
`;

const StatItem = styled.div<{ $danger?: boolean }>`
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: ${(props) => (props.$danger ? "#ff4444" : "#ffffff")};
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
`;

const Guide = styled.div`
  font-size: 0.8rem;
  color: #aaa;
  margin-top: 10px;
`;

const StatusText = styled.div<{ $color: string }>`
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 2px;
  color: ${(props) => props.$color};
  margin-top: 20px;
  text-shadow: 0 0 10px ${(props) => props.$color};
`;

const TextButton = styled.button`
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1rem;
  font-weight: bold;
  text-align: left;
  padding: 0;
  cursor: pointer;
  pointer-events: auto;
  text-decoration: underline;
  opacity: 0.8;
  transition: opacity 0.2s;
  &:hover {
    opacity: 1;
    color: #00ffaa;
  }
`;

export default SeaLevelDefenseFinal;
