import styled from "styled-components";
import { colFlex, rowFlex } from "../../styles/flexStyles";
import theme from "../../styles/theme";
import { useNavigate, useSearchParams } from "react-router-dom";
import NewsSideBar from "./NewsSideBar";

interface NewsContentsProps {
  newsData: News;
}

const NewsContents = ({ newsData }: NewsContentsProps) => {
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
        <HeaderContainer>
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
  height: 100%;
  gap: 10px;
  ${rowFlex({ justify: "center", align: "start" })}
`;

const Container = styled.article`
  flex: 7;
  padding: 30px 50px;
  height: 100%;
  ${colFlex({ align: "center" })}
`;

const HeaderContainer = styled.div`
  width: 100%;
  padding: 10px 0;
  ${rowFlex({ justify: "space", align: "center" })}
`;

const LocationContainer = styled.div`
  width: 100%;
  gap: 10px;
  ${rowFlex({ justify: "space", align: "center" })}
`;

const LocationText = styled.div`
  font-size: 18px;
  padding: 5px 10px;
  border-radius: 15px;
  border: 1px solid ${theme.colors.white};
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
  font-size: 18px;
  background-color: ${({ $isActive }) => $isActive && theme.colors.primary};
  padding: 5px 10px;
  border-radius: 15px;
  border: 1px solid ${theme.colors.primary};
  color: ${theme.colors.textPrimary};
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${theme.colors.primary};
  }
`;

const NavigationArrow = styled.div`
  font-size: 24px;
  cursor: pointer;
`;

const NewsTitle = styled.div`
  width: 100%;
  padding: 30px 0 10px 0;
  font-size: 42px;
  text-align: start;
`;

const NewsDate = styled.div`
  width: 100%;
  font-size: 16px;
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
  font-size: 20px;
  overflow-wrap: break-word;
  line-height: 35px;
  padding: 20px 0;
  width: 100%;
`;

export default NewsContents;
