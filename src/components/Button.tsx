import React from 'react';
import styled from 'styled-components/native';

type Props = {
  onPress: () => void;
  label: string;
};

const ButtonContainer = styled.TouchableHighlight`
  background-color: ${({ theme }) => theme.stylekitInfoColor};
  padding: 12px 24px;
  border-radius: 4px;
  align-self: center;
`;

const ButtonLabel = styled.Text`
  text-align: center;
  text-align-vertical: center;
  color: ${({ theme }) => theme.stylekitInfoContrastColor};
  font-size: ${props => props.theme.mainTextFontSize}px;
`;

export const Button: React.FC<Props> = props => (
  <ButtonContainer onPress={props.onPress}>
    <ButtonLabel>{props.label}</ButtonLabel>
  </ButtonContainer>
);
