import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {requireNativeComponent, View, TextInput, findNodeHandle, UIManager} from 'react-native';

export default class TextView extends Component {
  constructor(props) {
    super(props);
  }

  onChangeText = (event) => {
    this.props.onChangeText(event.nativeEvent.message);
  }

  blur() {
    UIManager.dispatchViewManagerCommand(findNodeHandle(this.ref), UIManager.SNTextView.Commands.blur, []);
  }

  render() {
    return <SNTextView ref={(ref) => this.ref = ref} {...this.props} onChangeTextValue={this.onChangeText} />
  }
}

TextView.propTypes = {
  onChangeText: PropTypes.func,
  text: PropTypes.string,
  autoFocus: PropTypes.bool,
  ...TextInput.propTypes
}

var SNTextView = requireNativeComponent("SNTextView", TextView, {

});
