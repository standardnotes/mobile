import React, { Component } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, ScrollView, Text, Modal, AppState } from 'react-native';
import NoteCell from "./NoteCell"
import Search from 'react-native-search-box'
import GlobalStyles from "../Styles"
import App from "../app"
import Authenticate from "../screens/Authenticate"

export default class AuthModal extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    let props = App.get().getAuthenticationProps();
    let visible = props.passcode || props.fingerprint;
    return (
      <Modal
      animationType={"slide"}
      transparent={false}
      visible={visible}
      onRequestClose={() => {}}>

        <Authenticate
          ref={'authenticate'}
          title={props.title}
          onAuthenticateSuccess={props.onAuthenticate}
          mode={"authenticate"}
          requirePasscode={props.passcode}
          requireFingerprint={props.fingerprint}
          pseudoModal={true}
        />

      </Modal>
    )
  }

}
