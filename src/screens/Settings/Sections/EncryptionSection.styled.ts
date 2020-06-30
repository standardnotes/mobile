import styled from 'styled-components/native';
import { SectionedTableCell } from '@Components/SectionedTableCell';

export const BaseView = styled.View``;

export const StyledSectionedTableCell = styled(SectionedTableCell)`
  padding-top: 12px;
`;

export const Title = styled.Text`
  ${({ theme }) => theme.stylekitForegroundColor};
  font-size: 16px;
  font-weight: bold;
`;

export const Subtitle = styled.Text`
  ${({ theme }) => theme.stylekitNeutralColor};
  font-size: 14px;
  margin-top: 4px;
`;
