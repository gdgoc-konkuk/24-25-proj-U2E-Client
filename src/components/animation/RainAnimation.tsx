import { useRef, useEffect } from "react";
import styled from "styled-components";

// 떨어지는 물방울의 속성을 정의하는 인터페이스
interface Drop {
  x: number; // x 좌표
  y: number; // y 좌표
  len: number; // 길이
  speed: number; // 속도
  velX: number; // x축 방향 속도
  velY: number; // y축 방향 속도
}

interface RainAnimationProps {
  dropNum: number;
  dropSpeed?: number;
  boundary?: number;
}

const RainAnimation = ({
  dropNum,
  dropSpeed = 6,
  boundary = 100,
}: RainAnimationProps) => {
  // 생성할 물방울의 수
  const NUM_DROPS = dropNum;
  // DOM 요소 및 상태를 참조하기 위한 ref 선언
  const containerRef = useRef<HTMLDivElement>(null); // 컨테이너 요소 참조
  const canvasRef = useRef<HTMLCanvasElement>(null); // 캔버스 요소 참조
  const cursorRef = useRef<HTMLDivElement>(null); // 커스텀 커서 요소 참조
  const dropsRef = useRef<Drop[]>([]); // 물방울 배열 참조
  const mouseRef = useRef<{
    // 마우스 위치 추적을 위한 참조
    x: number;
    y: number;
    prevX: number;
    prevY: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const cursor = cursorRef.current;
    if (!canvas || !container || !cursor) return;
    const ctx = canvas.getContext("2d");

    // 캔버스 크기를 컨테이너에 맞게 조정하는 함수
    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // 물방울 초기화: 랜덤한 위치, 크기 및 속도로 물방울 배열 생성
    dropsRef.current = Array.from({ length: NUM_DROPS }, () => ({
      x: Math.random() * canvas.width, // 랜덤 x 위치
      y: Math.random() * canvas.height, // 랜덤 y 위치
      len: 10 + Math.random() * 10, // 10~20 사이의 랜덤 길이
      speed: 2 + Math.random() * dropSpeed, // 2~4 사이의 랜덤 속도
      velX: 0, // 초기 x 방향 속도는 0
      velY: 0, // 초기 y 방향 속도는 0
    }));

    // 마우스 이동 이벤트 핸들러: 마우스 위치 추적
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left; // 캔버스 내 마우스 x 좌표
      const y = e.clientY - rect.top; // 캔버스 내 마우스 y 좌표

      // 커스텀 커서 위치 업데이트
      if (cursor) {
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
        cursor.style.opacity = "1";
      }

      if (mouseRef.current) {
        // 이전 위치 저장 후 현재 위치 업데이트
        mouseRef.current.prevX = mouseRef.current.x;
        mouseRef.current.prevY = mouseRef.current.y;
        mouseRef.current.x = x;
        mouseRef.current.y = y;
      } else {
        // 첫 이동 시 초기화
        mouseRef.current = { x, y, prevX: x, prevY: y };
      }
    };
    canvas.addEventListener("mousemove", handleMouseMove);

    // 마우스가 캔버스를 벗어날 때 호출되는 핸들러
    const handleMouseLeave = () => {
      mouseRef.current = null; // 마우스 추적 중지

      // 커서 숨기기
      if (cursor) {
        cursor.style.opacity = "0";
      }
    };
    canvas.addEventListener("mouseleave", handleMouseLeave);

    // 마우스가 캔버스에 들어올 때 호출되는 핸들러
    const handleMouseEnter = () => {
      if (cursor) {
        cursor.style.opacity = "1";
      }
    };
    canvas.addEventListener("mouseenter", handleMouseEnter);

    // 애니메이션 프레임마다 실행되는 함수
    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height); // 캔버스 초기화

      // 마우스 이동 거리 계산
      let dx = 0;
      let dy = 0;
      if (mouseRef.current) {
        dx = mouseRef.current.x - mouseRef.current.prevX; // x축 이동 거리
        dy = mouseRef.current.y - mouseRef.current.prevY; // y축 이동 거리
      }

      dropsRef.current.forEach((drop) => {
        // 마우스가 물방울 근처에 있으면 속도에 영향을 줌
        if (mouseRef.current) {
          const dist = Math.hypot(
            drop.x - mouseRef.current.x,
            drop.y - mouseRef.current.y
          ); // 마우스와 물방울 사이의 거리

          if (dist < boundary) {
            // 100픽셀 이내일 때 영향을 줌
            const influence = (boundary - dist) / boundary; // 거리에 따른 영향력 (0~1)
            drop.velX += dx * 0.2 * influence; // x축 속도에 영향
            drop.velY += dy * 0.2 * influence; // y축 속도에 영향
          }
        }

        // 중력과 속도를 적용하여 물방울 위치 업데이트
        drop.y += drop.speed + drop.velY;
        drop.x += drop.velX;

        // 마찰력 적용: 속도 감소
        drop.velX *= 0.92;
        drop.velY *= 0.92;

        // 화면 밖으로 나가면 위치 초기화
        if (drop.y > canvas.height || drop.x < 0 || drop.x > canvas.width) {
          drop.y = 0; // 상단에서 다시 시작
          drop.x = Math.random() * canvas.width; // 랜덤 x 위치
          drop.velY = 0; // 속도 초기화
          drop.velX = 0;
        }

        // 물방울 그리기
        ctx.strokeStyle = "rgba(174,194,224,0.5)"; // 연한 파란색
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y); // 시작점
        ctx.lineTo(drop.x + drop.velX * 2, drop.y + drop.len + drop.velY * 2); // 끝점
        ctx.stroke();
      });

      requestAnimationFrame(animate); // 다음 프레임 요청
    };

    animate(); // 애니메이션 시작

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, []);

  return (
    <Container ref={containerRef}>
      <Canvas ref={canvasRef} />
      <CustomCursor ref={cursorRef} />
    </Container>
  );
};

// 애니메이션을 포함할 컨테이너 스타일 정의
const Container = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
`;

// 애니메이션을 그릴 캔버스 스타일 정의
const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  cursor: none; /* 기본 커서 숨김 */
`;

// 커스텀 커서 스타일 정의
const CustomCursor = styled.div`
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: rgba(174, 194, 224, 0.5);
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  opacity: 0; /* 초기 상태에서 숨김 */
`;

export default RainAnimation;
