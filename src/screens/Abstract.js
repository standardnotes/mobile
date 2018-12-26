import React, { Component } from 'react';
import {DeviceEventEmitter, Modal, View} from 'react-native';
import GlobalStyles from "../Styles";
import App from "../app";
import ApplicationState from "../ApplicationState";
import {Navigation} from 'react-native-navigation';

export default class Abstract extends Component {

  static options(passProps) {

    return {
      topBar: {
        visible: true,
        animate: false, // Controls whether TopBar visibility changes should be animated
        hideOnScroll: false,
        buttonColor: GlobalStyles.constants().mainTintColor,
        drawBehind: false,
        backButton: {
          visible: true,
          color: GlobalStyles.constants().mainTintColor
        },
        background: {
          color: GlobalStyles.constants().mainBackgroundColor
        },
        title: {
          color: GlobalStyles.constants().mainTextColor,
          fontWeight: 'bold'
        }
      }
    };
  }

  constructor(props) {
    super(props);

    this.state = {lockContent: true};

    Navigation.events().bindComponent(this);

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

  setTitle(title) {
    Navigation.mergeOptions(this.props.componentId, {
      topBar: {
        title: {
          text: title
        }
      }
    })
  }

  // Called by RNN
  componentDidAppear() {
    console.log("Component did appear", this);
    this.visible = true;
    this.willBeVisible = true; // Just in case willAppear isn't called for whatever reason
    this.configureNavBar(false);
    if(this.queuedSubtitle) {
      this.setNavBarSubtitle(this.queuedSubtitle);
    }
  }

  // Called by RNN
  componentDidDisappear() {
    console.log("Component did disappear", this);
    this.willBeVisible = false;
    this.visible = false;
  }

  lockContent() {
    this.mergeState({lockContent: true});
    this.configureNavBar();
  }

  unlockContent() {
    if(!this.loadedInitialState) {
      this.loadInitialState();
    }
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

  setNavBarSubtitle(title) {
    if(!this.visible || !this.willBeVisible) {
      this.queuedSubtitle = title;
      return false;
    }

    this.queuedSubtitle = null;

    console.log("Setting subtitle text", title);

    var color = GlobalStyles.constantForKey(App.isIOS ? "mainTextColor" : "navBarTextColor");
    Navigation.mergeOptions(this.props.componentId, {
      topBar: {
        subtitle: {
          text: title,
          color: GlobalStyles.hexToRGBA(color, 0.5),
          fontSize: 12
        }
      }
    });

    return true;
  }

  dismissModal() {
    Navigation.dismissModal();
  }




}
