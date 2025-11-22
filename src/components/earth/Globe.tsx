import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import styled from "styled-components";

import generateStarfield from "./Starfield";
import loadGeoMap from "./GeoMap";
import Warning from "./Warning";
import { latLonToVector3 } from "../../utils/geoUtils";
import { Pin } from "../../types/pin";

interface GlobeProps {
  pinList?: Pin[];
}

const Globe = ({ pinList }: GlobeProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  // 핀의 DOM 요소들을 저장할 Ref 객체 (리렌더링 유발 X)
  const pinRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Three.js 관련 객체들을 저장할 Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pinObjsRef = useRef<{ mesh: THREE.Object3D; data: Pin }[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);

  // 1. 초기화 Effect (한 번만 실행)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.3);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 100);
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    controlsRef.current = controls;

    // Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Globe Geometry & Material
    const globeGeometry = new THREE.SphereGeometry(2, 32, 32);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: "#8becff",
      transparent: true,
      opacity: 0.4,
    });
    const edges = new THREE.EdgesGeometry(globeGeometry);
    const globeWireframe = new THREE.LineSegments(edges, lineMaterial);
    globeGroup.add(globeWireframe);

    // Stars
    const stars = generateStarfield({ numStars: 1000 });
    scene.add(stars);

    // GeoMap
    loadGeoMap({
      geoJsonUrl: "/land.json",
      radius: 2,
      onLoaded: (geoObj) => {
        // 컴포넌트가 마운트된 상태인지 확인 (Ref가 유효한지)
        if (globeGroupRef.current) {
          globeGroupRef.current.add(geoObj);
        }
      },
    });

    // Reusable Vectors for Animation Loop
    const tempV = new THREE.Vector3();
    const cameraPos = new THREE.Vector3();
    const meshPos = new THREE.Vector3();
    const meshNormal = new THREE.Vector3();
    const vectorToCamera = new THREE.Vector3();

    // Animation Loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      if (globeGroupRef.current) globeGroupRef.current.rotation.y += 0.001;
      if (controlsRef.current) controlsRef.current.update();

      if (cameraRef.current && rendererRef.current && sceneRef.current) {
        const camera = cameraRef.current;

        // 카메라 위치 캐싱
        cameraPos.copy(camera.position);

        // 핀 위치 업데이트 및 Occlusion Culling
        pinObjsRef.current.forEach(({ mesh, data }) => {
          const el = pinRefs.current[data.pinId];
          if (!el) return;

          // 1. 월드 위치 가져오기
          mesh.getWorldPosition(meshPos);

          // 2. 가시성 판단 (Dot Product)
          // 지구 중심(0,0,0)에서 핀까지의 벡터(meshPos - 0)는 meshPos 그 자체 (정규화 필요)
          meshNormal.copy(meshPos).normalize();
          vectorToCamera.subVectors(cameraPos, meshPos).normalize();

          const dot = meshNormal.dot(vectorToCamera);
          const isFacingCamera = dot > 0.1; // 여유값

          if (isFacingCamera) {
            // 화면 좌표 변환
            // meshPos는 이미 getWorldPosition으로 업데이트됨.
            // project는 meshPos를 NDC(-1 ~ 1)로 변환함.
            tempV.copy(meshPos).project(camera);

            // Frustum Check (화면 안에 있는지)
            const isInFrustum =
              tempV.x >= -1 && tempV.x <= 1 && tempV.y >= -1 && tempV.y <= 1;

            if (isInFrustum) {
              const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
              const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;

              el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0)`;
              el.style.opacity = "1";
              el.style.pointerEvents = "auto";
              el.style.zIndex = "1";
            } else {
              el.style.opacity = "0";
              el.style.pointerEvents = "none";
              el.style.zIndex = "-1";
            }
          } else {
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
            el.style.zIndex = "-1";
          }
        });

        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameIdRef.current)
        cancelAnimationFrame(animationFrameIdRef.current);

      if (
        container &&
        rendererRef.current &&
        container.contains(rendererRef.current.domElement)
      ) {
        container.removeChild(rendererRef.current.domElement);
      }

      // Dispose Resources
      globeGeometry.dispose();
      lineMaterial.dispose();
      edges.dispose();

      // Note: GeoMap and Stars disposal logic might need to be added to their respective modules or handled here if they return disposables.

      rendererRef.current?.dispose();
    };
  }, []); // Empty dependency array: run once

  // 2. 핀 업데이트 Effect (pinList 변경 시 실행)
  useEffect(() => {
    const globeGroup = globeGroupRef.current;
    if (!globeGroup || !pinList) return;

    // 기존 핀 제거
    pinObjsRef.current.forEach(({ mesh }) => {
      globeGroup.remove(mesh);
    });
    pinObjsRef.current = [];

    // 새 핀 생성
    pinList.forEach((pin) => {
      const pinObj = new THREE.Object3D();
      pinObj.position.copy(latLonToVector3(pin.latitude, pin.longitude, 2.0));
      pinObj.lookAt(new THREE.Vector3(0, 0, 0));

      globeGroup.add(pinObj);
      pinObjsRef.current.push({ mesh: pinObj, data: pin });
    });
  }, [pinList]);

  return (
    <GlobeContainer ref={mountRef}>
      {/* React는 핀 요소들을 한 번만 렌더링합니다. 
        위치는 animate 루프에서 ref를 통해 직접 제어됩니다.
      */}
      {pinList?.map((pin) => (
        <PinOverlayPositioner
          key={pin.pinId}
          ref={(el) => {
            if (pinRefs.current) {
              pinRefs.current[pin.pinId] = el;
            }
          }}
        >
          <Warning pin={pin} />
        </PinOverlayPositioner>
      ))}
    </GlobeContainer>
  );
};

const GlobeContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
`;

// style 속성을 제거하고, CSS transform을 통한 이동을 위해 초기 스타일 설정
const PinOverlayPositioner = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform, opacity; /* 브라우저에게 최적화 힌트 제공 */
  pointer-events: none;
`;

export default Globe;
