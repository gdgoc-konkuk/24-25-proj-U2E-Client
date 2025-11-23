import { useRef, useEffect } from "react";
import styled from "styled-components";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HEADER_HEIGHT } from "../../constants/layout";

interface WaterDrop {
  position: THREE.Vector3;
  age: number;
  radius: number;
}

// [Optimization 1] Reduce resolution: 180 -> 90 (Vertex count reduced by 4x)
const SEGMENTS = 90;

const DroughtAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const waterDropsRef = useRef<WaterDrop[]>([]);
  const droughtProgressRef = useRef(0);
  const frameCountRef = useRef(0); // [Optimization] Counter for throttling

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 20, 60);

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 12, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance", // [Optimization] Request high performance
    });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = 8;
    controls.maxDistance = 35;
    controls.enableZoom = false;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffddaa, 1.0);
    sunLight.position.set(10, 20, 5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    scene.add(sunLight);

    // Ground with optimized segments
    const groundSize = 18;
    const groundGeometry = new THREE.PlaneGeometry(
      groundSize,
      groundSize,
      SEGMENTS,
      SEGMENTS
    );
    const vertices = groundGeometry.attributes.position.array;
    const vertexCount = vertices.length / 3;

    // Create broccoli-like bumpy forest terrain
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];

      const largeNoise = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.8;
      const mediumNoise = Math.sin(x * 0.8) * Math.cos(y * 0.8) * 0.5;
      const smallNoise = Math.sin(x * 2) * Math.cos(y * 2) * 0.3;
      const tinyNoise = Math.random() * 0.4;

      vertices[i + 2] = largeNoise + mediumNoise + smallNoise + tinyNoise;
    }
    groundGeometry.attributes.position.needsUpdate = true;
    groundGeometry.computeVertexNormals();

    // Store original heights using Float32Array
    const originalHeights = new Float32Array(vertexCount);
    for (let i = 0; i < vertices.length; i += 3) {
      originalHeights[i / 3] = vertices[i + 2];
    }

    // Vertex colors
    const colors = new Float32Array(vertices.length);
    for (let i = 0; i < colors.length; i += 3) {
      const variation = Math.random() * 0.08;
      colors[i] = 0.15 + variation;
      colors[i + 1] = 0.5 + variation;
      colors[i + 2] = 0.1 + variation;
    }
    groundGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const groundMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.castShadow = true;
    scene.add(ground);
    ground.userData.originalHeights = originalHeights;

    // Pre-compute crack patterns
    const crackSeeds: Array<{ x: number; y: number }> = [];
    const seedCount = 40;
    for (let i = 0; i < seedCount; i++) {
      const angle = i * 2.4 + Math.sin(i * 0.7) * 10;
      const radius = (Math.sin(i * 1.3) * 0.5 + 0.5) * 9;
      crackSeeds.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    const crackIntensities = new Float32Array(vertexCount);
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];

      let minDist1 = Infinity;
      let minDist2 = Infinity;

      for (const seed of crackSeeds) {
        const dx = x - seed.x;
        const dy = y - seed.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist < minDist1) {
          minDist2 = minDist1;
          minDist1 = dist;
        } else if (dist < minDist2) {
          minDist2 = dist;
        }
      }

      const edgeDistance = minDist2 - minDist1;

      if (edgeDistance < 0.15) {
        const crackIntensity = 1 - edgeDistance / 0.15;
        crackIntensities[i / 3] = crackIntensity * crackIntensity;
      }
    }
    ground.userData.crackIntensities = crackIntensities;

    // Particles
    const particleCount = 2000;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 35;
      particlePositions[i * 3 + 1] = Math.random() * 5;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 35;
      particleVelocities.push(Math.random() * 0.02 + 0.005);
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xd4a574,
      size: 0.15,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    particles.userData.velocities = particleVelocities;

    // Water puddles group
    const waterPuddles = new THREE.Group();
    scene.add(waterPuddles);

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(ground);

      if (intersects.length > 0) {
        const worldPoint = intersects[0].point;
        const localPoint = ground.worldToLocal(worldPoint.clone());

        // Logical water drop for terrain deformation
        waterDropsRef.current.push({
          position: localPoint.clone(),
          age: 0,
          radius: 0,
        });

        // Visual Effect 1: Splash Ring
        const splashGeometry = new THREE.CircleGeometry(0.15, 32);
        const splashMaterial = new THREE.MeshBasicMaterial({
          color: 0x4da6ff,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        });
        const splash = new THREE.Mesh(splashGeometry, splashMaterial);
        splash.position.copy(worldPoint);
        splash.position.y += 0.08;
        splash.rotation.x = -Math.PI / 2;

        // Store animation state in userData
        splash.userData = {
          type: "splash",
          scale: 0.1,
          opacity: 0.9,
        };
        waterPuddles.add(splash);

        // Visual Effect 2: Water Droplets
        for (let i = 0; i < 30; i++) {
          const dropletGeometry = new THREE.SphereGeometry(0.06, 8, 8);
          const dropletMaterial = new THREE.MeshStandardMaterial({
            color: 0x4da6ff,
            transparent: true,
            opacity: 0.8,
          });
          const droplet = new THREE.Mesh(dropletGeometry, dropletMaterial);
          droplet.position.copy(worldPoint);
          droplet.position.y += 2;

          // Random velocity
          const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.15,
            -0.15,
            (Math.random() - 0.5) * 0.15
          );

          droplet.userData = {
            type: "droplet",
            velocity: velocity,
            opacity: 0.8,
          };
          waterPuddles.add(droplet);
        }
      }
    };

    renderer.domElement.addEventListener("click", handleClick);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.01;
      frameCountRef.current += 1;

      // Drought
      droughtProgressRef.current = Math.min(
        droughtProgressRef.current + 0.0033,
        1
      );
      const drought = droughtProgressRef.current;

      // Sky
      const skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0x87ceeb),
        new THREE.Color(0xd4a574),
        drought
      );
      scene.background = skyColor;
      scene.fog = new THREE.Fog(skyColor.getHex(), 20, 60);

      sunLight.intensity = 1.0 + drought * 1.5;

      // Particles update
      const pPos = particleGeometry.attributes.position.array as Float32Array;
      const pVel = particles.userData.velocities as number[];

      for (let i = 0; i < particleCount; i++) {
        pPos[i * 3 + 1] += pVel[i] * drought * 3;
        pPos[i * 3] += Math.sin(timeRef.current + i) * 0.003 * drought;
        pPos[i * 3 + 2] +=
          Math.cos(timeRef.current + i * 0.5) * 0.003 * drought;

        if (pPos[i * 3 + 1] > 15) {
          pPos[i * 3 + 1] = 0;
          pPos[i * 3] = (Math.random() - 0.5) * 35;
          pPos[i * 3 + 2] = (Math.random() - 0.5) * 35;
        }
      }
      particleGeometry.attributes.position.needsUpdate = true;
      particleMaterial.opacity = Math.min(drought * 0.8, 0.7);

      // Update logical water drops
      waterDropsRef.current = waterDropsRef.current.filter((drop) => {
        drop.age += 0.016;
        drop.radius = Math.min(drop.radius + 0.15, 6);
        return drop.age < 2;
      });

      // Update visual water effects (Splashes & Droplets)
      // Iterate backwards to safely remove items
      for (let i = waterPuddles.children.length - 1; i >= 0; i--) {
        const obj = waterPuddles.children[i] as THREE.Mesh;
        const data = obj.userData;

        if (data.type === "splash") {
          data.scale += 0.2;
          data.opacity -= 0.025;

          obj.scale.set(data.scale, data.scale, 1);
          (obj.material as THREE.MeshBasicMaterial).opacity = data.opacity;

          if (data.opacity <= 0) {
            waterPuddles.remove(obj);
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
          }
        } else if (data.type === "droplet") {
          obj.position.add(data.velocity);
          data.velocity.y -= 0.01; // Gravity
          data.opacity -= 0.025;

          (obj.material as THREE.MeshStandardMaterial).opacity = data.opacity;

          if (obj.position.y <= 0 || data.opacity <= 0) {
            waterPuddles.remove(obj);
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
          }
        }
      }

      // Ground update
      const geoColors = groundGeometry.attributes.color.array as Float32Array;
      const geoPositions = groundGeometry.attributes.position
        .array as Float32Array;

      // Bounding Box for water
      const hasWater = waterDropsRef.current.length > 0;
      let minWaterX = Infinity,
        maxWaterX = -Infinity,
        minWaterY = Infinity,
        maxWaterY = -Infinity;
      if (hasWater) {
        for (const drop of waterDropsRef.current) {
          minWaterX = Math.min(minWaterX, drop.position.x - drop.radius);
          maxWaterX = Math.max(maxWaterX, drop.position.x + drop.radius);
          minWaterY = Math.min(minWaterY, drop.position.y - drop.radius);
          maxWaterY = Math.max(maxWaterY, drop.position.y + drop.radius);
        }
      }

      // Constants
      const healthyR = 0.15,
        healthyG = 0.5,
        healthyB = 0.1;
      const dryR = 0.75,
        dryG = 0.6,
        dryB = 0.35;
      const waterGreenR = 0.1,
        waterGreenG = 0.6,
        waterGreenB = 0.05;

      const baseTargetR = THREE.MathUtils.lerp(healthyR, dryR, drought);
      const baseTargetG = THREE.MathUtils.lerp(healthyG, dryG, drought);
      const baseTargetB = THREE.MathUtils.lerp(healthyB, dryB, drought);

      for (let i = 0; i < vertexCount; i++) {
        const posIndex = i * 3;
        const x = geoPositions[posIndex];
        const y = geoPositions[posIndex + 1];

        let targetR = baseTargetR;
        let targetG = baseTargetG;
        let targetB = baseTargetB;

        const originalHeight = originalHeights[i];
        let targetHeight = originalHeight * (1 - drought);

        // Crack
        const crackIntensity = crackIntensities[i];
        if (drought > 0.3 && crackIntensity > 0) {
          const droughtCrackFactor = Math.max(0, (drought - 0.3) / 0.7);
          const crackFactor = crackIntensity * droughtCrackFactor * 0.6;

          targetHeight -= crackFactor;
          const darkenFactor = 1 - crackFactor;
          targetR *= darkenFactor;
          targetG *= darkenFactor;
          targetB *= darkenFactor;
        }

        // Water Effects
        if (
          hasWater &&
          x >= minWaterX &&
          x <= maxWaterX &&
          y >= minWaterY &&
          y <= maxWaterY
        ) {
          let maxWaterEffect = 0;
          for (const drop of waterDropsRef.current) {
            const dx = x - drop.position.x;
            const dy = y - drop.position.y;
            const distSq = dx * dx + dy * dy;
            const radiusSq = drop.radius * drop.radius;

            if (distSq < radiusSq) {
              const dist = Math.sqrt(distSq);
              const effect = (1 - dist / drop.radius) * (1 - drop.age / 2);
              if (effect > maxWaterEffect) maxWaterEffect = effect;
            }
          }

          if (maxWaterEffect > 0) {
            targetR += (waterGreenR - targetR) * maxWaterEffect;
            targetG += (waterGreenG - targetG) * maxWaterEffect;
            targetB += (waterGreenB - targetB) * maxWaterEffect;
            targetHeight +=
              (originalHeight * 1.3 - targetHeight) * maxWaterEffect;
          }
        }

        const colorIndex = i * 3;
        geoColors[colorIndex] += (targetR - geoColors[colorIndex]) * 0.05;
        geoColors[colorIndex + 1] +=
          (targetG - geoColors[colorIndex + 1]) * 0.05;
        geoColors[colorIndex + 2] +=
          (targetB - geoColors[colorIndex + 2]) * 0.05;

        geoPositions[posIndex + 2] +=
          (targetHeight - geoPositions[posIndex + 2]) * 0.05;
      }

      groundGeometry.attributes.color.needsUpdate = true;
      groundGeometry.attributes.position.needsUpdate = true;

      // [Optimization 2] Throttle normal updates (every 3 frames)
      if (frameCountRef.current % 3 === 0) {
        groundGeometry.computeVertexNormals();
      }

      groundMaterial.roughness = 0.9 + drought * 0.1;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

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
    return () => {
      window.removeEventListener("resize", handleResize);
      if (container) {
        container.removeEventListener("click", handleClick);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Dispose of visual effects
      waterPuddles.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        }
      });
      scene.remove(waterPuddles);

      // Dispose of main objects
      controls.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();

      // Dispose of scene
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });

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
  height: calc(100vh - ${HEADER_HEIGHT}px);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background: #87ceeb;
`;

export default DroughtAnimation;
