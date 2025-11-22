import { useEffect, useRef, useState } from "react";
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

  // 모든 핀 DIV ref
  const pinRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // 현재 hover된 pinId (React state)
  const [hoveredPinId, setHoveredPinId] = useState<number | null>(null);

  // hoveredPinId를 animation loop에서 읽기 위한 ref
  const hoveredPinIdRef = useRef<number | null>(null);

  // hoveredPinId가 바뀌면 ref에 업데이트
  useEffect(() => {
    hoveredPinIdRef.current = hoveredPinId;
  }, [hoveredPinId]);

  // Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pinObjsRef = useRef<{ mesh: THREE.Object3D; data: Pin }[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);

  // 1) 초기화 useEffect (한 번만 실행)
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

    // Globe Geometry
    const globeGeometry = new THREE.SphereGeometry(2, 32, 32);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: "#8becff",
      transparent: true,
      opacity: 0.4,
    });
    const edges = new THREE.EdgesGeometry(globeGeometry);
    const globeWireframe = new THREE.LineSegments(edges, lineMaterial);
    globeGroup.add(globeWireframe);

    const blackGlobeGeometry = new THREE.SphereGeometry(1.98, 32, 32);
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
    });
    const globeMesh = new THREE.Mesh(blackGlobeGeometry, fillMaterial);
    globeGroup.add(globeMesh);

    // Starfield
    const stars = generateStarfield({ numStars: 1000 });
    scene.add(stars);

    // GeoMap 로딩
    loadGeoMap({
      geoJsonUrl: "/land.json",
      radius: 2,
      onLoaded: (geoObj) => {
        if (globeGroupRef.current) {
          globeGroupRef.current.add(geoObj);
        }
      },
    });

    // Reusable vectors
    const tempV = new THREE.Vector3();
    const cameraPos = new THREE.Vector3();
    const meshPos = new THREE.Vector3();
    const meshNormal = new THREE.Vector3();
    const vectorToCamera = new THREE.Vector3();

    // Animation Loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      // 회전
      globeGroupRef.current!.rotation.y += 0.001;

      // 컨트롤 업데이트
      controlsRef.current!.update();

      // 카메라 위치
      cameraPos.copy(camera.position);

      // 모든 핀 화면 위치 갱신 + z-index 계산
      pinObjsRef.current.forEach(({ mesh, data }) => {
        const el = pinRefs.current[data.pinId];
        if (!el) return;

        mesh.getWorldPosition(meshPos);
        meshNormal.copy(meshPos).normalize();
        vectorToCamera.subVectors(cameraPos, meshPos).normalize();

        const dot = meshNormal.dot(vectorToCamera);
        const isFacingCamera = dot > 0.1;

        if (isFacingCamera) {
          tempV.copy(meshPos).project(camera);

          const isInFrustum =
            tempV.x >= -1 && tempV.x <= 1 && tempV.y >= -1 && tempV.y <= 1;

          if (isInFrustum) {
            const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
            const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;

            el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0)`;
            el.style.opacity = "1";
            el.style.pointerEvents = "auto";

            // hover된 핀은 z-index 최상단
            el.style.zIndex =
              data.pinId === hoveredPinIdRef.current ? "2000" : "1";
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

      renderer.render(scene, camera);
    };

    animate();

    // Resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

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

      rendererRef.current?.dispose();
      globeGeometry.dispose();
      lineMaterial.dispose();
      edges.dispose();
    };
  }, []);

  useEffect(() => {
    const globeGroup = globeGroupRef.current;
    if (!globeGroup || !pinList) return;

    // 기존 핀 제거
    pinObjsRef.current.forEach(({ mesh }) => globeGroup.remove(mesh));
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
      {pinList?.map((pin) => (
        <PinOverlayPositioner
          key={pin.pinId}
          ref={(el) => {
            pinRefs.current[pin.pinId] = el;
          }}
        >
          <Warning
            pin={pin}
            onHoverChange={(hover) => setHoveredPinId(hover ? pin.pinId : null)}
          />
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

const PinOverlayPositioner = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform, opacity;
  pointer-events: none;
`;

export default Globe;
