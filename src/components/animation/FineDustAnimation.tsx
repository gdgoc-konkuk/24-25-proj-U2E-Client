import { useEffect, useRef } from "react";
import styled from "styled-components";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HEADER_HEIGHT } from "../../constants/layout";

// Performance detection and quality scaling
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
    particles: 1500,
    buildings: 20,
    shadowSize: 512,
    dpr: 1,
  },
  MEDIUM: {
    particles: 4000,
    buildings: 40,
    shadowSize: 1024,
    dpr: 1.5,
  },
  HIGH: {
    particles: 8000,
    buildings: 60,
    shadowSize: 2048,
    dpr: 2,
  },
};

const PARTICLE_COUNT = QUALITY_SETTINGS[QUALITY].particles;
const BUILDING_COUNT = QUALITY_SETTINGS[QUALITY].buildings;
const SHADOW_SIZE = QUALITY_SETTINGS[QUALITY].shadowSize;
const DPR = QUALITY_SETTINGS[QUALITY].dpr;

const FineDustAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, isDown: false });
  const timeRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    // Use a murky yellow-gray fog for fine dust atmosphere
    const fogColor = new THREE.Color(0x9e9375);
    scene.background = fogColor;
    scene.fog = new THREE.FogExp2(fogColor.getHex(), 0.04);

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    // 45-degree top-down view
    camera.position.set(15, 15, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: QUALITY !== "LOW",
      alpha: false,
      powerPreference: "high-performance",
      stencil: false,
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
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Don't go below ground
    controls.target.set(0, 0, 0);
    controls.enableZoom = false;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffaa33, 1.5); // Orange-ish sun
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
      dirLight.shadow.bias = -0.0005;
    }
    scene.add(dirLight);

    // Mouse Light (Flashlight effect)
    const mouseLight = new THREE.PointLight(0xffffff, 2, 10);
    mouseLight.castShadow = false;
    scene.add(mouseLight);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Buildings (InstancedMesh) - City Block Layout
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMat = new THREE.MeshStandardMaterial({
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
    const colors = new Float32Array(BUILDING_COUNT * 3);

    // Grid layout for buildings
    const gridSize = Math.ceil(Math.sqrt(BUILDING_COUNT));
    const spacing = 3;
    const offset = (gridSize * spacing) / 2;

    for (let i = 0; i < BUILDING_COUNT; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;

      const x = col * spacing - offset + (Math.random() - 0.5) * 1;
      const z = row * spacing - offset + (Math.random() - 0.5) * 1;

      // Skip center area for camera view
      if (Math.abs(x) < 4 && Math.abs(z) < 4) {
        // Move this building to the outskirts
        dummy.position.set(x + (x > 0 ? 10 : -10), 0, z + (z > 0 ? 10 : -10));
      } else {
        dummy.position.set(x, 0, z);
      }

      const height = 2 + Math.random() * 8;
      const width = 1 + Math.random() * 1.5;
      const depth = 1 + Math.random() * 1.5;

      dummy.position.y = height / 2;
      dummy.scale.set(width, height, depth);
      dummy.updateMatrix();
      buildings.setMatrixAt(i, dummy.matrix);

      // Grayish building colors
      const shade = 0.2 + Math.random() * 0.3;
      const color = new THREE.Color(shade, shade, shade);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    buildings.instanceMatrix.needsUpdate = true;
    buildings.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    scene.add(buildings);

    // Dust Particles
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    const particleSizes = new Float32Array(PARTICLE_COUNT);
    const particleData: {
      velocity: THREE.Vector3;
      initialPos: THREE.Vector3;
    }[] = [];

    const spread = 30;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * spread;
      const y = Math.random() * 15;
      const z = (Math.random() - 0.5) * spread;

      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;

      particleSizes[i] = Math.random() * 0.2 + 0.05;

      particleData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        initialPos: new THREE.Vector3(x, y, z),
      });
    }

    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    particleGeo.setAttribute(
      "size",
      new THREE.BufferAttribute(particleSizes, 1)
    );

    // Custom shader material for better performance and look could be used,
    // but PointsMaterial is sufficient for this style.
    const particleMat = new THREE.PointsMaterial({
      size: 0.1,
      color: 0xd2c2a8,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
      depthWrite: false, // Important for transparency
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Mouse Events
    const handlePointerMove = (e: PointerEvent) => {
      mouseRef.current.x = e.offsetX;
      mouseRef.current.y = e.offsetY;
    };

    renderer.domElement.addEventListener("pointermove", handlePointerMove);

    // Animation Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.01;

      // Update Particles
      const positions = particleGeo.attributes.position.array as Float32Array;

      // Mouse interaction raycaster
      const mouseVector = new THREE.Vector3(
        (mouseRef.current.x / renderer.domElement.clientWidth) * 2 - 1,
        -(mouseRef.current.y / renderer.domElement.clientHeight) * 2 + 1,
        0.5
      );
      mouseVector.unproject(camera);
      const dir = mouseVector.sub(camera.position).normalize();
      const distance = -camera.position.y / dir.y;
      const targetPos = camera.position
        .clone()
        .add(dir.multiplyScalar(distance));

      // Update mouse light position
      mouseLight.position.copy(targetPos).add(new THREE.Vector3(0, 2, 0));

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pData = particleData[i];
        const px = positions[i * 3];
        const py = positions[i * 3 + 1];
        const pz = positions[i * 3 + 2];

        // 1. Natural Flow (Simplex-like noise simulation)
        const noiseX = Math.sin(py * 0.5 + timeRef.current * 0.5) * 0.02;
        const noiseZ = Math.cos(px * 0.5 + timeRef.current * 0.3) * 0.02;

        pData.velocity.x += noiseX * 0.1;
        pData.velocity.z += noiseZ * 0.1;
        pData.velocity.y += Math.sin(timeRef.current + px) * 0.002; // Gentle floating

        // 2. Interaction: Vortex/Swirl around mouse
        const dx = px - targetPos.x;
        const dz = pz - targetPos.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < 25) {
          // Increased radius of influence
          const dist = Math.sqrt(distSq);
          const force = (5 - dist) * 0.01;

          // Tangential force (Vortex)
          pData.velocity.x += -dz * force * 2; // Rotate
          pData.velocity.z += dx * force * 2;

          // Inward force (Suction)
          pData.velocity.x -= dx * force * 0.5;
          pData.velocity.z -= dz * force * 0.5;

          pData.velocity.y += 0.005; // Slight lift
        }

        // Apply velocity
        positions[i * 3] += pData.velocity.x;
        positions[i * 3 + 1] += pData.velocity.y;
        positions[i * 3 + 2] += pData.velocity.z;

        // Damping
        pData.velocity.multiplyScalar(0.96);

        // Boundary check & Reset
        if (
          positions[i * 3 + 1] > 15 ||
          positions[i * 3 + 1] < 0 ||
          Math.abs(positions[i * 3]) > 20 ||
          Math.abs(positions[i * 3 + 2]) > 20
        ) {
          // Reset to random position near bottom or top
          positions[i * 3] = (Math.random() - 0.5) * spread;
          positions[i * 3 + 1] = Math.random() * 5;
          positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
          pData.velocity.set(0, 0, 0);
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

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
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      controls.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      buildingGeo.dispose();
      buildingMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <Container ref={containerRef} />;
};

const Container = styled.div`
  width: 100%;
  height: calc(100vh - ${HEADER_HEIGHT}px);
  position: relative;
  overflow: hidden;
  cursor: default;
  background: #9e9375;
`;

export default FineDustAnimation;
