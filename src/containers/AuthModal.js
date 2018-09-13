import React, { Component } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, ScrollView, Text, Modal, AppState } from 'react-native';
import NoteCell from "./NoteCell"
import Search from 'react-native-search-box'
import GlobalStyles from "../Styles"
import App from "../app"
import Authenticate from "../screens/Authenticate"
import ApplicationState from "../ApplicationState";

export default class AuthModal extends Component {

  constructor(props) {
    super(props);

    // let mostRecentState = ApplicationState.get().getMostRecentState();
    // let authProps = ApplicationState.get().getAuthenticationPropsForAppState(mostRecentState);
    this.state = {
      authProps: {}
      // authProps: authProps,
      // applicationState: mostRecentState,
      // visible: (authProps.passcode || authProps.fingerprint) || false
    };
    this.stateChanged();
  }

  componentWillUnmount() {
    ApplicationState.get().removeStateObserver(this.stateObserver);
  }

  componentDidMount() {
    this.mounted = true;

    console.log("authModal registering state observer");

    this.stateObserver = ApplicationState.get().addStateObserver((state) => {
      console.log("AuthModal | stateObserver | state:", state);
      if(!this.didSetVisibleToTrue && ApplicationState.get().isStateAppCycleChange(state)
        && !ApplicationState.get().isAuthenticationInProgress()) {
        let authProps = ApplicationState.get().getAuthenticationPropsForAppState(state);
        let visible = (authProps.passcode || authProps.fingerprint) || false;
        console.log("authProps for state", state, authProps);
        this.setState({
          authProps: authProps,
          applicationState: state,
          visible: visible
        });
        this.didSetVisibleToTrue = visible;
        console.log("setting visible to", (authProps.passcode || authProps.fingerprint) || false);
        console.log("AuthModal visible state:", this.state.visible);
        this.stateChanged();
      }
    });

    if(this.beginAuthOnMount) {
      this.beginAuthOnMount = false;
      this.beginAuth();
    }
  }

  stateChanged() {
    // Once visible is true even once, we need to lock it in place,
    // and only make it in-visible after authentication completes.
    // This value is checked above in the application state observer to make sure we
    // don't accidentally change the value and dismiss this while its in view

    if(!ApplicationState.get().isAuthenticationInProgress()) {
      if(this.state.applicationState == ApplicationState.Launching || this.state.applicationState == ApplicationState.Resuming) {
        if(this.mounted && this.state.visible) {
          this.beginAuth();
        } else {
          this.beginAuthOnMount = true;
        }
      }
    }
  }

  beginAuth() {
    if(!this.state.visible) {
      console.error("Not supposed to call beginAuth before visible.");
    }

    try {
      this.refs.authenticate.beginAuthentication();
      ApplicationState.get().setAuthenticationInProgress(true);
    } catch (e) {
      console.error("Unable to begin auth", e);
    }
  }

  onAuthenticateSuccess = () => {
    // First hide Modal
    console.log("onAuthenticateSuccess setting visible to true");
    this.setState({visible: false});
    this.didSetVisibleToTrue = false;
    this.forceUpdate();

    // Wait for it to begin dismissing, then trigger callback. Otherwise, AuthModal can be deallocated before Modal is removed, causing problems.
    setTimeout(() => {
      this.state.authProps.onAuthenticate();
    }, 0);
  }

  render() {
    if(!this.state.visible) {
      return <View/>;
    }
    
    let authProps = this.state.authProps;
    return (
      <View style={[GlobalStyles.styles().container]}>
        <Modal
         animationType={"slide"}
         transparent={true}
         visible={this.state.visible}
         onRequestClose={() => {}}>

          <Authenticate
            ref={'authenticate'}
            title={authProps.title}
            onAuthenticateSuccess={this.onAuthenticateSuccess}
            mode={"authenticate"}
            requirePasscode={authProps.passcode}
            requireFingerprint={authProps.fingerprint}
            pseudoModal={true}
            authProps={authProps}
          />
        </Modal>
      </View>
    )
  }

}
