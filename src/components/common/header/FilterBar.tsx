import styled from "styled-components";
import { rowFlex } from "../../../styles/flexStyles";
import { useSearchParams } from "react-router-dom";
import { climateIcons } from "../../../constants/climateIcons";
import { Climate } from "../../../types/climate";

const FilterBar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFilter = searchParams.get("filter");

  const handleFilterClick = (id: Climate) => {
    if (currentFilter === id) {
      searchParams.delete("filter");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ filter: id });
    }
  };

  return (
    <FilterContainer>
      {climateIcons.map(({ id, icon: Icon }) => {
        return (
          <IconWrapper
            key={id}
            $active={currentFilter === id}
            onClick={() => handleFilterClick(id)}
          >
            <Icon />
          </IconWrapper>
        );
      })}
    </FilterContainer>
  );
};

const FilterContainer = styled.div`
  width: fit-content;
  height: 45px;
  gap: 8px;
  padding: 2px 6px;
  border-radius: 999px;
  ${rowFlex({ align: "center", justify: "center" })};

  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 204, 255, 0.3);
  box-shadow: 0 0 10px rgba(20, 181, 255, 0.5);
  backdrop-filter: blur(6px);
`;

const IconWrapper = styled.div<{ $active?: boolean }>`
  width: 42px;
  height: 42px;
  padding: 6px;
  ${rowFlex({ align: "center", justify: "center" })};
  cursor: pointer;
  transition: all 0.3s ease;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.gray[500]};

  svg {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

export default FilterBar;
