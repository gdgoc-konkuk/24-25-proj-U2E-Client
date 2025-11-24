import styled from "styled-components";
import { colFlex, rowFlex } from "../../styles/flexStyles";
import theme from "../../styles/theme";
import { useNavigate, useSearchParams } from "react-router-dom";
import NewsSideBar from "./NewsSideBar";

interface NewsContentsProps {
  newsData: News;
  contentTopRef?: React.RefObject<HTMLDivElement | null>;
}

const NewsContents = ({ newsData, contentTopRef }: NewsContentsProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFilter = searchParams.get("filter");

  const {
    climateList,
    regionList,
    newsTitle,
    newsUrl,
    newsImageUrl,
    newsBody,
    newsDate,
    aiSolution,
    aiRelated,
  } = newsData;

  const handleClimateClick = (climate: string) => {
    setSearchParams({ filter: climate });
  };

  return (
    <PageLayout>
      <Container>
        <HeaderContainer ref={contentTopRef}>
          <LocationContainer>
            <NavigationArrow
              onClick={() => navigate("/")}
            >{`<<`}</NavigationArrow>
            <TagContainer>
              {regionList.map((region, index) => (
                <LocationText key={`region-${index}`}>{region}</LocationText>
              ))}
              <ClimateTagContainer>
                {climateList.map((climate, index) => (
                  <ClimateTag
                    key={`climate-${index}`}
                    $isActive={currentFilter === climate}
                    onClick={() => handleClimateClick(climate)}
                  >
                    {climate}
                  </ClimateTag>
                ))}
              </ClimateTagContainer>
            </TagContainer>
          </LocationContainer>
        </HeaderContainer>
        <NewsTitle>{newsTitle}</NewsTitle>
        <NewsDate>{newsDate}</NewsDate>
        {newsImageUrl && <NewsImage src={newsImageUrl} alt={newsTitle} />}{" "}
        <MainContent>{newsBody}</MainContent>
      </Container>
      <NewsSideBar
        aiSolution={aiSolution}
        aiRelated={aiRelated}
        newsUrl={newsUrl}
      />
    </PageLayout>
  );
};

const PageLayout = styled.div`
  width: 100%;
  gap: 10px;
  ${rowFlex({ justify: "center", align: "start" })}
`;

const Container = styled.article`
  flex: 7;
  padding: 30px 50px;
  ${colFlex({ align: "center" })}
`;

const HeaderContainer = styled.div`
  width: 100%;
  padding: 10px 0;
  scroll-margin-top: 100px;
  ${rowFlex({ justify: "space", align: "center" })}
`;

const LocationContainer = styled.div`
  width: 100%;
  gap: 10px;
  ${rowFlex({ justify: "space", align: "center" })}
`;

const LocationText = styled.div`
  font-size: 14px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.5px;
`;

const TagContainer = styled.div`
  gap: 10px;
  width: 100%;
  ${rowFlex({ justify: "space", align: "center" })}
`;

const ClimateTagContainer = styled.div`
  gap: 10px;
  width: 100%;
  ${rowFlex({ justify: "end", align: "center" })}
`;

const ClimateTag = styled.div<{ $isActive: boolean }>`
  font-size: 14px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.5px;

  background-color: ${({ $isActive }) =>
    $isActive ? "rgba(16, 181, 214, 0.4)" : "rgba(255, 255, 255, 0.05)"};
  border: 1px solid
    ${({ $isActive }) =>
      $isActive ? "rgba(16, 181, 214, 0.8)" : "rgba(255, 255, 255, 0.2)"};
  color: ${({ $isActive }) =>
    $isActive ? "#fff" : "rgba(255, 255, 255, 0.7)"};

  &:hover {
    background-color: ${({ $isActive }) =>
      $isActive ? "rgba(16, 181, 214, 0.6)" : "rgba(255, 255, 255, 0.15)"};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    color: #fff;
  }
`;

const NavigationArrow = styled.div`
  font-size: 24px;
  cursor: pointer;
`;

const NewsTitle = styled.div`
  width: 100%;
  padding: 30px 0 10px 0;
  font-size: 36px;
  text-align: start;
`;

const NewsDate = styled.div`
  width: 100%;
  font-size: 14px;
  color: ${theme.colors.textSecondary};
  margin-bottom: 20px;
`;

const NewsImage = styled.img`
  max-width: 100%;
  height: auto;
  margin: 20px 0;
  border-radius: 8px;
  object-fit: cover;
`;

const MainContent = styled.div`
  font-size: 18px;
  overflow-wrap: break-word;
  line-height: 35px;
  padding: 20px 0;
  width: 100%;
`;

export default NewsContents;
