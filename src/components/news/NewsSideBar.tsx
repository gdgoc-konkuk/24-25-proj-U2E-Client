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
  padding: 25px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  ${colFlex({ align: "start" })}
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    border-color: rgba(16, 181, 214, 0.5);
  }
`;

const SolutionHeader = styled.h2`
  font-size: 22px;
  font-weight: bold;
  color: ${theme.colors.textPrimary};
  margin-bottom: 15px;
`;

const SolutionContent = styled.div`
  font-size: 16px;
  line-height: 26px;
  font-weight: 500;
  color: ${theme.colors.textSecondary};
`;

const RelatedNewsLink = styled.a`
  display: inline-block;
  background: rgba(0, 99, 166, 0.3);
  color: ${theme.colors.textPrimary};
  padding: 12px 16px;
  border-radius: 12px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  margin-top: 8px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(16, 181, 214, 0.4);
    border-color: rgba(16, 181, 214, 0.6);
    transform: translateX(5px);
  }
`;

const Container = styled.div`
  flex: 3;
  padding: 30px 20px 30px 0;
  ${colFlex({ align: "start" })}
`;

const LinkCard = styled.div`
  border-radius: 20px;
  padding: 25px;
  width: 100%;
  ${colFlex({ align: "start" })}
  gap: 15px;
  margin-top: 30px;
  
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    border-color: rgba(16, 181, 214, 0.5);
  }
`;

const RelatedNewsCard = styled.div`
  border-radius: 20px;
  padding: 25px;
  width: 100%;
  ${colFlex({ align: "start" })}
  gap: 15px;
  margin-top: 30px;

  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    border-color: rgba(16, 181, 214, 0.5);
  }
`;

const LinkCardTitle = styled.h3`
  font-size: 22px;
  font-weight: bold;
  color: ${theme.colors.textPrimary};
`;

const LinkDescription = styled.p`
  font-size: 16px;
  font-weight: 500;
  color: ${theme.colors.textSecondary};
`;

const LinkButton = styled.a`
  display: inline-block;
  background: rgba(16, 181, 214, 0.2);
  color: ${theme.colors.textPrimary};
  padding: 12px 20px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  margin-top: 10px;
  border: 1px solid rgba(16, 181, 214, 0.4);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(16, 181, 214, 0.4);
    box-shadow: 0 0 15px rgba(16, 181, 214, 0.3);
    transform: translateY(-2px);
  }
`;

export default NewsSideBar;
