import React, { Component } from 'react';

export default class Abstract extends Component {

  constructor(props) {
    super(props);
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
  }

  configureNavBar() {

  }

  onNavigatorEvent(event) {

    switch(event.id) {
      case 'willAppear':
        console.log("===Will Appear===");
        this.willBeVisible = true;
        this.configureNavBar();
       break;
      case 'didAppear':
        console.log("===Did Appear===");
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
