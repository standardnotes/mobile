import React, { useCallback, useEffect, useRef } from 'react';
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

export const Chip: React.FC<Props> = ({ selected, onPress, label, last }) => {
  const animationValue = useRef(new Animated.Value(selected ? 100 : 0)).current;
  const selectedRef = useRef<boolean>(selected);

  const toggleChip = useCallback(() => {
    Animated.timing(animationValue, {
      toValue: selected ? 100 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [animationValue, selected]);

  useEffect(() => {
    if (selected !== selectedRef.current) {
      toggleChip();
      selectedRef.current = selected;
    }
  }, [selected, toggleChip]);

  return (
    <ThemeContext.Consumer>
      {theme => (
        <TouchableWithoutFeedback onPress={onPress}>
          <Container
            as={Animated.View}
            last={last}
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
              selected={selected}
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
              {label}
            </Label>
          </Container>
        </TouchableWithoutFeedback>
      )}
    </ThemeContext.Consumer>
  );
};
