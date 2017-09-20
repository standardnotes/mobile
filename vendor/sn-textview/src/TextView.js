import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {requireNativeComponent, View, TextInput} from 'react-native';

export default class TextView extends Component {
  constructor(props) {
    super(props);
  }

  onChangeText = (event) => {
    this.props.onChangeText(event.nativeEvent.message);
  }

  render() {
    return <SNTextView {...this.props} onChangeTextValue={this.onChangeText} />
  }
}

TextView.propTypes = {
  onChangeText: PropTypes.func,
  text: PropTypes.string,
  ...View.propTypes
}

var SNTextView = requireNativeComponent("SNTextView", TextView, {

});
