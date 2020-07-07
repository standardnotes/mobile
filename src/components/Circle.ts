import { SectionedTableCell } from '@Components/SectionedTableCell';
import { ViewStyle } from 'react-native';
import styled from 'styled-components/native';

type Props = {
  size?: number;
  backgroundColor: ViewStyle['backgroundColor'];
  borderColor: ViewStyle['borderColor'];
};

export const Circle = styled(SectionedTableCell)<Props>`
  width: ${props => props.size ?? 12}px;
  height: ${props => props.size ?? 12}px;
  border-radius: ${props => (props.size ?? 12) / 2}px;
  background-color: ${props => props.backgroundColor};
  border-color: ${props => props.borderColor};
  border-width: 1px;
`;
