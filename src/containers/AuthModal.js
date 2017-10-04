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

    this.state = {authProps: ApplicationState.get().getAuthenticationPropsForAppState(ApplicationState.get().getMostRecentState())};

    this.stateObserver = ApplicationState.get().addStateObserver((state) => {
      let authProps = ApplicationState.get().getAuthenticationPropsForAppState(state);
      console.log("GOt auth props", authProps);
      this.setState({authProps: authProps});
    });
  }

  componentWillUnmount() {
    ApplicationState.get().removeStateObserver(this.stateObserver);
  }

  render() {
    let authProps = this.state.authProps;
    let visible = (authProps.passcode || authProps.fingerprint) || false;
    console.log("Visible", visible);
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
