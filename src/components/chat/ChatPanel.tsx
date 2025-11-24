import styled, { css, keyframes } from "styled-components";
import Comments from "./Comments";
import { colFlex, rowFlex } from "../../styles/flexStyles";
import ChatPanelFrameSvg from "../../assets/svgs/ChatPanelFrame.svg?react";
import ChatIcon from "../../assets/svgs/ChatIcon.svg?react";
import UserInput from "./UserInput";
import theme from "../../styles/theme";

interface ChatPanelProps {
  isVisible: boolean;
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

function ChatPanel({ isVisible, setIsChatOpen }: ChatPanelProps) {
  return (
    <>
      {!isVisible && (
        <ToggleButton onClick={() => setIsChatOpen(true)}>
          <ChatIcon width="24px" height="24px" />
        </ToggleButton>
      )}

      <Container $isVisible={isVisible}>
        <SVGFrameWrapper>
          <ChatPanelFrameSvg width="100%" preserveAspectRatio="none" />
        </SVGFrameWrapper>
        <ContentContainer>
          <ChatHeader>
            <ChatTitle>{`>> Comments`}</ChatTitle>
            <CloseButton onClick={() => setIsChatOpen(false)}>✕</CloseButton>
          </ChatHeader>
          <Comments />
          <UserInput />
        </ContentContainer>
      </Container>
    </>
  );
}

export default ChatPanel;

const accordionIn = keyframes`
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    max-height: 650px;
    transform: translateY(0);
  }
`;

const accordionOut = keyframes`
  from {
    opacity: 1;
    max-height: 650px;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    max-height: 0;
    transform: translateY(50px);
  }
`;

const Container = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 382px;
  height: 552px;
  z-index: 1000;
  overflow: hidden;
  backdrop-filter: blur(10px);

  ${({ $isVisible }) =>
    $isVisible
      ? css`
          animation: ${accordionIn} 0.3s ease-in forwards;
        `
      : css`
          animation: ${accordionOut} 0.3s ease-in forwards;
        `}
`;

const ToggleButton = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid ${theme.colors.secondary};
  background-color: rgba(0, 0, 0, 0.6);
  color: ${theme.colors.primary};
  font-size: 24px;
  ${rowFlex({ justify: "center", align: "center" })}
  z-index: 1001;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: rgba(0, 0, 0, 0.8);
    transform: scale(1.1);
  }
`;

const SVGFrameWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const ContentContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  padding: 15px;
  gap: 15px;
  ${colFlex({ justify: "space", align: "center" })}
  z-index: 1;
`;

const ChatHeader = styled.header`
  width: 100%;
  padding: 5px;
  color: white;
  ${rowFlex({ justify: "space", align: "center" })}
`;

const ChatTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  width: 24px;
  height: 24px;
  ${colFlex({ justify: "center", align: "center" })}

  &:hover {
    opacity: 0.8;
  }
`;
