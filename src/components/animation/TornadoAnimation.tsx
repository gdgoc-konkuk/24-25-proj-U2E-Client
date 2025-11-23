import { useEffect, useRef } from "react";
import styled from "styled-components";
import * as THREE from "three";
import { HEADER_HEIGHT } from "../../constants/layout";

interface TornadoProps {
  particleCount?: number;
  dustEnabled?: boolean;
  height?: number;
  baseRadius?: number;
  topRadius?: number;
}

const TornadoAnimation = ({
  particleCount = 5000,
  dustEnabled = true,
  height = 10,
  baseRadius = 9,
  topRadius = 4,
}: TornadoProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ---------------- Renderer ----------------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x0b0f14, 1);
    container.appendChild(renderer.domElement);

    // ---------------- Scene / Camera ----------------
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0f14, 0.018);

    const camera = new THREE.PerspectiveCamera(
      44,
      container.clientWidth / container.clientHeight,
      0.1,
      300
    );
    camera.position.set(0, height * 0.7, baseRadius * 2);

    // ---------------- Tornado Params ----------------
    const params = {
      height,
      baseRadius,
      topRadius,
      particles: particleCount,
      swirl: 0.5,
      updraft: 1.8,
      wobble: 0.4,
      innerBoost: 1.4,
      color: "#a8c7ff",
      pulse: 0.12,
    };

    const interaction = {
      enabled: true,
      radius: 2.0,
      strength: 1.7,
      falloff: 1.5,
      lerp: 0.22,
    };

    const trail = {
      enabled: true,
      max: 90,
      lifespan: 0.55,
      spawnSpeed: 2.1,
      spawnInterval: 0.014,
      sizeStart: 1.0,
      sizeEnd: 0.3,
      opacity: 0.35,
      swirl: 0.7,
      drift: 0.18,
    };

    const radiusAt = (y: number) =>
      THREE.MathUtils.lerp(
        params.topRadius,
        params.baseRadius,
        y / params.height
      );

    const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);

    // ---------------- Particle Init ----------------
    const positions = new Float32Array(params.particles * 3);
    const speeds = new Float32Array(params.particles);
    const heights = new Float32Array(params.particles);

    for (let i = 0; i < params.particles; i++) {
      const y = rnd(0, params.height);
      const r = radiusAt(y);
      const a = Math.random() * Math.PI * 2;

      const idx = i * 3;
      positions[idx] = Math.cos(a) * r;
      positions[idx + 1] = y;
      positions[idx + 2] = Math.sin(a) * r;

      heights[i] = y;

      const innerFactor = THREE.MathUtils.clamp(
        1 - r / params.baseRadius,
        0.05,
        1.0
      );
      speeds[i] = rnd(0.8, 1.1) * (1 + params.innerBoost * innerFactor);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.08,
      color: new THREE.Color(params.color),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const tornado = new THREE.Points(geom, mat);
    scene.add(tornado);

    // ---------------- Dust Ring ----------------
    const dustGeom = new THREE.BufferGeometry();
    const dustCount = 900;
    const dustPos = new Float32Array(dustCount * 3);
    const dustAng = new Float32Array(dustCount);
    const dustRad = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      dustAng[i] = rnd(0, Math.PI * 2);
      dustRad[i] = rnd(params.baseRadius * 0.6, params.baseRadius * 1.0);
      const idx = i * 3;
      dustPos[idx] = Math.cos(dustAng[i]) * dustRad[i];
      dustPos[idx + 1] = rnd(0.02, 0.25);
      dustPos[idx + 2] = Math.sin(dustAng[i]) * dustRad[i];
    }

    dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));

    const dustMat = new THREE.PointsMaterial({
      size: 0.06,
      color: 0x9fb6ff,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const dust = new THREE.Points(dustGeom, dustMat);
    dust.visible = dustEnabled;
    scene.add(dust);

    // ---------------- Interaction Collider (for pointer) ----------------
    const interactionCollider = new THREE.Mesh(
      new THREE.CylinderGeometry(
        params.baseRadius,
        params.topRadius,
        params.height,
        20,
        1,
        true
      ),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    interactionCollider.position.y = params.height * 0.5;
    scene.add(interactionCollider);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const hoverPoint = new THREE.Vector3();
    const hoverPointSmooth = new THREE.Vector3();
    let hoverValid = false;

    renderer.domElement.addEventListener("pointermove", (ev) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hit = raycaster.intersectObject(interactionCollider, false);

      if (hit.length > 0) {
        hoverPoint.copy(hit[0].point);
        hoverValid = true;
      } else hoverValid = false;
    });

    // ---------------- Afterimage setup ----------------
    function makeTrailTexture() {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const ctx = c.getContext("2d")!;
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }
    const trailTexture = makeTrailTexture();
    const trailGroup = new THREE.Group();
    scene.add(trailGroup);

    const trailPool: THREE.Sprite[] = [];
    let trailIdx = 0;
    const trailMat = new THREE.SpriteMaterial({
      map: trailTexture,
      color: new THREE.Color("#a8c7ff"),
      transparent: true,
      opacity: trail.opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < trail.max; i++) {
      const s = new THREE.Sprite(trailMat.clone());
      s.visible = false;
      s.userData = { age: 0, vel: new THREE.Vector3() };
      trailGroup.add(s);
      trailPool.push(s);
    }

    function spawnTrail(p: THREE.Vector3, dir: THREE.Vector3) {
      const s = trailPool[trailIdx];
      trailIdx = (trailIdx + 1) % trailPool.length;

      s.position.copy(p);
      s.visible = true;
      s.userData.age = 0;

      const jitter = new THREE.Vector3(
        rnd(-0.05, 0.05),
        rnd(-0.02, 0.02),
        rnd(-0.05, 0.05)
      );

      s.userData.vel.copy(dir).multiplyScalar(trail.drift).add(jitter);
      s.scale.set(trail.sizeStart, trail.sizeStart, 1);
      s.material.opacity = trail.opacity;
    }

    // ---------------- Animation ----------------
    let lastTime = performance.now();
    const lastHover = new THREE.Vector3();

    const animate = () => {
      const now = performance.now();
      const dt = Math.min(0.033, (now - lastTime) / 1000);
      lastTime = now;

      if (hoverValid) {
        hoverPointSmooth.lerp(hoverPoint, interaction.lerp);
      }

      const pos = geom.getAttribute("position");
      const R = interaction.radius;
      const R2 = R * R;

      const currentHover = hoverPointSmooth.clone();
      const dp = currentHover.clone().sub(lastHover);
      const speed = dp.length() / dt;
      lastHover.copy(currentHover);

      if (trail.enabled && hoverValid && speed > trail.spawnSpeed) {
        spawnTrail(currentHover, dp);
      }

      // -------- Update particles --------
      for (let i = 0; i < params.particles; i++) {
        heights[i] +=
          params.updraft * dt * (0.8 + 0.2 * Math.sin(i * 0.15 + now * 0.001));
        if (heights[i] > params.height) heights[i] -= params.height;

        const baseR = radiusAt(heights[i]);
        const pulse = 1 + params.pulse * Math.sin(now * 0.002 + i * 0.03);
        const r = baseR * pulse;

        const angle = now * 0.001 * speeds[i] * params.swirl + i;
        let x = Math.cos(angle) * r;
        let z = Math.sin(angle) * r;
        let y = heights[i];

        if (hoverValid) {
          const dx = x - currentHover.x;
          const dy = y - currentHover.y;
          const dz = z - currentHover.z;
          const d2 = dx * dx + dy * dy + dz * dz;

          if (d2 < R2) {
            const d = Math.sqrt(d2) + 1e-6;
            const w =
              Math.pow(1 - d / R, interaction.falloff) * interaction.strength;
            const inv = w / d;
            x += dx * inv;
            y += dy * inv * 0.4;
            z += dz * inv;
          }
        }

        const idx = i * 3;
        pos.array[idx] = x;
        pos.array[idx + 1] = y;
        pos.array[idx + 2] = z;
      }

      pos.needsUpdate = true;

      // -------- Dust rotation --------
      if (dustEnabled) {
        const dp = dustGeom.getAttribute("position");
        for (let i = 0; i < dustCount; i++) {
          dustAng[i] += dt * (0.4 + 0.2 * Math.sin(i * 0.03 + now * 0.001));
          const idx = i * 3;
          dp.array[idx] = Math.cos(dustAng[i]) * dustRad[i];
          dp.array[idx + 2] = Math.sin(dustAng[i]) * dustRad[i];
        }
        dp.needsUpdate = true;
      }

      // -------- Trail update --------
      for (const s of trailPool) {
        if (!s.visible) continue;
        s.userData.age += dt;
        const k = 1 - s.userData.age / trail.lifespan;
        if (k <= 0) {
          s.visible = false;
          continue;
        }
        s.material.opacity = trail.opacity * k * k;
        s.position.addScaledVector(s.userData.vel, dt);
        const scale = THREE.MathUtils.lerp(
          trail.sizeStart,
          trail.sizeEnd,
          1 - k
        );
        s.scale.set(scale, scale, 1);
      }
      // --- Zoom Animation (smooth scale feeling)
      const baseZ = baseRadius * 2.0;
      const amplitude = 2.0; // 확대/축소 정도
      const cSpeed = 0.8; // 속도
      camera.position.z = baseZ + Math.sin(now * 0.002 * cSpeed) * amplitude;
      camera.lookAt(0, params.height * 0.5, 0);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // ---------------- Resize ----------------
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;

      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <Container ref={containerRef} />;
};

const Container = styled.div`
  width: 100%;
  height: calc(100vh - ${HEADER_HEIGHT}px);
  position: relative;
  overflow: hidden;
`;

export default TornadoAnimation;
