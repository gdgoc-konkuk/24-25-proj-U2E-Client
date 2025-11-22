import styled from "styled-components";
import RainAnimation from "../components/animation/RainAnimation";
import { colFlex, rowFlex } from "../styles/flexStyles";
import NewsContents from "../components/news/NewsContents";
import ChatPanel from "../components/chat/ChatPanel";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useNewsContentsQuery } from "../hooks/useNewsQuery";
import { climateMap } from "../constants/climateMap";
import { Climate } from "../types/climate";

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
      <AnimationWrapper>{animation}</AnimationWrapper>
      <ContentsContainer>
        {response && <NewsContents newsData={response.data} />}
        <ChatPanel isVisible={isChatOpen} setIsChatOpen={setIsChatOpen} />
      </ContentsContainer>
    </Container>
  );
};

const Container = styled.div`
  padding-top: 82px;
  width: 100%;
  height: 100vh;
  ${colFlex({ justify: "start", align: "center" })}
  overflow-y: auto;
  scroll-behavior: smooth;
`;

const AnimationWrapper = styled.div`
  width: 100%;
  flex-shrink: 0;
`;

const ContentsContainer = styled.section`
  width: 100%;
  min-height: 100vh;
  ${rowFlex({ justify: "center", align: "start" })}
`;

export default NewsDetail;
