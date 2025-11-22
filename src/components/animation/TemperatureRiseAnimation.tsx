import { useEffect, useRef } from "react";
import styled from "styled-components";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

const TemperatureRiseAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const params = {
    sunRadius: 1.3,
    particleCount: 8000,
    emissionRadius: 1.14,
    emissionRate: 1.0,
    swirl: 0.15,
    flicker: 0.9,
    sizeMin: 2.0,
    sizeMax: 7.0,
    colorInner: "#d9c036",
    colorOuter: "#c2660f",
    lifeMin: 3.5,
    lifeMax: 7.0,
    baseAlpha: 0.63,
    hazeStrength: 0.0075,
    hazeRadius: 0.42,
    hazeTimeScale: 0.7,
    bloom: 0.5,
    bloomRadius: 0.68,
    bloomThreshold: 0.18,
    warmupSec: 1.6,
    startExposure: 0.85,
    targetExposure: 1.0,
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ---------- Renderer ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    container.appendChild(renderer.domElement);

    // ---------- Scene / Camera ----------
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 10, 0);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    // ---------------- Sun (emissive + flowing glow)
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(params.sunRadius, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    scene.add(sun);

    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(params.sunRadius * 1.03, 48, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uInner: { value: new THREE.Color(params.colorInner) },
          uOuter: { value: new THREE.Color(params.colorOuter) },
        },
        vertexShader: /*glsl*/ `
        varying vec3 vPos;
        void main(){ vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
        fragmentShader: /*glsl*/ `
        varying vec3 vPos; uniform float uTime; uniform vec3 uInner, uOuter;
        float hash(vec3 p){ return fract(sin(dot(p, vec3(17.1,31.7,57.3)))*43758.5453); }
        float noise(vec3 p){
          vec3 i=floor(p), f=fract(p); float n=0.;
          for(int x=0;x<2;x++) for(int y=0;y<2;y++) for(int z=0;z<2;z++){
            vec3 o=vec3(float(x),float(y),float(z));
            float w=dot(f-o,f-o); n+=(1.0-w)*hash(i+o);
          } return clamp(n,0.0,1.0);
        }
        void main(){
          vec3 p = normalize(vPos)*2.0 + vec3(uTime*0.1, uTime*0.07, 0.0);
          float n = noise(p*3.0);
          vec3 col = mix(uInner, uOuter, smoothstep(0.3,0.9,n));
          float alpha = 0.6 + 0.4*n;
          gl_FragColor = vec4(col, alpha);
        }`,
      })
    );
    scene.add(sunGlow);

    // ---------------- Heat particles (persistent / life-cycled)
    const N = params.particleCount;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(N * 3);
    const velocities = new Float32Array(N * 3);
    const sizes = new Float32Array(N);
    const hueT = new Float32Array(N);
    const births = new Float32Array(N);
    const lifes = new Float32Array(N);
    const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);

    for (let i = 0; i < N; i++) {
      // 구면 균일 샘플
      const a = rnd(0, Math.PI * 2),
        z = rnd(-1, 1),
        r = Math.sqrt(1 - z * z);
      const nx = r * Math.cos(a),
        ny = z,
        nz = r * Math.sin(a);

      positions[i * 3 + 0] = nx * params.emissionRadius;
      positions[i * 3 + 1] = ny * params.emissionRadius;
      positions[i * 3 + 2] = nz * params.emissionRadius;

      const up = new THREE.Vector3(
        nx,
        Math.abs(ny) * 1.3 + 1.2,
        nz
      ).normalize();
      velocities[i * 3 + 0] = up.x * rnd(0.6, 1.3);
      velocities[i * 3 + 1] = up.y * rnd(0.8, 1.7);
      velocities[i * 3 + 2] = up.z * rnd(0.6, 1.3);

      sizes[i] = rnd(params.sizeMin, params.sizeMax);
      hueT[i] = rnd(0.0, 1.0);
      lifes[i] = rnd(params.lifeMin, params.lifeMax);
      births[i] = rnd(0.0, lifes[i]);
    }

    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeo.setAttribute(
      "aVelocity",
      new THREE.BufferAttribute(velocities, 3)
    );
    particleGeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    particleGeo.setAttribute("aHueT", new THREE.BufferAttribute(hueT, 1));
    particleGeo.setAttribute("aBirth", new THREE.BufferAttribute(births, 1));
    particleGeo.setAttribute("aLife", new THREE.BufferAttribute(lifes, 1));

    const particleMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSwirl: { value: params.swirl },
        uEmission: { value: params.emissionRate },
        uFlicker: { value: params.flicker },
        uInner: { value: new THREE.Color(params.colorInner) },
        uOuter: { value: new THREE.Color(params.colorOuter) },
        uSizeScale: { value: renderer.getPixelRatio() },
        uBaseAlpha: { value: params.baseAlpha },
      },
      vertexShader: /*glsl*/ `
      uniform float uTime, uSwirl, uEmission, uFlicker, uSizeScale;
      attribute vec3 aVelocity; attribute float aSize, aHueT, aBirth, aLife;
      varying float vProg; varying float vHue;
      mat3 rotY(float a){ float c=cos(a), s=sin(a);
        return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
      void main(){
        float age = mod(uTime + aBirth, aLife);
        vProg = age / aLife; vHue = aHueT;
        vec3 pos = position + aVelocity * age * uEmission;
        float swirl = uSwirl*0.7*(0.6+0.4*sin(dot(position, vec3(2.3,1.7,3.1))+uTime*0.8));
        pos = rotY(swirl*age) * pos;
        pos *= (1.0 + 0.03 * sin(uTime + aHueT*6.28));
        float flick = 1.0 + uFlicker * 0.35 * sin(uTime*6.0 + aHueT*12.3);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
        gl_PointSize = aSize * uSizeScale * (1.0 + 0.25 * (pos.y*0.15)) * flick;
      }`,
      fragmentShader: /*glsl*/ `
      precision mediump float; varying float vProg, vHue;
      uniform vec3 uInner, uOuter; uniform float uBaseAlpha;
      void main(){
        vec2 uv = gl_PointCoord*2.0 - 1.0; float r = length(uv);
        if(r>1.0) discard;
        float core = smoothstep(1.0, 0.2, r);
        float birth = smoothstep(0.0, 0.15, vProg);
        float death = 1.0 - smoothstep(0.75, 1.0, vProg);
        vec3 col = mix(uInner, uOuter, vHue);
        gl_FragColor = vec4(col, core * birth * death * uBaseAlpha);
      }`,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ---------------- Postprocessing: Bloom + Heat Haze
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      params.bloom,
      params.bloomRadius,
      params.bloomThreshold
    );
    composer.addPass(bloomPass);

    const HeatHazeShader = {
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uRadius: { value: params.hazeRadius },
        uStrength: { value: params.hazeStrength },
        uSpeed: { value: params.hazeTimeScale },
        uAspect: { value: container.clientWidth / container.clientHeight },
        uExtraStrength: { value: 0.0 }, // 클릭 임펄스가 아지랑이에 더해지는 값
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }`,
      fragmentShader: /*glsl*/ `
      precision mediump float; varying vec2 vUv; uniform sampler2D tDiffuse;
      uniform vec2 uCenter; uniform float uRadius,uStrength,uSpeed,uAspect,uTime,uExtraStrength;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p);
        float a=h(i), b=h(i+vec2(1.,0.)), c=h(i+vec2(0.,1.)), d=h(i+vec2(1.,1.));
        vec2 u=f*f*(3.0-2.0*f); return mix(a,b,u.x)+ (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y; }
      void main(){
        vec2 uv=vUv, d=uv-uCenter; d.x*=uAspect;
        float fall=smoothstep(1.0,0.0,length(d)/uRadius);
        float n1=n(uv*6.0+vec2(uTime*uSpeed,0.0));
        float n2=n(uv*9.0+vec2(0.0,uTime*uSpeed*1.3));
        vec2 off=normalize(d) * ((n1*0.6+n2*0.4)-0.5) * (uStrength + uExtraStrength) * fall;
        gl_FragColor=texture2D(tDiffuse, uv+off);
      }`,
    };
    const heatHazePass = new ShaderPass(HeatHazeShader);
    composer.addPass(heatHazePass);

    // ---------------- Interaction: click burst with smooth rise
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    // 부드러운 상승을 위한 상태값 분리
    let impulse = 0.0; // 실제 적용값 (렌더에 쓰임)
    let impulseTarget = 0.0; // 목표값 (클릭 시 점프)
    const impulseMax = 1.2; // 상한
    const impulseRise = 6.0; // ↑ 상승 속도(초당). 3~8 사이 추천 (작을수록 더 느림)
    const impulseDecay = 1.8; // ↓ 목표값 감쇠 속도(초당)

    function triggerBurst() {
      impulseTarget = Math.min(impulseTarget + 0.9, impulseMax);
    }

    function onPointerDown(e: { clientX: number; clientY: number }) {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ndc.set(x, y);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObject(sun, false);
      if (hit.length > 0) {
        triggerBurst();
      }
    }
    container.addEventListener("pointerdown", onPointerDown);

    // ---------------- Animate
    let t = 0;
    let last = performance.now();

    function animate(now: number) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      t += dt;

      // 초기 과광 방지 워밍업
      const k = Math.min(1, t / params.warmupSec);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(
        params.startExposure,
        params.targetExposure,
        k
      );

      // 목표값(impulseTarget)은 지수적으로 줄어듦(잔열)
      if (impulseTarget > 0) {
        impulseTarget *= Math.exp(-impulseDecay * dt);
        if (impulseTarget < 1e-4) impulseTarget = 0;
      }

      // 실제값(impulse)은 목표값에 부드럽게 접근 (느린 발광 상승의 핵심)
      const s = 1 - Math.exp(-impulseRise * dt); // 0~1
      impulse += (impulseTarget - impulse) * s;

      // 임펄스 적용 가중치
      const bloomBase = params.bloom; // 화면 전체의 빛 번짐(광륜)
      const emissionBase = params.emissionRate; // 입자 상승 속도
      const flickerBase = params.flicker; // 입자 깜빡임 강도
      const alphaBase = params.baseAlpha; // 입자 투명도

      const bloomNow = bloomBase + 0.55 * impulse;
      const emissionNow = emissionBase + 0.9 * impulse;
      const flickerNow = flickerBase + 0.7 * impulse;
      const alphaNow = alphaBase + 0.15 * impulse;
      const hazeExtra = 0.0015 * impulse;

      // 워밍업 동안 bloom은 추가로 낮게 시작
      const bloomWarm = THREE.MathUtils.lerp(0.35, bloomNow, k);

      // 유니폼/패스 반영
      bloomPass.strength = bloomWarm;
      particleMat.uniforms.uTime.value = t;
      particleMat.uniforms.uFlicker.value = flickerNow;
      particleMat.uniforms.uEmission.value = emissionNow;
      particleMat.uniforms.uBaseAlpha.value = alphaNow;

      sunGlow.material.uniforms.uTime.value = t;

      // Heat haze 중심 = 태양 화면좌표
      const p = sun.position.clone().project(camera);
      heatHazePass.uniforms.uCenter.value.set((p.x + 1) * 0.5, (1 - p.y) * 0.5);
      heatHazePass.uniforms.uTime.value = t;
      heatHazePass.uniforms.uExtraStrength.value = hazeExtra;

      composer.render();
      requestAnimationFrame(animate);
    }
    requestAnimationFrame((t0) => {
      last = t0;
      animate(t0);
    });

    // ---------------- Resize
    addEventListener("resize", () => {
      const w = container.clientWidth,
        h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      heatHazePass.uniforms.uAspect.value = w / h;
    });

    // ---------- Resize ----------
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // ---------- Cleanup ----------
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
  height: 100vh;
  position: relative;
  overflow: hidden;
`;

export default TemperatureRiseAnimation;
