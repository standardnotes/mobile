import React, { Component } from 'react';
import {DeviceEventEmitter} from 'react-native';
var _ = require('lodash')
import GlobalStyles from "../Styles"
import App from "../app"

export default class Abstract extends Component {

  constructor(props) {
    super(props);
    this.initialLoad = true;
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));

    this.lockObserver = App.get().addLockStatusObserver((lock, unlock) => {
      if(!this.isMounted()) {
        return;
      }

      if(lock == true) {
        this.mergeState({lockContent: true});
      } else if(unlock == true) {
        this.mergeState({lockContent: false});
      }
    })
  }

  mergeState(state) {
    this.setState(function(prevState){
      return _.merge(prevState, state);
    })
  }

  componentWillUnmount() {
    this.willUnmount = true;
    App.get().removeLockStatusObserver(this.lockObserver);
  }

  componentWillMount() {
    this.willUnmount = false;
    this.mounted = false;
  }

  loadInitialState() {
    this.configureNavBar(true);
  }

  componentDidMount() {
    this.mounted = true;
    this.configureNavBar(true);
  }

  isMounted() {
    return this.mounted;
  }

  configureNavBar(initial) {

  }

  dismissModal() {
    this.props.navigator.dismissModal({animationType: "slide-down"})
  }

  viewDidAppear() {
    this.visible = true;
  }

  onNavigatorEvent(event) {

    switch(event.id) {
      case 'willAppear':
        this.willBeVisible = true;
        this.configureNavBar(false);
       break;
      case 'didAppear':
        this.viewDidAppear();
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
