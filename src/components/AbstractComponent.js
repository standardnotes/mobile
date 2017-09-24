import React, { Component } from 'react';
import {TextInput, View} from 'react-native';
var _ = require('lodash')

export default class AbstractComponent extends Component {

  mergeState(state) {
    this.setState(function(prevState){
      return _.merge(prevState, state);
    })
  }


}
