import styled from "styled-components";
import { rowFlex } from "../../../styles/flexStyles";
import { useNavigate } from "react-router-dom";
import { HEADER_HEIGHT } from "../../../constants/layout";
import FilterBar from "./FilterBar";
import SearchBox from "./SearchBox";

const Header = () => {
  const navigate = useNavigate();
  return (
    <HeaderContainer>
      <FilterBar />
      <RightGroup>
        <SearchBox />
        <LogoContainer>
          <div>About US</div>
          <Divider></Divider>
          <div onClick={() => navigate("/")}>U2E</div>
        </LogoContainer>
      </RightGroup>
    </HeaderContainer>
  );
};

const Divider = styled.div`
  width: 1px;
  height: 16px;
  background-color: ${({ theme }) => theme.colors.white};
`;

const RightGroup = styled.div`
  ${rowFlex({ align: "center" })}
  gap: 12px;
`;

const HeaderContainer = styled.div`
  position: fixed;
  top: 0;
  width: 100%;
  height: ${HEADER_HEIGHT}px;
  ${rowFlex({ align: "center", justify: "space" })}
  padding: 0 32px;
  z-index: 999;
  background: transparent;
  backdrop-filter: blur(8px);
`;

const LogoContainer = styled.div`
  ${rowFlex({ align: "center" })}
  gap: 24px;
  div {
    cursor: pointer;
  }
`;
export default Header;
