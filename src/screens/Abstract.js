import React, { Component } from 'react';
import {DeviceEventEmitter, Modal} from 'react-native';
var _ = require('lodash')
import GlobalStyles from "../Styles"
import App from "../app"
import Authenticate from "./Authenticate"

export default class Abstract extends Component {

  constructor(props) {
    super(props);
    this.state = {};
    this.initialLoad = true;

    if(this.props.navigator) {
      this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));
    }

    this.lockObserver = App.get().addLockStatusObserver((lock, unlock) => {
      if(!this.isMounted()) {
        this.authenticated = unlock;
        return;
      }

      if(lock == true) {
        this.lockContent();
      } else if(unlock == true) {
        this.unlockContent();
      }
    })
  }

  constructState(state) {
    this.state = _.merge({lockContent: !App.isAuthenticated}, state);
  }

  lockContent() {
    this.mergeState({lockContent: true});
  }

  unlockContent() {
    this.mergeState({lockContent: false});
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

  componentWillUnmount() {
    this.willUnmount = true;
    App.get().removeLockStatusObserver(this.lockObserver);
  }

  componentWillMount() {
    this.willUnmount = false;
    this.mounted = false;

    if(this.authenticated && this.state.lockContent) {
      // observer was called before component was mounted
      this.unlockContent();
    }
  }

  componentDidMount() {
    this.mounted = true;
    this.configureNavBar(true);

    if(this._renderOnMount) {
      this._renderOnMount = false;
      this.forceUpdate();

      this._renderOnMountCallback && this._renderOnMountCallback();
      this._renderOnMountCallback = null;
    }
  }

  loadInitialState() {
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

  // render() {
    // if(!this.rendersLockscreen) {
      // return (<View></View>);
    // }
    //
    // var props = App.get().getAuthenticationProps();
    //
    // return (
    //   <Modal
    //     animationType="slide"
    //     transparent={false}
    //     key={Math.random}
    //     visible={this.state.lockContent}
    //     onRequestClose={() => {alert("Modal has been closed.")}}>
    //
    //     <Authenticate
    //       title={props.title}
    //       onAuthenticateSuccess={props.onAuthenticate}
    //       mode={"authenticate"}
    //       requirePasscode={props.passcode}
    //       requireFingerprint={props.fingerprint}
    //       pseudoModal={true}
    //       key={Math.random}
    //     />
    //
    //   </Modal>
    // )
  // }

}
