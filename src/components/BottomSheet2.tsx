import React, { Component } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import {
  NativeViewGestureHandler,
  PanGestureHandler,
  PanGestureHandlerStateChangeEvent,
  State,
  TapGestureHandler,
} from 'react-native-gesture-handler';

const USE_NATIVE_DRIVER = true;

const HEADER_HEIGHT = 50;
const windowHeight = Dimensions.get('window').height;
const SNAP_POINTS_FROM_TOP = [windowHeight * 0.4, windowHeight];

class BottomSheet2 extends Component<
  {
    onDismiss: () => void;
    children: (dismiss: () => void) => any;
  },
  {
    lastSnap: number;
  }
> {
  masterdrawer = React.createRef<TapGestureHandler>();
  drawer = React.createRef<PanGestureHandler>();
  drawerheader = React.createRef<PanGestureHandler>();
  scroll = React.createRef<NativeViewGestureHandler>();
  _lastScrollYValue: number;
  _lastScrollY: Animated.Value;
  _onRegisterLastScroll: (...args: any[]) => void;
  _dragY: Animated.Value;
  _onGestureEvent: (...args: any[]) => void;
  _reverseLastScrollY: Animated.AnimatedMultiplication;
  _translateYOffset: Animated.Value;
  _translateY: Animated.AnimatedAddition;

  constructor(props: any) {
    super(props);
    const START = SNAP_POINTS_FROM_TOP[0];
    const END = SNAP_POINTS_FROM_TOP[SNAP_POINTS_FROM_TOP.length - 1];

    this.state = {
      lastSnap: START,
    };

    this._lastScrollYValue = 0;
    this._lastScrollY = new Animated.Value(0);
    this._onRegisterLastScroll = Animated.event(
      [{ nativeEvent: { contentOffset: { y: this._lastScrollY } } }],
      { useNativeDriver: USE_NATIVE_DRIVER }
    );
    this._lastScrollY.addListener(({ value }) => {
      this._lastScrollYValue = value;
    });

    this._dragY = new Animated.Value(0);
    this._onGestureEvent = Animated.event(
      [{ nativeEvent: { translationY: this._dragY } }],
      { useNativeDriver: USE_NATIVE_DRIVER }
    );

    this._reverseLastScrollY = Animated.multiply(
      new Animated.Value(-1),
      this._lastScrollY
    );

    this._translateYOffset = new Animated.Value(END);
    this._translateY = Animated.add(
      this._translateYOffset,
      Animated.add(this._dragY, this._reverseLastScrollY)
    ).interpolate({
      inputRange: [START, END],
      outputRange: [START, END],
      extrapolate: 'clamp',
    });
  }
  componentDidMount() {
    Animated.timing(this._translateYOffset, {
      duration: 250,
      easing: Easing.out(Easing.quad),
      toValue: SNAP_POINTS_FROM_TOP[0],
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }
  dismiss = () => {
    Animated.timing(this._translateYOffset, {
      duration: 200,
      easing: Easing.out(Easing.quad),
      toValue: SNAP_POINTS_FROM_TOP[1],
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(() => {
      this.props.onDismiss();
    });
  };
  _onHeaderHandlerStateChange = ({
    nativeEvent,
  }: PanGestureHandlerStateChangeEvent) => {
    if (nativeEvent.oldState === State.BEGAN) {
      this._lastScrollY.setValue(0);
    }
    this._onHandlerStateChange({ nativeEvent });
  };
  _onHandlerStateChange = ({
    nativeEvent,
  }: PanGestureHandlerStateChangeEvent) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      let { velocityY, translationY } = nativeEvent;
      translationY -= this._lastScrollYValue;
      const dragToss = 0.05;
      const endOffsetY =
        this.state.lastSnap + translationY + dragToss * velocityY;

      let destSnapPoint = SNAP_POINTS_FROM_TOP[0];
      for (const snapPoint of SNAP_POINTS_FROM_TOP) {
        const distFromSnap = Math.abs(snapPoint - endOffsetY);
        if (distFromSnap < Math.abs(destSnapPoint - endOffsetY)) {
          destSnapPoint = snapPoint;
        }
      }
      this.setState({ lastSnap: destSnapPoint });
      this._translateYOffset.extractOffset();
      this._translateYOffset.setValue(translationY);
      this._translateYOffset.flattenOffset();
      this._dragY.setValue(0);
      Animated.spring(this._translateYOffset, {
        velocity: velocityY,
        tension: 68,
        friction: 12,
        toValue: destSnapPoint,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(() => {});
      if (destSnapPoint === SNAP_POINTS_FROM_TOP[1]) {
        this.props.onDismiss();
      }
    }
  };
  render() {
    return (
      <TapGestureHandler
        maxDurationMs={100000}
        ref={this.masterdrawer}
        maxDeltaY={this.state.lastSnap - SNAP_POINTS_FROM_TOP[0]}
      >
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {
            <TapGestureHandler
              waitFor={[this.drawer, this.drawerheader, this.scroll]}
              onHandlerStateChange={event => {
                event.nativeEvent.state === State.END && this.dismiss();
              }}
            >
              <Animated.View style={[StyleSheet.absoluteFillObject]} />
            </TapGestureHandler>
          }
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                transform: [{ translateY: this._translateY }],
              },
            ]}
          >
            <PanGestureHandler
              ref={this.drawerheader}
              simultaneousHandlers={[this.scroll, this.masterdrawer]}
              shouldCancelWhenOutside={false}
              onGestureEvent={this._onGestureEvent}
              // onGestureEvent={() => console.log('matrix woah')}
              onHandlerStateChange={this._onHeaderHandlerStateChange}
            >
              <Animated.View style={styles.header} />
            </PanGestureHandler>
            <PanGestureHandler
              ref={this.drawer}
              simultaneousHandlers={[this.scroll, this.masterdrawer]}
              shouldCancelWhenOutside={false}
              onGestureEvent={this._onGestureEvent}
              // onGestureEvent={() => console.log('matrix woah')}
              onHandlerStateChange={this._onHandlerStateChange}
            >
              <Animated.View style={styles.container}>
                <NativeViewGestureHandler
                  ref={this.scroll}
                  waitFor={this.masterdrawer}
                  simultaneousHandlers={this.drawer}
                >
                  <Animated.ScrollView
                    style={[
                      styles.scrollView,
                      { marginBottom: SNAP_POINTS_FROM_TOP[0] },
                    ]}
                    bounces={false}
                    onScrollBeginDrag={this._onRegisterLastScroll}
                    scrollEventThrottle={1}
                  >
                    {this.props.children(this.dismiss)}
                  </Animated.ScrollView>
                </NativeViewGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </View>
      </TapGestureHandler>
    );
  }
}

export const BottomSheet = BottomSheet2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {},
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: 'white',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
});
