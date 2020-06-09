import React from 'react';
import { Platform } from 'react-native';
import styled from 'styled-components/native';
import { SectionedTableCellTouchableHighlight } from './SectionedTableCell';

type Props = {
  maxHeight?: number;
  leftAligned?: boolean;
  bold?: boolean;
  disabled?: boolean;
  important?: boolean;
  onPress: () => void;
  title?: string;
};

type ContainerProps = Pick<Props, 'maxHeight'>;
const Container = styled(SectionedTableCellTouchableHighlight).attrs(props => ({
  underlayColor: props.theme.stylekitBorderColor,
}))<ContainerProps>`
  flex: 1;
  flex-direction: column;
  padding-top: 0px;
  padding-bottom: 0px;
  justify-content: center;
  max-height: ${props => props.maxHeight ?? undefined};
`;
const ButtonContainer = styled.View``;

type ButtonLabelProps = Pick<
  Props,
  'leftAligned' | 'bold' | 'disabled' | 'important'
>;
const ButtonLabel = styled.Text<ButtonLabelProps>`
  text-align: ${props => (props.leftAligned ? 'left' : 'center')};
  text-align-vertical: center;
  color: ${props => {
    let color =
      Platform.OS === 'android'
        ? props.theme.stylekitForegroundColor
        : props.theme.stylekitInfoColor;
    if (props.disabled) {
      color = 'gray';
    } else if (props.important) {
      color = props.theme.stylekitDangerColor;
    }
    return color;
  }};
  font-size: ${props => props.theme.mainTextFontSize};
  font-weight: ${props => (props.bold ? 'bold' : undefined)};
  opacity: ${props => (props.disabled ? 0.6 : undefined)};
`;

export const ButtonCell: React.FC<Props> = props => (
  <Container disabled={props.disabled} onPress={props.onPress}>
    <ButtonContainer>
      <ButtonLabel>{props.title}</ButtonLabel>
      {props.children && props.children}
    </ButtonContainer>
  </Container>
);
