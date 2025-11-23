import styled, { keyframes } from "styled-components";
import RainAnimation from "../components/animation/RainAnimation";
import { colFlex, rowFlex } from "../styles/flexStyles";
import NewsContents from "../components/news/NewsContents";
import ChatPanel from "../components/chat/ChatPanel";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useNewsContentsQuery } from "../hooks/useNewsQuery";
import { climateMap } from "../constants/climateMap";
import { Climate } from "../types/climate";
import { HEADER_HEIGHT } from "../constants/layout";

const NewsDetail = () => {
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get("filter") as Climate;
  const newsId = Number(useParams().newsId) || 1;
  const { data: response } = useNewsContentsQuery(newsId);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const climate = filterParam ?? (response?.data.climateList[0] as Climate);
  const animation = climateMap[climate] || <RainAnimation dropNum={400} />;

  return (
    <Container>
      <AnimationWrapper>
        {animation}
        <ScrollIndicator>
          <span>아래로 스크롤 하여 뉴스 기사를 확인하세요</span>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7 10L12 15L17 10"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </ScrollIndicator>
      </AnimationWrapper>
      <ContentsContainer>
        {response && <NewsContents newsData={response.data} />}
        <ChatPanel isVisible={isChatOpen} setIsChatOpen={setIsChatOpen} />
      </ContentsContainer>
    </Container>
  );
};

const Container = styled.div`
  padding-top: ${HEADER_HEIGHT}px;
  width: 100%;
  ${colFlex({ justify: "start", align: "center" })}
  overflow-y: auto;
  scroll-behavior: smooth;
`;

const AnimationWrapper = styled.div`
  width: 100%;
  flex-shrink: 0;
  position: relative;
`;

const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
`;

const ScrollIndicator = styled.div`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 10;
  pointer-events: none;

  span {
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    font-weight: 500;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  svg {
    animation: ${bounce} 2s infinite;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
`;

const ContentsContainer = styled.section`
  width: 100%;
  min-height: 100vh;
  ${rowFlex({ justify: "center", align: "start" })}
`;

export default NewsDetail;
