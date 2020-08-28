import { SectionedTableCell } from '@Components/SectionedTableCell';
import styled from 'styled-components/native';

export const Container = styled.SafeAreaView`
  flex: 1;
  background-color: ${({ theme }) => theme.stylekitBackgroundColor};
`;

export const StyledSectionedTableCell = styled(SectionedTableCell)`
  padding-top: 12px;
`;

export const ScrollContainer = styled.ScrollView``;

export const Section = styled.View`
  margin-bottom: 8px;
`;

export const CellText = styled.Text`
  line-height: 19px;
  font-size: 16px;
  color: ${({ theme }) => theme.stylekitForegroundColor};
`;

export const AboutText = styled(CellText)`
  margin-bottom: 8px;
`;
