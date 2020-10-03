import styled, { css } from 'styled-components/native';

export const Container = styled.View`
  flex: 1;
  flex-direction: row;
`;
export const NotesContainer = styled.View<{
  shouldSplitLayout?: boolean;
  notesListCollapsed?: boolean;
}>`
  ${({ shouldSplitLayout, notesListCollapsed, theme }) =>
    shouldSplitLayout
      ? css`
          border-right-color: ${theme.stylekitBorderColor};
          border-right-width: ${notesListCollapsed ? 0 : 1}px;
          width: ${notesListCollapsed ? 0 : '40%'};
        `
      : css`
          flex: 1;
        `}
`;
export const ComposeContainer = styled.View`
  flex: 1;
`;

export const ExpandTouchable = styled.TouchableHighlight.attrs(({ theme }) => ({
  underlayColor: theme.stylekitBackgroundColor,
}))`
  /* background-color: black; */
  justify-content: center;
  position: absolute;
  left: 0px;
  padding: 7px;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  margin-top: -12px;
`;

export const iconNames = {
  md: ['arrow-dropright', 'arrow-dropleft'],
  ios: ['arrow-forward', 'arrow-back'],
};
