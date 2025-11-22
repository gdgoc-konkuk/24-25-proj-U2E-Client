import { useEffect, useRef } from "react";
import styled from "styled-components";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

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
    particles: 1000,
    buildings: 15,
    shadowSize: 512,
    dpr: 1,
  },
  MEDIUM: {
    particles: 3000,
    buildings: 25,
    shadowSize: 1024,
    dpr: 1.5,
  },
  HIGH: {
    particles: 5000,
    buildings: 30,
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

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene Setup
    const scene = new THREE.Scene();
    // Fog color matching the original component
    scene.fog = new THREE.FogExp2(0xc9b99b, 0.08);

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 12);

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
    containerRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = 3;
    controls.maxDistance = 25;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2.2;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(10, 15, 8);
    dirLight.castShadow = QUALITY !== "LOW";
    if (QUALITY !== "LOW") {
      dirLight.shadow.mapSize.width = SHADOW_SIZE;
      dirLight.shadow.mapSize.height = SHADOW_SIZE;
      dirLight.shadow.camera.far = 30;
      dirLight.shadow.camera.left = -15;
      dirLight.shadow.camera.right = 15;
      dirLight.shadow.camera.top = 15;
      dirLight.shadow.camera.bottom = -15;
    }
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0xffeaa7, 0x636e72, 0.4);
    scene.add(hemiLight);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Buildings (InstancedMesh)
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMat = new THREE.MeshStandardMaterial({
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
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

    // Viewport approximation for building placement
    // At z=0, visible width is approx: 2 * tan(30deg) * 12 ~= 13.8
    const viewportWidth = 14;

    for (let i = 0; i < BUILDING_COUNT; i++) {
      const x = (Math.random() - 0.5) * viewportWidth * 0.7;
      const z = (Math.random() - 0.5) * (viewportWidth / 5);
      const height = 1 + Math.random() * 8;
      const width = 0.5 + Math.random() * 1;
      const depth = 0.5 + Math.random() * 1;
      const darkness = 0.3 + Math.random() * 0.2;

      dummy.position.set(x, height / 2, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(width, height, depth);
      dummy.updateMatrix();
      buildings.setMatrixAt(i, dummy.matrix);

      const color = new THREE.Color(
        darkness * 0.5,
        darkness * 0.5,
        darkness * 0.6
      );
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    buildings.instanceMatrix.needsUpdate = true;
    buildings.geometry.setAttribute(
      "color",
      new THREE.InstancedBufferAttribute(colors, 3)
    );
    // Note: InstancedMesh standard material uses 'color' attribute for instance colors if vertexColors is true?
    // Actually for InstancedMesh, we usually use instanceColor attribute.
    // Let's fix this to match the original code which used 'instanceColor'
    buildings.geometry.setAttribute(
      "instanceColor",
      new THREE.InstancedBufferAttribute(colors, 3)
    );

    scene.add(buildings);

    // Dust Particles
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    const particleData: { velocity: THREE.Vector3 }[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * viewportWidth * 1.2;
      const y = Math.random() * 10;
      const z = (Math.random() - 0.5) * viewportWidth * 1.2;

      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;

      particleData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01
        ),
      });
    }

    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMat = new THREE.PointsMaterial({
      size: 0.03,
      color: 0xd2c2a8,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Mouse Events
    const handlePointerDown = (e: PointerEvent) => {
      e.stopPropagation();
      mouseRef.current.isDown = true;
    };
    const handlePointerUp = (e: PointerEvent) => {
      e.stopPropagation();
      mouseRef.current.isDown = false;
    };
    const handlePointerMove = (e: PointerEvent) => {
      if ((e.buttons & 1) === 1) {
        mouseRef.current.x = e.offsetX;
        mouseRef.current.y = e.offsetY;
      }
    };
    const handlePointerLeave = () => {
      mouseRef.current.isDown = false;
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);

    // Animation Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Update Particles
      const positions = particleGeo.attributes.position.array as Float32Array;
      const mouse3D = new THREE.Vector3(
        (mouseRef.current.x / renderer.domElement.clientWidth) * 2 - 1,
        -(mouseRef.current.y / renderer.domElement.clientHeight) * 2 + 1,
        0
      ).unproject(camera);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const pData = particleData[i];
        const px = positions[i * 3];
        const py = positions[i * 3 + 1];
        const pz = positions[i * 3 + 2];
        const pPos = new THREE.Vector3(px, py, pz);

        if (mouseRef.current.isDown) {
          const dist = pPos.distanceTo(mouse3D);
          if (dist < 3) {
            const vortexForce = 0.05;
            const toMouse = new THREE.Vector3()
              .subVectors(mouse3D, pPos)
              .normalize();
            const vortex = new THREE.Vector3(
              -toMouse.y,
              toMouse.x,
              0
            ).multiplyScalar(vortexForce);
            pData.velocity.add(vortex);
          }
        }

        pData.velocity.multiplyScalar(0.95); // Damping
        pPos.add(pData.velocity);

        if (pPos.y < -1) pPos.y = 10;

        positions[i * 3] = pPos.x;
        positions[i * 3 + 1] = pPos.y;
        positions[i * 3 + 2] = pPos.z;
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
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener(
        "pointerleave",
        handlePointerLeave
      );

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

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <Container ref={containerRef}>
      <Instruction>
        마우스를 드래그하여 먼지 소용돌이 생성
        <br />
        드래그하여 카메라 시점 회전
      </Instruction>
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
`;

const Instruction = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  background-color: rgba(0, 0, 0, 0.4);
  padding: 5px 10px;
  border-radius: 5px;
  font-family: sans-serif;
  pointer-events: none;
  text-align: center;
  z-index: 10;
`;

export default FineDustAnimation;
