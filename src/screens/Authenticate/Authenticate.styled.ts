import { SectionedTableCell } from '@Components/SectionedTableCell';
import styled, { css } from 'styled-components/native';

export const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
`;

export const BaseView = styled.View``;

export const StyledSectionedTableCell = styled(SectionedTableCell)`
  padding-top: 12px;
`;

export const Title = styled.Text`
  color: ${({ theme }) => theme.stylekitNeutralColor};
  font-size: 14px;
  font-weight: bold;
  margin-top: 4px;
`;

export const Subtitle = styled.Text`
  color: ${({ theme }) => theme.stylekitNeutralColor};
  font-size: 14px;
  margin-top: 4px;
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
