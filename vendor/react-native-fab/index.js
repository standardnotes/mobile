import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  Text,
  Animated,
  Easing,
  ViewPropTypes
} from 'react-native';
import { Touchable } from './src';
import { noop } from './src/utils';

const sharpEasingValues = {
  entry: Easing.bezier(0.0, 0.0, 0.2, 1),
  exit: Easing.bezier(0.4, 0.0, 0.6, 1),
};

const durationValues = {
  entry: 225,
  exit: 195,
};

const moveEasingValues = {
  entry: Easing.bezier(0.0, 0.0, 0.2, 1),
  exit: Easing.bezier(0.4, 0.0, 1, 1),
};

const styles = StyleSheet.create({
  addButton: {
    borderRadius: 50,
    alignItems: 'stretch',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 2,
    shadowOffset: {
      height: 1,
      width: 0,
    },
    elevation: 2,
  },
  fab_box: {
    position: 'absolute',
    bottom: 17,
    right: 17,
    height: 62,
    width: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
  },
  addButtonInnerView: {
    flex: 1,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default class FAB extends Component {
  static propTypes = {
    buttonColor: PropTypes.string,
    iconTextColor: PropTypes.string,
    onClickAction: PropTypes.func,
    iconTextComponent: PropTypes.element,
    visible: PropTypes.bool,
    snackOffset: PropTypes.number,
    size: PropTypes.number,
    style: ViewPropTypes.style,
  };

  static defaultProps = {
    buttonColor: 'red',
    iconTextColor: '#FFFFFF',
    onClickAction: noop,
    iconTextComponent: <Text>+</Text>,
    visible: true,
    size: 24,
    snackOffset: 0,
    style: {},
  };

  state = {
    translateValue: new Animated.Value(0),
    shiftValue: new Animated.Value(0),
  };

  componentDidMount() {
    const { translateValue, shiftValue } = this.state;
    const { visible, snackOffset } = this.props;

    if (visible) {
      translateValue.setValue(1);
    } else {
      translateValue.setValue(0);
    }
    if (snackOffset === 0) {
      shiftValue.setValue(20);
    } else {
      shiftValue.setValue(20 + snackOffset);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { translateValue, shiftValue } = this.state;
    const wasVisible = prevProps.visible;

    if ((this.props.visible) && (!wasVisible)) {
      Animated.timing(
        translateValue,
        {
          duration: durationValues.entry,
          toValue: 1,
          easing: sharpEasingValues.entry,
        },
      ).start();
    } else if ((!this.props.visible) && (wasVisible)) {
      Animated.timing(
        translateValue,
        {
          duration: durationValues.exit,
          toValue: 0,
          easing: sharpEasingValues.exit,
        },
      ).start();
    }

    if (this.props.snackOffset !== prevProps.snackOffset) {
      if (this.props.snackOffset === 0) {
        Animated.timing(
          shiftValue,
          {
            duration: durationValues.exit,
            toValue: 20,
            easing: moveEasingValues.exit,
          },
        ).start();
      } else if (this.props.snackOffset !== 0) {
        Animated.timing(
          shiftValue,
          {
            duration: durationValues.entry,
            toValue: 20 + this.props.snackOffset,
            easing: moveEasingValues.entry,
          },
        ).start();
      }
    }
  }

  render() {
    const {
      translateValue, shiftValue,
    } = this.state;
    const {
      onClickAction,
      buttonColor,
      iconTextComponent,
      iconTextColor,
      style,
    } = this.props;

    const dimensionInterpolate = translateValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 56],
    });

    const rotateInterpolate = translateValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['-90deg', '0deg'],
    });

    return (
      <Animated.View style={[styles.fab_box, { bottom: shiftValue }]}>
        <Animated.View
          style={[
            styles.addButton, {
              height: dimensionInterpolate,
              width: dimensionInterpolate,
            },
          ]}
        >
          <Touchable
            onPress={onClickAction}
            style={[styles.addButtonInnerView, style]}
            buttonColor={buttonColor}
          >
            <Animated.View
              style={{
                transform: [
                  { scaleX: translateValue },
                  { rotate: rotateInterpolate },
                ],
                fontSize: this.props.size,
                paddingTop: this.props.paddingTop,
              }}
            >
              {React.cloneElement(iconTextComponent, { style: {
                fontSize: this.props.size,
                paddingTop: this.props.paddingTop,
                color: iconTextColor,
              } })}
            </Animated.View>
          </Touchable>
        </Animated.View>
      </Animated.View>
    );
  }
}
