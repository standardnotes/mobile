import React from 'react';
import styled, { css } from 'styled-components/native';

type Props = {
  selected: boolean;
  onPress: () => void;
  label: string;
  last?: boolean;
};

const Container = styled.TouchableOpacity<{
  selected: boolean;
  last?: boolean;
}>`
  border-radius: 100px;
  padding: 5px 10px;
  border-width: 1px;
  background-color: ${({ selected, theme }) =>
    selected ? theme.stylekitInfoColor : theme.stylekitInfoContrastColor}
  border-color: ${({ selected, theme }) =>
    selected ? theme.stylekitInfoColor : theme.stylekitBorderColor}
    ${({ last }) =>
      !last &&
      css`
        margin-right: 8px;
      `};
`;

const Label = styled.Text<{ selected: boolean }>`
  font-size: 14px;
  color: ${({ selected, theme }) =>
    selected ? theme.stylekitNeutralContrastColor : theme.stylekitNeutralColor};
`;

export const Chip: React.FC<Props> = props => (
  <Container
    selected={props.selected}
    onPress={props.onPress}
    last={props.last}
  >
    <Label selected={props.selected}>{props.label}</Label>
  </Container>
);
