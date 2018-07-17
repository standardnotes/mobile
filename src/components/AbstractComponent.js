import React, { Component } from 'react';
import {TextInput, View} from 'react-native';

export default class AbstractComponent extends Component {

  mergeState(state) {
    this.setState(function(prevState){
      return _.merge(prevState, state);
    })
  }


}
