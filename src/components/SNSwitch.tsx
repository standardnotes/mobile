import React, { useContext } from 'react';
import { Platform, Switch, SwitchProps } from 'react-native';
import { ThemeContext } from 'styled-components';

export type SNSwitchProps = Omit<SwitchProps, 'trackColor' | 'thumbColor'>;

export const SNSwitch: React.FC<SNSwitchProps> = props => {
  const theme = useContext(ThemeContext);
  return (
    <Switch
      thumbColor={
        Platform.OS === 'android'
          ? props.value
            ? theme.stylekitInfoColor
            : theme.stylekitInfoContrastColor
          : undefined
      }
      trackColor={
        Platform.OS === 'ios'
          ? {
              false: theme.stylekitNeutralColor,
              true: theme.stylekitInfoColor,
            }
          : {
              false: theme.stylekitShadowColor,
              true: theme.stylekitShadowColor,
            }
      }
      {...props}
    />
  );
};
