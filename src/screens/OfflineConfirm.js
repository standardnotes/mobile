import React, { Component } from 'react';
import { View, Text, KeyboardAvoidingView, ScrollView, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-navigation';
import StyleKit from "@Style/StyleKit"

import SectionHeader from "@Components/SectionHeader";
import ButtonCell from "@Components/ButtonCell";

import Abstract from "@Screens/Abstract"

import ApplicationState from "@Lib/ApplicationState"
import UserPrefsManager from '@Lib/userPrefsManager'

import AlertManager from "@SFJS/alertManager"

import TextView from "sn-textview";

// const DISCLAIMER_TEXT = "I understand that using the app without an account carries risks, and that I am responsible for making my own backups at regular intervals from the Settings menu.";
const DISCLAIMER_TEXT = "agree"

export default class OfflineConfirm extends Abstract {

  static navigationOptions = ({ navigation, navigationOptions }) => {
    let templateOptions = {
      leftButton: {
        title: ApplicationState.isIOS ? "Cancel" : null,
        iconName: ApplicationState.isIOS ? null : StyleKit.nameForIcon("close"),
      }
    }
    return Abstract.getDefaultNavigationOptions({navigation, navigationOptions, templateOptions});
  };

  constructor(props) {
    super(props);

    props.navigation.setParams({
      leftButton: {
        title: ApplicationState.isIOS ? "Cancel" : null,
        iconName: ApplicationState.isIOS ? null : StyleKit.nameForIcon("close"),
        onPress: () => {
          this.dismiss();
        }
      }
    })

    this.state = {
      userInput: "",
      waitingOnAgreement: true
    }
  }

  onAgreeToDisclaimer() {
    UserPrefsManager.get().setAgreedToOfflineDisclaimer().then(() => {
      this.props.navigation.navigate("Home");
    });
  }

  onInputChange = (text) => {
    // only waiting when user has not agreed to disclaimer
    const stillWaiting = text.toLowerCase() !== DISCLAIMER_TEXT.toLowerCase();

    this.setState({
      userInput: text,
      waitingOnAgreement: stillWaiting
    });
  }

  render() {
    let textPadding = 14;

    return (
      <SafeAreaView style={[StyleKit.styles.container, StyleKit.styles.baseBackground]}>
        <KeyboardAvoidingView style={{ flex: 1, flexDirection: 'column', justifyContent: 'center'}} behavior={ApplicationState.isAndroid ? null : 'padding'}>
          <ScrollView style={{backgroundColor: StyleKit.variable("stylekitBackgroundColor")}} keyboardShouldPersistTaps={'always'} keyboardDismissMode={'interactive'}>
            <SectionHeader title="Use without an account" />

            <Text style={[StyleKit.styles.uiText, {paddingLeft: textPadding, paddingRight: textPadding, marginBottom: textPadding}]}>
              Using Standard Notes without an account carries risks, as your data is not backed up anywhere. You may lose your data at anytime, for example, due to an OS update, or if we accidentally ship a bug in our code that does something unintended.
            </Text>
            <Text style={[StyleKit.styles.uiText, {paddingLeft: textPadding, paddingRight: textPadding, marginBottom: textPadding}]}>
              You may proceed without an account, but we consider this an advanced mode of usage. You must manually create and export backups of your data regularly from the Settings menu.
            </Text>
            <Text style={[StyleKit.styles.uiText, {paddingLeft: textPadding, paddingRight: textPadding, marginBottom: textPadding}]}>
              To proceed, please type the following sentence into the text area below.
            </Text>

            <Text style={[StyleKit.styles.uiText, {paddingLeft: textPadding, paddingRight: textPadding, marginBottom: textPadding}]}>
              {DISCLAIMER_TEXT}
            </Text>

            <View style={this.styles.inputTextContainer}>
              <TextView
                style={this.styles.disclaimerInput}
                value={this.state.userInput}
                onChangeText={this.onInputChange}
                placeholder="Enter disclaimer here"
                selectionColor={StyleKit.variable("stylekitInfoColor")}
                underlineColorAndroid={'transparent'}
                placeholderTextColor={StyleKit.variable("stylekitNeutralColor")}
                keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
                autoCorrect={true}
                autoCapitalize={'sentences'}
              />
            </View>

            <ButtonCell title="Use Offline" disabled={this.state.waitingOnAgreement} bold={true} onPress={() => this.onAgreeToDisclaimer()} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  loadStyles() {
    this.styles = {
      disclaimerInput: {
        fontWeight: "600",
        fontSize: 16,
        color: StyleKit.variables.stylekitForegroundColor,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
        borderColor: StyleKit.variables.stylekitBorderColor,
        borderWidth: 1,
        height: 150
      },
      inputTextContainer: {
        flexGrow: 1,
        flex: 1,
      },
    }
  }
}
