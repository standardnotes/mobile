import React, { Component } from 'react';
var _ = require('lodash')
import GlobalStyles from "../Styles"

export default class Abstract extends Component {

  constructor(props) {
    super(props);
    this.initialLoad = true;
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
  }

  mergeState(state) {
    this.setState(function(prevState){
      return _.merge(prevState, state);
    })
  }

  configureNavBar(initial) {

  }

  onNavigatorEvent(event) {

    switch(event.id) {
      case 'willAppear':
        this.willBeVisible = true;
        this.configureNavBar(this.initialLoad);
        if(this.initialLoad) {
          this.initialLoad = false;
        }
       break;
      case 'didAppear':
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
