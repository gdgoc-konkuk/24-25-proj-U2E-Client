import { useState } from "react";
import styled, { keyframes } from "styled-components";

import WarningIcon from "../../assets/svgs/Warning.svg?react";
import { rowFlex } from "../../styles/flexStyles";
import theme from "../../styles/theme";
import DetailAnimation from "../animation/DetailAnimation";
import { Climate, Pin } from "../../types/pin";
import { climateIcons } from "../../constants/climateIcons";
import { useNavigate, useSearchParams } from "react-router-dom";

interface WarningProps {
  pin: Pin;
}

const Warning = ({ pin }: WarningProps) => {
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const climate =
    filterParam && pin.climateProblem.includes(filterParam as Climate)
      ? filterParam
      : pin.climateProblem[0];
  const ClimateIcon = climateIcons.find((item) => climate === item.id)?.icon;
  const ClimateTitle = climateIcons.find((item) => climate === item.id)?.label;

  return (
    <Container>
      <IconWrapper
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => navigate(`news-detail/${pin.pinId}`)}
      >
        <GlowLayer $visible={hovered} />
        <WarningIconStyled />
        <MiniCard $visible={hovered}>
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
              <DetailAnimation dropNum={50} dropSpeed={2} boundary={20} />
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

const IconWrapper = styled.div`
  position: relative;
  width: 50px;
  height: 50px;
  cursor: pointer;
  z-index: 99;
  svg {
    width: 100%;
    height: 100%;
  }
  &:hover > div {
    opacity: 1;
    transform: translateY(-12px);
    pointer-events: auto;
  }
`;

const glowFade = keyframes`
  0% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
`;

const GlowLayer = styled.div<{ $visible: boolean }>`
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
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: none;
  animation: ${({ $visible }) => ($visible ? glowFade : "none")} 2.5s
    ease-in-out infinite;
  transition: all 0.5s ease;
`;

const WarningIconStyled = styled(WarningIcon)`
  width: 100%;
  height: 100%;
  z-index: 10;
`;

const MiniCard = styled.div<{ $visible: boolean }>`
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
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};
  transform: translateY(${({ $visible }) => ($visible ? "-12px" : "0")});
  transition: all 0.5s ease;
  z-index: 999;
  backdrop-filter: blur(4px);

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
