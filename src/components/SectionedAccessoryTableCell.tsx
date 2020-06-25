import React, { useContext } from 'react';
import { Platform } from 'react-native';
import { SectionedTableCellTouchableHighlight } from '@Components/SectionedTableCell';

import Icon from 'react-native-vector-icons/Ionicons';
import styled, { ThemeContext, css } from 'styled-components/native';

type Props = {
  disabled?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  iconName?: string;
  selected?: () => boolean;
  leftAlignIcon?: boolean;
  color?: string;
  bold?: boolean;
  tinted?: boolean;
  dimmed?: boolean;
  text: string;
};

const TouchableContainer = styled(SectionedTableCellTouchableHighlight).attrs(
  props => ({
    underlayColor: props.theme.stylekitBorderColor,
  })
)`
  flex: 1;
  flex-direction: column;
  padding-top: 0px;
  padding-bottom: 0px;
  min-height: 47px;
  background-color: transparent;
`;
const ContentContainer = styled.View<Pick<Props, 'leftAlignIcon'>>`
  flex: 1;
  justify-content: ${props =>
    props.leftAlignIcon ? 'flex-start' : 'space-between'};
  flex-direction: row;
  align-items: center;
`;
const IconContainer = styled.View`
  width: 30px;
  max-width: 30px;
`;
type LabelProps = Pick<
  Props,
  'bold' | 'tinted' | 'dimmed' | 'selected' | 'color'
>;
const Label = styled.Text<LabelProps>`
  min-width: 80%;
  color: ${props => {
    let color = props.theme.stylekitForegroundColor;
    if (props.tinted) {
      color = props.theme.stylekitInfoColor;
    }
    if (props.dimmed) {
      color = props.theme.stylekitNeutralColor;
    }
    if (props.color) {
      color = color;
    }
    return color;
  }};
  font-size: ${props => props.theme.mainTextFontSize}px;
  ${({ bold, selected }) =>
    ((selected && selected() === true) || bold) &&
    css`
      font-weight: bold;
    `};
`;

export const SectionedAccessoryTableCell: React.FC<Props> = props => {
  const themeContext = useContext(ThemeContext);
  const onPress = () => {
    if (props.disabled) {
      return;
    }

    props.onPress();
  };

  const onLongPress = () => {
    if (props.disabled) {
      return;
    }

    if (props.onLongPress) {
      props.onLongPress();
    }
  };

  const checkmarkName =
    Platform.OS === 'android' ? 'md-checkbox' : 'ios-checkmark-circle';
  const iconName = props.iconName
    ? props.iconName
    : props.selected && props.selected()
    ? checkmarkName
    : null;

  const left = props.leftAlignIcon;
  let iconSize = left ? 25 : 30;
  let color = left
    ? themeContext.stylekitForegroundColor
    : themeContext.stylekitInfoColor;

  if (Platform.OS === 'android') {
    iconSize -= 5;
  }

  if (props.color) {
    color = props.color;
  }
  let icon = null;

  if (iconName) {
    icon = (
      <IconContainer>
        <Icon name={iconName} size={iconSize} color={color} />
      </IconContainer>
    );
  }

  const textWrapper = <Label key={1}>{props.text}</Label>;

  return (
    <TouchableContainer onPress={onPress} onLongPress={onLongPress}>
      <ContentContainer>
        {props.leftAlignIcon ? [icon, textWrapper] : [textWrapper, icon]}
      </ContentContainer>
    </TouchableContainer>
  );
};
