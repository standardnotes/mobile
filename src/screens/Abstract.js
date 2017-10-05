import React, { Component } from 'react';
import {DeviceEventEmitter, Modal, View} from 'react-native';
var _ = require('lodash')
import GlobalStyles from "../Styles"
import App from "../app"
import ApplicationState from "../ApplicationState"

export default class Abstract extends Component {

  constructor(props) {
    super(props);
    this.state = {lockContent: true};

    if(this.props.navigator) {
      this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
    }

    this._stateObserver = ApplicationState.get().addStateObserver((state) => {
      if(!this.isMounted()) {
        return;
      }

      if(state == ApplicationState.Unlocking) {
        this.unlockContent();
      }

      if(state == ApplicationState.Locking) {
        this.lockContent();
      }
    })
  }

  lockContent() {
    console.log("Locking Content");
    this.mergeState({lockContent: true});
    this.configureNavBar();
  }

  unlockContent() {
    if(!this.loadedInitialState) {
      this.loadInitialState();
    }
    console.log("Unlocking Content");
    this.mergeState({lockContent: false});
  }

  componentWillUnmount() {
    this.willUnmount = true;
    this.mounted = false;
    ApplicationState.get().removeStateObserver(this._stateObserver);
  }

  componentWillMount() {
    this.willUnmount = false;
    this.mounted = false;

    if(ApplicationState.get().isUnlocked() && this.state.lockContent) {
      this.unlockContent();
    }
  }

  componentDidMount() {
    this.mounted = true;
    this.configureNavBar(true);

    if(ApplicationState.get().isUnlocked() && !this.loadedInitialState) {
      this.loadInitialState();
    }

    if(this._renderOnMount) {
      this._renderOnMount = false;
      this.forceUpdate();

      this._renderOnMountCallback && this._renderOnMountCallback();
      this._renderOnMountCallback = null;
    }
  }

  loadInitialState() {
    this.loadedInitialState = true;
    this.configureNavBar(true);
  }

  constructState(state) {
    this.state = _.merge({lockContent: ApplicationState.get().isLocked()}, state);
  }

  mergeState(state) {
    this.setState(function(prevState){
      return _.merge(prevState, state);
    })
  }

  renderOnMount(callback) {
    if(this.isMounted()) {
      this.forceUpdate();
      callback && callback();
    } else {
      this._renderOnMount = true;
      this._renderOnMountCallback = callback;
    }
  }

  isMounted() {
    return this.mounted;
  }

  configureNavBar(initial) {

  }

  dismissModal() {
    this.props.navigator.dismissModal({animationType: "slide-down"})
  }

  dismissLightBox() {
    this.props.navigator.dismissLightBox({animationType: "slide-down"})
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
