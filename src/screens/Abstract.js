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
        this.configureNavBar();
       break;
      case 'didAppear':
        this.visible = true;
        break;
      case 'willDisappear':
        break;
      case 'didDisappear':
        this.visible = false;
        break;
      }
  }

}
