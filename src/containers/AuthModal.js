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

    let mostRecentState = ApplicationState.get().getMostRecentState();
    this.state = {
      authProps: ApplicationState.get().getAuthenticationPropsForAppState(mostRecentState),
      applicationState: mostRecentState
    };
    this.stateChanged();
  }

  componentWillUnmount() {
    ApplicationState.get().removeStateObserver(this.stateObserver);
  }

  componentDidMount() {
    this.mounted = true;

    this.stateObserver = ApplicationState.get().addStateObserver((state) => {
      if(ApplicationState.get().isStateAppCycleChange(state) && !ApplicationState.get().isAuthenticationInProgress()) {
        let authProps = ApplicationState.get().getAuthenticationPropsForAppState(state);
        this.setState({authProps: authProps, applicationState: state});
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
        if(this.mounted) {
          this.beginAuth();
        } else {
          this.beginAuthOnMount = true;
        }
      }
    }
  }

  beginAuth() {
    this.refs.authenticate.beginAuthentication();
    ApplicationState.get().setAuthenticationInProgress(true);
  }

  get visible() {
    let authProps = this.state.authProps;
    let _visible = (authProps.passcode || authProps.fingerprint) || false;
    return _visible;
  }

  render() {
    let authProps = this.state.authProps;
    let visible = this.visible;
    return (
      <Modal
       animationType={"slide"}
       transparent={false}
       visible={visible}
       onRequestClose={() => {}}>

        <Authenticate
          ref={'authenticate'}
          title={authProps.title}
          onAuthenticateSuccess={authProps.onAuthenticate}
          mode={"authenticate"}
          requirePasscode={authProps.passcode}
          requireFingerprint={authProps.fingerprint}
          pseudoModal={true}
          authProps={authProps}
        />
      </Modal>
    )
  }

}
