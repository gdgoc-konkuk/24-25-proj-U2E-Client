import { useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";

import WarningIcon from "../../assets/svgs/Warning.svg?react";
import { rowFlex } from "../../styles/flexStyles";
import theme from "../../styles/theme";
import RainAnimation from "../animation/RainAnimation";
import { Climate, Pin } from "../../types/pin";
import { climateIcons } from "../../constants/climateIcons";
import { useNavigate, useSearchParams } from "react-router-dom";

interface WarningProps {
  pin: Pin;
  onHoverChange?: (isHovered: boolean) => void;
}

const Warning = ({ pin, onHoverChange }: WarningProps) => {
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = () => {
    setHovered(true);
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    onHoverChange?.(false);
  };

  const climate =
    filterParam && pin.climateProblem.includes(filterParam as Climate)
      ? (filterParam as Climate)
      : pin.climateProblem[0];

  const climateInfo = useMemo(
    () => climateIcons.find((item) => climate === item.id),
    [climate]
  );

  const ClimateIcon = climateInfo?.icon;
  const ClimateTitle = climateInfo?.label;

  return (
    <Container>
      <IconWrapper
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => navigate(`news-detail/${pin.newsId}`)}
      >
        <GlowLayer />
        <WarningIconStyled />
        <MiniCard>
          <Title>
            {ClimateTitle}
            {ClimateIcon && (
              <ClimateIconWrapper>
                <ClimateIcon />
              </ClimateIconWrapper>
            )}
          </Title>
          <AnimationContainer>
            {hovered && (
              <RainAnimation dropNum={50} dropSpeed={2} boundary={20} />
            )}
          </AnimationContainer>
        </MiniCard>
      </IconWrapper>
    </Container>
  );
};

const Container = styled.div`
  width: 80%;
  height: 100%;
  ${rowFlex({ align: "center", justify: "center" })}
`;

const MiniCard = styled.div`
  position: absolute;
  left: 80px;
  top: -30px;
  width: 260px;
  height: 120px;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(0, 8, 23, 0.75);
  color: ${theme.colors.textPrimary};
  white-space: nowrap;
  font-weight: bold;
  font-size: 16px;
  z-index: 2; // 컨테이너 안에서만 위로
  backdrop-filter: blur(4px);

  /* ✅ 기본값: 안 보이고 클릭도 안 됨 */
  opacity: 0;
  pointer-events: none;
  transform: translateY(0);

  /* ✅ transition은 필요한 속성만 지정 */
  transition: opacity 0.5s ease, transform 0.5s ease;

  &::after {
    content: "";
    position: absolute;
    left: -10px;
    top: 50%;
    transform: translateY(-50%);
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-right: 10px solid rgba(0, 8, 23, 0.75);
    border-left: none;
  }
`;

const glowFade = keyframes`
  0% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
`;

const GlowLayer = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 199, 78, 0.5) 20%,
    transparent 70%
  );
  z-index: 0;
  opacity: 0;
  animation: ${glowFade} 2.5s ease-in-out infinite;
  transition: opacity 0.5s ease;
`;

const IconWrapper = styled.div`
  position: relative;
  width: 50px;
  height: 50px;
  cursor: pointer;

  svg {
    width: 100%;
    height: 100%;
  }

  /* MiniCard hover 시 노출/위치 이동 */
  &:hover ${MiniCard} {
    opacity: 1;
    transform: translateY(-12px);
    pointer-events: auto;
  }

  /* GlowLayer는 hover 시에만 보여주기 */
  &:hover ${GlowLayer} {
    opacity: 1;
  }
`;

const WarningIconStyled = styled(WarningIcon)`
  width: 100%;
  height: 100%;
  z-index: 1;
`;

const AnimationContainer = styled.div`
  width: 100%;
  height: 65px; /* MiniCard 내부에서 적절한 높이로 제한 */
  margin-top: 12px;
`;

const Title = styled.div`
  ${rowFlex({ align: "center" })}
  gap: 8px;
`;

const ClimateIconWrapper = styled.div`
  width: 26px;
  height: 26px;
  ${rowFlex({ align: "center", justify: "center" })};
  cursor: pointer;
  transition: all 0.3s ease;
  svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

export default Warning;
