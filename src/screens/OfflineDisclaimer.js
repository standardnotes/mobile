import React, { Component } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-navigation';
import ButtonCell from '@Components/ButtonCell';
import SectionHeader from '@Components/SectionHeader';
import ApplicationState from '@Lib/ApplicationState';
import UserPrefsManager from '@Lib/userPrefsManager';
import { stripNonAlphanumeric, isMatchCaseInsensitive } from '@Lib/utils';
import AlertManager from '@SFJS/alertManager';
import Abstract from '@Screens/Abstract';
import { SCREEN_HOME } from '@Screens/screens';
import { ICON_CLOSE } from '@Style/icons';
import StyleKit from '@Style/StyleKit';

const DISCLAIMER_TEXT = "I understand that using the app without an account carries risks, and that I am responsible for making my own backups at regular intervals from the Settings menu.";

export default class OfflineDisclaimer extends Abstract {

  static navigationOptions = ({ navigation, navigationOptions }) => {
    const templateOptions = {
      title: "No Account",
      leftButton: {
        title: ApplicationState.isIOS ? 'Cancel' : null,
        iconName: ApplicationState.isIOS ? null : StyleKit.nameForIcon(ICON_CLOSE),
      }
    }
    return Abstract.getDefaultNavigationOptions({navigation, navigationOptions, templateOptions});
  };

  constructor(props) {
    super(props);

    props.navigation.setParams({
      leftButton: {
        title: ApplicationState.isIOS ? 'Cancel' : null,
        iconName: ApplicationState.isIOS ? null : StyleKit.nameForIcon(ICON_CLOSE),
        onPress: () => {
          this.dismiss();
        }
      }
    });

    this.scrollView = null;
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow.bind(this));

    this.state = {
      userInput: '',
      waitingOnAgreement: true
    }
  }

  componentWillUnmount () {
    this.keyboardDidShowListener.remove();
  }

  _keyboardDidShow() {
    this.scrollView.scrollToEnd({animated: true});
  }

  onAgreeToDisclaimer() {
    UserPrefsManager.get().setAgreedToOfflineDisclaimer().then(() => {
      this.props.navigation.navigate(SCREEN_HOME);
    });
  }

  onInputChange = (inputText) => {
    const isMatching = isMatchCaseInsensitive(stripNonAlphanumeric(inputText), stripNonAlphanumeric(DISCLAIMER_TEXT));

    this.setState({
      userInput: inputText,
      waitingOnAgreement: !isMatching
    });
  }

  render() {
    const textPadding = 15;
    const textStyles = [
      StyleKit.styles.uiText,
      {
        paddingLeft: textPadding,
        paddingRight: textPadding,
        paddingBottom: textPadding
      }
    ];

    return (
      <SafeAreaView style={[StyleKit.styles.container, StyleKit.styles.baseBackground]}>
        <KeyboardAvoidingView keyboardVerticalOffset={70} style={{ flex: 1, flexGrow: 1, flexDirection: 'column' }} behavior={ApplicationState.isAndroid ? null : 'padding'}>
          <ScrollView
            ref={(view) => {
              this.scrollView = view;
            }}
            style={{backgroundColor: StyleKit.variable('stylekitBackgroundColor')}}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps={'always'}
            keyboardDismissMode={'interactive'}>

            <View style={this.styles.screenContainer}>
              <SectionHeader title="Use without an account" />

              <Text style={textStyles}>
                Using Standard Notes without an account carries risks, as your data is not backed up anywhere. You may lose your data at anytime, for example, due to an OS update, or if we accidentally ship a bug in our code that does something unintended.
                {'\n'}{'\n'}
                You may proceed without an account, but we consider this an advanced mode of usage. You must manually create and export backups of your data regularly from the Settings menu.
                {'\n'}{'\n'}
                To proceed, please type the following sentence into the text area below.
              </Text>

              <View style={this.styles.disclaimerTextContainer}>
                <Text style={[StyleKit.styles.uiText, this.styles.disclaimerText]}>
                  {DISCLAIMER_TEXT}
                </Text>
              </View>

              <View style={this.styles.inputTextContainer}>
                <TextInput
                  style={this.styles.disclaimerInput}
                  value={this.state.userInput}
                  onChangeText={this.onInputChange}
                  placeholder="Enter disclaimer here"
                  keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
                  underlineColorAndroid={'transparent'}
                  placeholderTextColor={StyleKit.variable('stylekitNeutralColor')}
                  autoCorrect={true}
                  autoCapitalize={'sentences'}
                  multiline={true}
                />
              </View>

              <ButtonCell title="I agree, use without an account." extraStyles={this.styles.agreeButton} important={!this.state.waitingOnAgreement} disabled={this.state.waitingOnAgreement} bold={true} onPress={() => this.onAgreeToDisclaimer()} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  loadStyles() {
    const componentPadding = 15;
    const textPadding = 10;

    this.styles = {
      screenContainer: {
        flex: 1,
        flexGrow: 1,
        paddingTop: componentPadding,
        paddingBottom: componentPadding
      },
      disclaimerTextContainer: {
        padding: textPadding,
        marginBottom: componentPadding,
        backgroundColor: StyleKit.variables.stylekitContrastBackgroundColor
      },
      disclaimerText: {
        padding: textPadding,
        fontWeight: 'bold'
      },
      inputTextContainer: {
        paddingLeft: componentPadding,
        paddingRight: componentPadding
      },
      disclaimerInput: {
        marginBottom: componentPadding,
        padding: textPadding,
        paddingTop: textPadding,
        height: 100,
        fontSize: 16,
        color: StyleKit.variables.stylekitForegroundColor,
        backgroundColor: StyleKit.variables.stylekitBackgroundColor,
        borderColor: StyleKit.variables.stylekitBorderColor,
        borderWidth: 1
      },
      agreeButton: {
        maxHeight: 50,
        marginBottom: componentPadding,
        borderTopWidth: 1,
        borderColor: StyleKit.variables.stylekitBorderColor,
      }
    }
  }
}
