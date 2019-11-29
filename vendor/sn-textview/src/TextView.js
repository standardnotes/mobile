import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DeprecatedColorPropType } from 'react-native';
import {requireNativeComponent, View, TextInput, findNodeHandle, UIManager, Platform} from 'react-native';

export default class TextView extends Component {
  constructor(props) {
    super(props);
  }

  onChangeText = (event) => {
    this.props.onChangeText(event.nativeEvent.text);
  }

  blur() {
    let command = UIManager.getViewManagerConfig('SNTextView').Commands.blur;
    UIManager.dispatchViewManagerCommand(findNodeHandle(this.ref), command, []);
  }

  focus() {
    this.ref.focus();
  }

  render() {
    if(Platform.OS == "android") {
      const container =
        <SNTextView
          {...this.props}
          ref={(ref) => this.ref = ref}
          text={this.props.value}
          onChangeText={this.onChangeText}
        />
      return container;
    } else {
      return (
        <SNTextView
          {...this.props}
          ref={(ref) => this.ref = ref}
          text={this.props.value}
          onChangeText={this.onChangeText}
        />
      )

    }
  }
}

TextView.propTypes = {
  onChangeText: PropTypes.func,
  text: PropTypes.string,
  autoFocus: PropTypes.bool,
  editable: PropTypes.bool,
  handlesColor: DeprecatedColorPropType,
  keyboardDismissMode: PropTypes.oneOf([
      'none', // default
      'on-drag', // Cross-platform
      'interactive', // iOS-only
    ]),
  ...TextInput.propTypes
}

var SNTextView = requireNativeComponent("SNTextView", TextView, {

});
