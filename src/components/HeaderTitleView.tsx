import React from 'react';
import { TextStyle, Platform } from 'react-native';
import styled from 'styled-components/native';

type Props = {
  subtitleColor?: TextStyle['color'];
  title: string;
  subtitle?: string;
};

const Container = styled.View`
  background-color: ${props => props.theme.stylekitContrastBackgroundColor};
  flex: 1;
  justify-content: flex-start;
  flex-direction: column;
  align-items: ${Platform.OS === 'android' ? 'flex-start' : undefined};
`;
const Title = styled.Text`
  color: ${props => props.theme.stylekitForegroundColor};
  font-weight: 'bold';
  font-size: 18px;
  text-align: center;
`;
const SubTitle = styled.Text.attrs(() => ({
  adjustsFontSizeToFit: true,
  numberOfLines: 1,
}))<{ color?: string }>`
  color: ${props => props.color ?? props.theme.stylekitForegroundColor};
  opacity: ${props => (props.color ? 1 : 0.6)};
  font-size: ${Platform.OS === 'android' ? 13 : 12}px;
  text-align: ${Platform.OS === 'ios' ? 'center' : undefined};
`;

export const HeaderTitleView: React.FC<Props> = props => (
  <Container>
    <Title>{props.title}</Title>
    {props.subtitle && (
      <SubTitle color={props.subtitleColor}>{props.subtitle}</SubTitle>
    )}
  </Container>
);
