import styled, { css } from 'styled-components/native';

export const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
`;

export const Input = styled.TextInput.attrs(({ theme }) => ({
  placeholderTextColor: theme.stylekitNeutralColor,
}))`
  font-size: ${({ theme }) => theme.mainTextFontSize}px;
  padding: 0px;
  color: ${({ theme }) => theme.stylekitForegroundColor};
  height: 100%;
`;

export const SectionContainer = styled.View<{ last: boolean }>`
  ${({ last }) =>
    !last &&
    css`
      margin-top: 10px;
    `}
`;

export const SourceContainer = styled.View``;

export const SessionLengthContainer = styled.View`
  margin-top: 10px;
`;
