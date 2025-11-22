import styled from "styled-components";
import theme from "../../styles/theme";
import { colFlex } from "../../styles/flexStyles";

interface NewsSideBarProps {
  newsUrl: string;
  aiSolution: string;
  aiRelated: AIRelated[];
}

const NewsSideBar = ({ newsUrl, aiSolution, aiRelated }: NewsSideBarProps) => {
  const hasRelatedNews = aiRelated && aiRelated.length > 0;

  return (
    <Container>
      {newsUrl && (
        <LinkCard>
          <LinkCardTitle>Original Article</LinkCardTitle>
          <LinkDescription>Check the source of this article</LinkDescription>
          <LinkButton href={newsUrl} target="_blank" rel="noopener noreferrer">
            View Original Article
          </LinkButton>
        </LinkCard>
      )}

      {aiSolution && (
        <SolutionContainer>
          <SolutionHeader>Proposed Solutions (by Gemma)</SolutionHeader>
          <SolutionContent>{aiSolution}</SolutionContent>
        </SolutionContainer>
      )}

      {hasRelatedNews && (
        <RelatedNewsCard>
          <LinkCardTitle>Related News (by Gemini)</LinkCardTitle>
          <LinkDescription>
            Explore related articles on this topic
          </LinkDescription>
          {aiRelated.map((news, index) => (
            <RelatedNewsLink
              key={index}
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Related Article {index + 1}
            </RelatedNewsLink>
          ))}
        </RelatedNewsCard>
      )}
    </Container>
  );
};

const SolutionContainer = styled.div`
  width: 100%;
  margin-top: 20px;
  padding: 20px;
  border: 2px solid ${theme.colors.secondary};
  border-radius: 10px;
  background-color: rgba(0, 99, 166, 0.1);
  ${colFlex({ align: "start" })}
`;

const SolutionHeader = styled.h2`
  font-size: 24px;
  font-weight: bold;
  color: ${theme.colors.textPrimary};
  margin-bottom: 15px;
`;

const SolutionContent = styled.div`
  font-size: 18px;
  line-height: 26px;
  font-weight: 500;
  color: ${theme.colors.textSecondary};
`;

const RelatedNewsLink = styled.a`
  display: inline-block;
  background-color: ${theme.colors.secondary};
  color: ${theme.colors.textPrimary};
  padding: 8px 12px;
  border-radius: 5px;
  text-decoration: none;
  font-size: 14px;
  margin-top: 5px;
  width: 100%;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: ${theme.colors.primary};
  }
`;

const Container = styled.div`
  flex: 3;
  padding: 30px 20px 30px 0;
  ${colFlex({ align: "start" })}
`;

const LinkCard = styled.div`
  border: 2px solid ${theme.colors.primary};
  border-radius: 10px;
  padding: 20px;
  width: 100%;
  ${colFlex({ align: "start" })}
  gap: 15px;
  margin-top: 30px;
`;

const RelatedNewsCard = styled.div`
  border: 2px solid ${theme.colors.secondary};
  border-radius: 10px;
  padding: 20px;
  width: 100%;
  ${colFlex({ align: "start" })}
  gap: 15px;
  margin-top: 30px;
`;

const LinkCardTitle = styled.h3`
  font-size: 24px;
  font-weight: bold;
  color: ${theme.colors.textPrimary};
`;

const LinkDescription = styled.p`
  font-size: 18px;
  font-weight: 500;
  color: ${theme.colors.textSecondary};
`;

const LinkButton = styled.a`
  display: inline-block;
  background-color: ${theme.colors.primary};
  color: ${theme.colors.textPrimary};
  padding: 10px 15px;
  border-radius: 5px;
  text-decoration: none;
  font-weight: medium;
  font-size: 14px;
  margin-top: 10px;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: ${theme.colors.secondary};
  }
`;

export default NewsSideBar;
