import { Circle } from '@Components/Circle';
import { Icon } from '@Components/Icon';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components/native';
import {
  CellContent,
  IconAscii,
  IconCircleContainer,
  IconContainerLeft,
  IconContainerRight,
  IconGraphicContainer,
  SubText,
  SubTextContainer,
  Text,
  TextContainer,
  Touchable,
} from './SideMenuCell.styled';
import { SideMenuOption } from './SideMenuSection';

const renderIcon = (desc: SideMenuOption['iconDesc'], color: string) => {
  if (!desc) {
    return null;
  }

  if (desc.type === 'ascii') {
    return <IconAscii>{desc.value}</IconAscii>;
  } else if (desc.type === 'circle') {
    return (
      <IconCircleContainer>
        <Circle
          backgroundColor={desc.backgroundColor}
          borderColor={desc.borderColor}
        />
      </IconCircleContainer>
    );
  } else {
    return (
      <IconGraphicContainer>
        <Icon type={desc.type} size={desc.size ?? 20} color={color} />
      </IconGraphicContainer>
    );
  }
};

export const SideMenuCell: React.FC<SideMenuOption> = props => {
  const theme = useContext(ThemeContext);
  const colorForTextClass = (textClass: SideMenuOption['textClass']) => {
    if (!textClass) {
      return undefined;
    }

    return {
      info: theme.stylekitInfoColor,
      danger: theme.stylekitDangerColor,
      warning: theme.stylekitWarningColor,
    }[textClass];
  };

  const hasIcon = props.iconDesc;
  const iconSide =
    hasIcon && props.iconDesc?.side
      ? props.iconDesc.side
      : hasIcon
      ? 'left'
      : null;
  return (
    <Touchable
      isSubtext={Boolean(props.subtext)}
      onPress={props.onSelect}
      onLongPress={props.onLongPress}
    >
      <CellContent iconSide={iconSide}>
        {iconSide === 'left' && (
          <IconContainerLeft>
            {renderIcon(props.iconDesc, theme.stylekitInfoColor)}
          </IconContainerLeft>
        )}

        <TextContainer
          selected={props.selected}
          isSubtext={Boolean(props.subtext)}
        >
          {props.subtext && (
            <SubTextContainer>
              <SubText>{props.subtext}</SubText>
            </SubTextContainer>
          )}
          <Text textColor={colorForTextClass(props.textClass)}>
            {props.text}
          </Text>
        </TextContainer>

        {props.children}

        {iconSide === 'right' && (
          <IconContainerRight>
            {renderIcon(props.iconDesc, theme.stylekitInfoColor)}
          </IconContainerRight>
        )}
      </CellContent>
    </Touchable>
  );
};
