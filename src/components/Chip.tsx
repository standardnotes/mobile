import React, { useRef } from 'react';
import { Animated } from 'react-native';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import styled, { css, ThemeContext } from 'styled-components/native';

type Props = {
  selected: boolean;
  onPress: () => void;
  label: string;
  last?: boolean;
};

const Container = styled.View<{
  last?: boolean;
}>`
  border-radius: 100px;
  padding: 5px 10px;
  border-width: 1px;
  ${({ last }) =>
    !last &&
    css`
      margin-right: 8px;
    `};
`;

const Label = styled.Text<{ selected: boolean }>`
  font-size: 14px;
`;

export const Chip: React.FC<Props> = props => {
  const animationValue = useRef(new Animated.Value(props.selected ? 100 : 0))
    .current;

  const toggleChip = () => {
    Animated.timing(animationValue, {
      toValue: props.selected ? 0 : 100,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const onPress = () => {
    toggleChip();
    props.onPress();
  };

  return (
    <ThemeContext.Consumer>
      {theme => (
        <TouchableWithoutFeedback onPress={onPress}>
          <Container
            as={Animated.View}
            last={props.last}
            style={{
              backgroundColor: animationValue.interpolate({
                inputRange: [0, 100],
                outputRange: [
                  theme.stylekitInfoContrastColor,
                  theme.stylekitInfoColor,
                ],
              }),
              borderColor: animationValue.interpolate({
                inputRange: [0, 100],
                outputRange: [
                  theme.stylekitBorderColor,
                  theme.stylekitInfoColor,
                ],
              }),
            }}
          >
            <Label
              as={Animated.Text}
              selected={props.selected}
              style={{
                color: animationValue.interpolate({
                  inputRange: [0, 100],
                  outputRange: [
                    theme.stylekitNeutralColor,
                    theme.stylekitNeutralContrastColor,
                  ],
                }),
              }}
            >
              {props.label}
            </Label>
          </Container>
        </TouchableWithoutFeedback>
      )}
    </ThemeContext.Consumer>
  );
};
