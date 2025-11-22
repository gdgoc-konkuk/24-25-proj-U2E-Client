import { useRef, useEffect } from "react";
import styled from "styled-components";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface WaterDrop {
  position: THREE.Vector3;
  age: number;
  radius: number;
}

const DroughtAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const waterDropsRef = useRef<WaterDrop[]>([]);
  const droughtProgressRef = useRef(0);

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

    // Ground with extreme broccoli-like bumpy terrain
    const groundSize = 18;
    const groundGeometry = new THREE.PlaneGeometry(
      groundSize,
      groundSize,
      180,
      180
    );
    const vertices = groundGeometry.attributes.position.array;

    // Create broccoli-like bumpy forest terrain
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];

      // Multiple layers of noise for broccoli effect
      const largeNoise = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.8;
      const mediumNoise = Math.sin(x * 0.8) * Math.cos(y * 0.8) * 0.5;
      const smallNoise = Math.sin(x * 2) * Math.cos(y * 2) * 0.3;
      const tinyNoise = Math.random() * 0.4;

      vertices[i + 2] = largeNoise + mediumNoise + smallNoise + tinyNoise;
    }
    groundGeometry.attributes.position.needsUpdate = true;
    groundGeometry.computeVertexNormals();

    // Store original heights
    const originalHeights = new Float32Array(vertices.length / 3);
    for (let i = 0; i < vertices.length; i += 3) {
      originalHeights[i / 3] = vertices[i + 2];
    }

    // Vertex colors - deep forest green
    const colors = new Float32Array(vertices.length);
    for (let i = 0; i < colors.length; i += 3) {
      const variation = Math.random() * 0.08;
      colors[i] = 0.15 + variation; // R - darker
      colors[i + 1] = 0.5 + variation; // G - deep green
      colors[i + 2] = 0.1 + variation; // B - darker
    }
    groundGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const groundMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9, // Forest texture
      metalness: 0.0,
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.castShadow = true;
    scene.add(ground);
    ground.userData.originalHeights = originalHeights;

    // Generate crack seed points using deterministic random
    const crackSeeds: Array<{ x: number; y: number }> = [];
    const seedCount = 40;
    for (let i = 0; i < seedCount; i++) {
      // Use sin/cos for deterministic random
      const angle = i * 2.4 + Math.sin(i * 0.7) * 10;
      const radius = (Math.sin(i * 1.3) * 0.5 + 0.5) * 9;
      crackSeeds.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    // Worley/Voronoi edge detection for crack lines
    const getCrackPattern = (x: number, y: number): number => {
      // Find distances to nearest seed points
      let minDist1 = Infinity;
      let minDist2 = Infinity;

      for (const seed of crackSeeds) {
        const dx = x - seed.x;
        const dy = y - seed.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist1) {
          minDist2 = minDist1;
          minDist1 = dist;
        } else if (dist < minDist2) {
          minDist2 = dist;
        }
      }

      // Crack exists at cell boundaries (where distance difference is small)
      const edgeDistance = minDist2 - minDist1;

      // Thin crack threshold
      if (edgeDistance < 0.15) {
        // Normalize to 0-1, where 1 = center of crack
        const crackIntensity = 1 - edgeDistance / 0.15;
        return crackIntensity * crackIntensity; // Square for sharper cracks
      }

      return 0;
    };

    // Dust particles
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

    // Water puddles
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

        waterDropsRef.current.push({
          position: localPoint.clone(),
          age: 0,
          radius: 0,
        });

        // Water splash
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
        waterPuddles.add(splash);

        let scale = 0.1;
        const animateSplash = () => {
          scale += 0.2;
          splash.scale.set(scale, scale, 1);
          splashMaterial.opacity -= 0.025;

          if (splashMaterial.opacity > 0) {
            requestAnimationFrame(animateSplash);
          } else {
            waterPuddles.remove(splash);
            splashGeometry.dispose();
            splashMaterial.dispose();
          }
        };
        animateSplash();

        // Water droplets
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
          waterPuddles.add(droplet);

          const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.15,
            -0.15,
            (Math.random() - 0.5) * 0.15
          );

          const animateDroplet = () => {
            droplet.position.add(velocity);
            velocity.y -= 0.01;
            dropletMaterial.opacity -= 0.025;

            if (droplet.position.y > 0 && dropletMaterial.opacity > 0) {
              requestAnimationFrame(animateDroplet);
            } else {
              waterPuddles.remove(droplet);
              dropletGeometry.dispose();
              dropletMaterial.dispose();
            }
          };
          animateDroplet();
        }
      }
    };

    renderer.domElement.addEventListener("click", handleClick);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.01;

      // 5 seconds drought
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

      // Particles
      const positions = particleGeometry.attributes.position
        .array as Float32Array;
      const velocities = particles.userData.velocities as number[];

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += velocities[i] * drought * 3;
        positions[i * 3] += Math.sin(timeRef.current + i) * 0.003 * drought;
        positions[i * 3 + 2] +=
          Math.cos(timeRef.current + i * 0.5) * 0.003 * drought;

        if (positions[i * 3 + 1] > 15) {
          positions[i * 3 + 1] = 0;
          positions[i * 3] = (Math.random() - 0.5) * 35;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 35;
        }
      }
      particleGeometry.attributes.position.needsUpdate = true;
      particleMaterial.opacity = Math.min(drought * 0.8, 0.7);

      // Update water drops (2 seconds)
      waterDropsRef.current = waterDropsRef.current.filter((drop) => {
        drop.age += 0.016;
        drop.radius = Math.min(drop.radius + 0.15, 6);
        return drop.age < 2;
      });

      // Update ground
      const colors = groundGeometry.attributes.color.array as Float32Array;
      const geoPositions = groundGeometry.attributes.position
        .array as Float32Array;
      const originalHeights = ground.userData.originalHeights as Float32Array;

      for (let i = 0; i < colors.length; i += 3) {
        const vertexIndex = i / 3;
        const posIndex = vertexIndex * 3;
        const x = geoPositions[posIndex];
        const y = geoPositions[posIndex + 1];

        // Deep forest green to dry brown
        const healthyR = 0.15;
        const healthyG = 0.5;
        const healthyB = 0.1;

        const dryR = 0.75;
        const dryG = 0.6;
        const dryB = 0.35;

        let targetR = THREE.MathUtils.lerp(healthyR, dryR, drought);
        let targetG = THREE.MathUtils.lerp(healthyG, dryG, drought);
        let targetB = THREE.MathUtils.lerp(healthyB, dryB, drought);

        // Flatten from broccoli to flat dry land
        const originalHeight = originalHeights[vertexIndex];
        let targetHeight = THREE.MathUtils.lerp(originalHeight, 0, drought);

        // Add crack pattern during drought
        const crackIntensity = getCrackPattern(x, y);
        if (drought > 0.3 && crackIntensity > 0) {
          // Cracks appear and deepen as drought progresses
          const droughtCrackFactor = Math.max(0, (drought - 0.3) / 0.7);
          const crackDepth = crackIntensity * droughtCrackFactor * 0.6;

          targetHeight -= crackDepth;

          // Darken crack areas
          targetR *= 1 - crackIntensity * droughtCrackFactor * 0.6;
          targetG *= 1 - crackIntensity * droughtCrackFactor * 0.6;
          targetB *= 1 - crackIntensity * droughtCrackFactor * 0.6;

          // Add slight random variation for texture
          targetHeight += (Math.random() - 0.5) * 0.02 * droughtCrackFactor;
        } else if (drought > 0.3) {
          // Subtle surface variation on dry land
          targetHeight += (Math.random() - 0.5) * 0.03 * drought;
        }

        // Water effects - stronger restoration
        let maxWaterEffect = 0;
        for (const drop of waterDropsRef.current) {
          const dist = Math.sqrt(
            Math.pow(x - drop.position.x, 2) + Math.pow(y - drop.position.y, 2)
          );
          if (dist < drop.radius) {
            const effect = (1 - dist / drop.radius) * (1 - drop.age / 2);
            maxWaterEffect = Math.max(maxWaterEffect, effect);
          }
        }

        if (maxWaterEffect > 0) {
          // Restore to even deeper green and taller
          const waterGreenR = 0.1;
          const waterGreenG = 0.6;
          const waterGreenB = 0.05;

          targetR = THREE.MathUtils.lerp(targetR, waterGreenR, maxWaterEffect);
          targetG = THREE.MathUtils.lerp(targetG, waterGreenG, maxWaterEffect);
          targetB = THREE.MathUtils.lerp(targetB, waterGreenB, maxWaterEffect);

          // Make it taller than original
          targetHeight = THREE.MathUtils.lerp(
            targetHeight,
            originalHeight * 1.3,
            maxWaterEffect
          );
        }

        colors[i] = THREE.MathUtils.lerp(colors[i], targetR, 0.05);
        colors[i + 1] = THREE.MathUtils.lerp(colors[i + 1], targetG, 0.05);
        colors[i + 2] = THREE.MathUtils.lerp(colors[i + 2], targetB, 0.05);

        geoPositions[posIndex + 2] = THREE.MathUtils.lerp(
          geoPositions[posIndex + 2],
          targetHeight,
          0.05
        );
      }
      groundGeometry.attributes.color.needsUpdate = true;
      groundGeometry.attributes.position.needsUpdate = true;
      groundGeometry.computeVertexNormals();

      // Material roughness: broccoli to dry earth
      groundMaterial.roughness = THREE.MathUtils.lerp(0.9, 1.0, drought);

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Resize
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

    // Cleanup
    const container = containerRef.current;
    return () => {
      window.removeEventListener("resize", handleResize);
      if (container) {
        container.removeEventListener("click", handleClick);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      controls.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <Container ref={containerRef} />;
};

const Container = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  background: #87ceeb;
`;

export default DroughtAnimation;
