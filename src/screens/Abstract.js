import React, { Component } from 'react';
var _ = require('lodash')
import GlobalStyles from "../Styles"

export default class Abstract extends Component {

  constructor(props) {
    super(props);
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
  }

  mergeState(state) {
    this.setState(function(prevState){
      return _.merge(prevState, state);
    })
  }

  configureNavBar() {

  }

  onNavigatorEvent(event) {

    switch(event.id) {
      case 'willAppear':
        // console.log("===Will Appear===");
        this.willBeVisible = true;
        this.configureNavBar();
       break;
      case 'didAppear':
        // console.log("===Did Appear===");
        this.visible = true;
        break;
      case 'willDisappear':
        this.willBeVisible = false;
        break;
      case 'didDisappear':
        this.visible = false;
        break;
      }
  }

}
