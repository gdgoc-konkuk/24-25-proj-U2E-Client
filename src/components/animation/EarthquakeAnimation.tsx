import { useEffect, useRef } from "react";
import styled from "styled-components";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Performance detection
const detectDevicePerformance = () => {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") as WebGLRenderingContext;
  if (!gl) return "LOW";

  const renderer = gl.getParameter(gl.RENDERER) as string;
  const isMobile =
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  const isLowEndMobile =
    isMobile &&
    (navigator.hardwareConcurrency <= 4 || window.devicePixelRatio <= 2);

  if (
    isLowEndMobile ||
    renderer.includes("Adreno 3") ||
    renderer.includes("Mali-4")
  ) {
    return "LOW";
  } else if (
    isMobile ||
    renderer.includes("Adreno 5") ||
    renderer.includes("Mali-G")
  ) {
    return "MEDIUM";
  }
  return "HIGH";
};

const QUALITY = detectDevicePerformance();
const QUALITY_SETTINGS = {
  LOW: {
    buildings: 20,
    segments: 32,
    shadowSize: 512,
    dpr: 1,
  },
  MEDIUM: {
    buildings: 50,
    segments: 48,
    shadowSize: 1024,
    dpr: 1.5,
  },
  HIGH: {
    buildings: 100,
    segments: 64,
    shadowSize: 2048,
    dpr: 2,
  },
};

const BUILDING_COUNT = QUALITY_SETTINGS[QUALITY].buildings;
const SEGMENTS = QUALITY_SETTINGS[QUALITY].segments;
const SHADOW_SIZE = QUALITY_SETTINGS[QUALITY].shadowSize;
const DPR = QUALITY_SETTINGS[QUALITY].dpr;

interface Shockwave {
  x: number;
  z: number;
  startTime: number;
  id: number;
}

const EarthquakeAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const nextShockwaveId = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2c3e50);
    scene.fog = new THREE.Fog(0x2c3e50, 10, 50);

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    // 45-degree top-down view
    camera.position.set(0, 20, 19);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: QUALITY !== "LOW",
      powerPreference: "high-performance",
    });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR));
    renderer.shadowMap.enabled = QUALITY !== "LOW";
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.minDistance = 5;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controls.target.set(0, 0, 0);
    controls.enableZoom = false;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = QUALITY !== "LOW";
    if (QUALITY !== "LOW") {
      dirLight.shadow.mapSize.width = SHADOW_SIZE;
      dirLight.shadow.mapSize.height = SHADOW_SIZE;
      dirLight.shadow.camera.far = 50;
      dirLight.shadow.camera.left = -20;
      dirLight.shadow.camera.right = 20;
      dirLight.shadow.camera.top = 20;
      dirLight.shadow.camera.bottom = -20;
    }
    scene.add(dirLight);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(50, 50, SEGMENTS, SEGMENTS);
    // Store original positions for deformation
    const originalPositions = groundGeo.attributes.position.array.slice();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x34495e,
      roughness: 0.8,
      metalness: 0.2,
      flatShading: true, // Low-poly look
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Buildings
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x95a5a6,
      roughness: 0.7,
      metalness: 0.1,
    });
    const buildings = new THREE.InstancedMesh(
      buildingGeo,
      buildingMat,
      BUILDING_COUNT
    );
    buildings.castShadow = QUALITY !== "LOW";
    buildings.receiveShadow = QUALITY !== "LOW";

    const dummy = new THREE.Object3D();
    const buildingData: {
      x: number;
      z: number;
      height: number;
      scale: THREE.Vector3;
    }[] = [];

    // Generate buildings
    const gridSize = Math.ceil(Math.sqrt(BUILDING_COUNT));
    const spacing = 4;
    const offset = (gridSize * spacing) / 2;

    for (let i = 0; i < BUILDING_COUNT; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;

      const x = col * spacing - offset + (Math.random() - 0.5) * 2;
      const z = row * spacing - offset + (Math.random() - 0.5) * 2;

      const height = 2 + Math.random() * 6;
      const width = 1 + Math.random() * 1.5;
      const depth = 1 + Math.random() * 1.5;

      dummy.position.set(x, height / 2, z);
      dummy.scale.set(width, height, depth);
      dummy.updateMatrix();
      buildings.setMatrixAt(i, dummy.matrix);

      buildingData.push({
        x,
        z,
        height,
        scale: new THREE.Vector3(width, height, depth),
      });
    }
    buildings.instanceMatrix.needsUpdate = true;
    scene.add(buildings);

    // Raycaster for interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(ground);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        shockwavesRef.current.push({
          x: point.x,
          z: point.z,
          startTime: performance.now(),
          id: nextShockwaveId.current++,
        });
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);

    // Animation Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const now = performance.now();

      // Filter out old shockwaves
      shockwavesRef.current = shockwavesRef.current.filter(
        (wave) => now - wave.startTime < 3000 // Lasts 3 seconds
      );

      // Update Ground
      const positions = groundGeo.attributes.position.array as Float32Array;
      const original = originalPositions as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        const x = original[i];
        const y = original[i + 1]; // Should be 0 initially (plane is flat)
        // Wait, PlaneGeometry is X-Y. We rotated it -90 deg on X.
        // So local (x, y, z) -> world (x, -z, y)? No.
        // Local vertex (x, y, 0). Rotated -90 X -> (x, 0, -y).
        // So world X = local X, world Z = -local Y.

        // Let's just work with world coordinates.
        // The loop iterates over vertices.
        // Since we rotated the mesh, we need to be careful.
        // Easier approach: Modify Z (height) of PlaneGeometry, which corresponds to Y in world space after rotation?
        // No, PlaneGeometry is defined in XY plane. Z is normal.
        // We rotated X by -90. So Plane's Z axis points to World +Y? No, World -Z?
        // Let's simplify: We modify the 'Z' attribute of the geometry, which creates height variations.
        // Since we rotated the mesh, the geometry's Z axis aligns with World Y (or -Y).

        let displacement = 0;

        // Calculate world position of this vertex
        // Local: (x, y, 0)
        // World: (x, 0, y) roughly (ignoring sign for now)

        // Actually, let's just use the vertex coordinates as X and Z in world space logic
        // because the plane is centered and covers XZ.
        const vx = x;
        const vz = -y; // Because of rotation

        for (const wave of shockwavesRef.current) {
          const dx = vx - wave.x;
          const dz = vz - wave.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const time = (now - wave.startTime) / 1000;

          const waveSpeed = 10;
          const waveDist = time * waveSpeed;
          const waveWidth = 2;

          if (Math.abs(dist - waveDist) < waveWidth) {
            // Inside the wave ring
            const intensity = 1 - time / 3; // Decay over time
            const waveFunc =
              Math.sin((dist - waveDist) * 2 * Math.PI) *
              Math.exp(-Math.abs(dist - waveDist));
            displacement += waveFunc * intensity * 0.5;
          }
        }

        positions[i + 2] = displacement; // Modify Z (which is World Y)
      }
      groundGeo.attributes.position.needsUpdate = true;
      groundGeo.computeVertexNormals(); // Recompute for lighting

      // Update Buildings
      for (let i = 0; i < BUILDING_COUNT; i++) {
        const bData = buildingData[i];

        let shakeX = 0;
        let shakeZ = 0;
        let shakeRot = 0;

        for (const wave of shockwavesRef.current) {
          const dx = bData.x - wave.x;
          const dz = bData.z - wave.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const time = (now - wave.startTime) / 1000;

          const waveSpeed = 10;
          const waveDist = time * waveSpeed;
          const waveWidth = 3; // Buildings shake a bit longer

          if (dist < waveDist + waveWidth && dist > waveDist - waveWidth) {
            const intensity = (1 - time / 3) * 0.5;
            shakeX += (Math.random() - 0.5) * intensity;
            shakeZ += (Math.random() - 0.5) * intensity;
            shakeRot += (Math.random() - 0.5) * intensity * 0.5;
          }
        }

        dummy.position.set(
          bData.x + shakeX,
          bData.height / 2,
          bData.z + shakeZ
        );
        dummy.rotation.set(shakeRot, shakeRot, shakeRot);
        dummy.scale.copy(bData.scale);
        dummy.updateMatrix();
        buildings.setMatrixAt(i, dummy.matrix);
      }
      buildings.instanceMatrix.needsUpdate = true;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect =
        containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    };
    window.addEventListener("resize", handleResize);

    const container = containerRef.current;
    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      controls.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      buildingGeo.dispose();
      buildingMat.dispose();
      renderer.dispose();

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <Container ref={containerRef} />;
};

const Container = styled.div`
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
`;

export default EarthquakeAnimation;
