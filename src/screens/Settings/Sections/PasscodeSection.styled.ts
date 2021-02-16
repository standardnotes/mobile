import { SectionedTableCell } from '@Components/SectionedTableCell';
import styled from 'styled-components/native';

export const BaseView = styled.View``;

export const StyledSectionedTableCell = styled(SectionedTableCell)`
  padding-top: 12px;
`;

export const Subtitle = styled.Text`
  color: ${({ theme }) => theme.stylekitNeutralColor};
  font-size: 14px;
  margin-top: 4px;
`;

export const Title = styled.Text<{ first?: boolean }>`
  margin-top: ${({ first }) => (first ? '0px' : '8px')};
  color: ${({ theme }) => theme.stylekitForegroundColor};
  font-size: 14px;
  font-weight: bold;
`;
