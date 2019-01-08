import React, { Component, Fragment } from 'react';
import {TextInput, View, Text, Keyboard, Alert} from 'react-native';
import StyleKit from "@Style/StyleKit"
import Sync from '@SFJS/syncManager'
import SF from '@SFJS/sfjs'
import Auth from '@SFJS/authManager'

import SectionHeader from "@Components/SectionHeader";
import ButtonCell from "@Components/ButtonCell";
import TableSection from "@Components/TableSection";
import SectionedTableCell from "@Components/SectionedTableCell";
import SectionedAccessoryTableCell from "@Components/SectionedAccessoryTableCell";

const DEFAULT_SIGN_IN_TEXT = "Sign In";
const DEFAULT_REGISTER_TEXT = "Register";

export default class AuthSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      signingIn: false,
      registering: false,
      strictSignIn: false,
      signInButtonText: DEFAULT_SIGN_IN_TEXT,
      registerButtonText: DEFAULT_REGISTER_TEXT
    };
  }

  componentDidMount() {
    this.setState({server: Auth.get().serverUrl()})
  }

  showAdvanced = () => {
    this.setState({showAdvanced: true});
  }

  onSignInPress = () => {
    this.setState({signingIn: true, signInButtonText: "Generating Keys..."});

    Keyboard.dismiss();

    // Merge params back into our own state.params. The reason is, if you have immediate passcode enabled, and 2FA enabled
    // When you press sign in, see your 2fa prompt, exit the app to get your code and come back, the AuthSection component is destroyed.
    // Its data will need to be repopulated, and will use this.state.params
    // this.setState({params: params});

    var email = this.state.email;
    var password = this.state.password;

    if(!this.validate(email, password)) {
      if(callback) {callback(false);}
      return;
    }

    var extraParams = {};
    if(this.state.mfa) {
      extraParams[this.state.mfa.payload.mfa_key] = this.state.mfa_token;
    }

    var strict = this.state.strictSignIn;

    // Prevent a timed sync from occuring while signing in. There may be a race condition where when
    // calling `markAllItemsDirtyAndSaveOffline` during sign in, if an authenticated sync happens to occur
    // right before that's called, items retreived from that sync will be marked as dirty, then resynced, causing mass duplication.
    // Unlock sync after all sign in processes are complete.
    Sync.get().lockSyncing();

    Auth.get().login(this.state.server, email, password, strict, extraParams).then((response) => {

      if(!response || response.error) {
        var error = response ? response.error : {message: "An unknown error occured."}

        Sync.get().unlockSyncing();

        if(error.tag == "mfa-required" || error.tag == "mfa-invalid") {
          this.setState({mfa: error});
        } else if(error.message) {
          Alert.alert('Oops', error.message, [{text: 'OK'}])
        }
        this.setState({signingIn: false, signInButtonText: DEFAULT_SIGN_IN_TEXT});
        return;
      }

      this.setState({email: null, password: null, mfa: null});

      this.onAuthSuccess();
    });
  }

  validate(email, password) {
    if(!email) {
      Alert.alert('Missing Email', "Please enter a valid email address.", [{text: 'OK'}])
      return false;
    }

    if(!password) {
      Alert.alert('Missing Password', "Please enter your password.", [{text: 'OK'}])
      return false;
    }

    return true;
  }

  onRegisterPress = () => {
    Keyboard.dismiss();

    var email = this.state.email;
    var password = this.state.password;

    if(!this.validate(email, password)) {
      this.setState({registering: false, registerButtonText: DEFAULT_REGISTER_TEXT});
      return;
    }

    this.setState({confirmRegistration: true});
  }

  onRegisterConfirmCancel = () => {
    this.setState({confirmRegistration: false});
  }

  onAuthSuccess = () => {
    Sync.get().markAllItemsDirtyAndSaveOffline(false).then(() => {
      Sync.get().unlockSyncing();
      Sync.get().sync();
      this.props.onAuthSuccess();
    });
  }

  toggleStrictMode = () => {
    this.setState((prevState) => {
      return {strictSignIn: !prevState.strictSignIn};
    })
  }

  onConfirmRegistrationPress = () => {
    if(this.state.password !== this.state.passwordConfirmation) {
      Alert.alert("Passwords Don't Match", "The passwords you entered do not match. Please try again.", [{text: 'OK'}])
    } else {
      this.setState({registering: true});

      Auth.get().register(this.state.server, this.state.email, this.state.password).then((response) => {
        this.setState({registering: false, confirmRegistration: false});

        if(!response || response.error) {
          var error = response ? response.error : {message: "An unknown error occured."}
          Alert.alert('Oops', error.message, [{text: 'OK'}])
          return;
        }

        this.onAuthSuccess();
      });
    }
  }

  cancelMfa = () => {
    this.setState({mfa: null});
  }

  _renderRegistrationConfirm() {
    var padding = 14;
    return (
      <TableSection>
        <SectionHeader title={"Confirm Password"} />

        <Text style={[StyleKit.styles.uiText, {paddingLeft: padding, paddingRight: padding, marginBottom: padding}]}>
          Due to the nature of our encryption, Standard Notes cannot offer password reset functionality.
          If you forget your password, you will permanently lose access to your data.
        </Text>

        <SectionedTableCell first={true} textInputCell={true}>
          <TextInput
            style={StyleKit.styles.sectionedTableCellTextInput}
            placeholder={"Password confirmation"}
            onChangeText={(text) => this.setState({passwordConfirmation: text})}
            value={this.state.passwordConfirmation}
            secureTextEntry={true}
            autoFocus={true}
            keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
            underlineColorAndroid={'transparent'}
          />
        </SectionedTableCell>

        <ButtonCell
          disabled={this.state.registering}
          title={this.state.registering ? "Generating Keys..." : "Register"}
          bold={true}
          onPress={() => this.onConfirmRegistrationPress()}
        />

        <ButtonCell title="Cancel" onPress={() => this.onRegisterConfirmCancel()} />
      </TableSection>
    )
  }

  _renderDefaultContent() {

    let textPadding = 14;

    const renderMfaSubcontent = () => {
      return (
        <View>
          <Text style={[StyleKit.styles.uiText, {paddingLeft: textPadding, paddingRight: textPadding, marginBottom: textPadding}]}>
            {this.state.mfa.message}
          </Text>
          <SectionedTableCell textInputCell={true} first={true}>
            <TextInput
              style={StyleKit.styles.sectionedTableCellTextInput}
              placeholder=""
              onChangeText={(text) => this.setState({mfa_token: text})}
              value={this.state.mfa_token}
              keyboardType={'numeric'}
              keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
              autoFocus={true}
              underlineColorAndroid={'transparent'}
              placeholderTextColor={StyleKit.variable("stylekitNeutralColor")}
              onSubmitEditing={this.onSignInPress}
            />
          </SectionedTableCell>
        </View>
      )
    }

    const renderNonMfaSubcontent = () => {
      return (
        <Fragment>
          <View>
            <SectionedTableCell textInputCell={true} first={true}>
              <TextInput
                style={StyleKit.styles.sectionedTableCellTextInput}
                placeholder={"Email"}
                onChangeText={(text) => this.setState({email: text})}
                value={this.state.email}
                autoCorrect={false}
                autoCapitalize={'none'}
                keyboardType={'email-address'}
                keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
                underlineColorAndroid={'transparent'}
                placeholderTextColor={StyleKit.variable("stylekitNeutralColor")}
              />
            </SectionedTableCell>

            <SectionedTableCell textInputCell={true}>
              <TextInput
                style={StyleKit.styles.sectionedTableCellTextInput}
                placeholder={"Password"}
                onChangeText={(text) => this.setState({password: text})}
                value={this.state.password}
                secureTextEntry={true}
                keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
                underlineColorAndroid={'transparent'}
                placeholderTextColor={StyleKit.variable("stylekitNeutralColor")}
              />
            </SectionedTableCell>
          </View>

          {(this.state.showAdvanced || !this.state.server) &&
            <View>
              <SectionHeader title={"Advanced"} />
              <SectionedTableCell textInputCell={true} first={true}>
                <TextInput
                  style={StyleKit.styles.sectionedTableCellTextInput}
                  placeholder={"Sync Server"}
                  onChangeText={(text) => this.setState({server: text})}
                  value={this.state.server}
                  autoCorrect={false}
                  autoCapitalize={'none'}
                  keyboardType={'url'}
                  keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
                  underlineColorAndroid={'transparent'}
                  placeholderTextColor={StyleKit.variable("stylekitNeutralColor")}
                />
              </SectionedTableCell>

              <SectionedAccessoryTableCell
                onPress={() => this.toggleStrictMode()}
                text={"Use strict sign in"}
                selected={() => {return this.state.strictSignIn}}
                first={false}
                last={true}
              />
            </View>
          }
        </Fragment>
      )
    }

    return (
      <TableSection>
        <SectionHeader title={this.props.title} />
        {this.state.mfa &&
          renderMfaSubcontent()
        }

        {!this.state.mfa &&
          renderNonMfaSubcontent()
        }

        <ButtonCell title={this.state.signInButtonText} disabled={this.state.signingIn} bold={true} onPress={() => this.onSignInPress()} />

        {this.state.mfa &&
          <ButtonCell last={this.state.showAdvanced} title={"Cancel"} disabled={this.state.signingIn} onPress={() => this.cancelMfa()} />
        }

        {!this.state.mfa &&
          <ButtonCell last={this.state.showAdvanced} title={this.state.registerButtonText} disabled={this.state.registering} bold={true} onPress={() => this.onRegisterPress()} />
        }

        {!this.state.showAdvanced && !this.state.mfa &&
          <ButtonCell last={true} title="Advanced Options" onPress={() => this.showAdvanced()} />
        }
      </TableSection>
    )
  }

  render() {
    return (
      <View>
        {this.state.confirmRegistration &&
          this._renderRegistrationConfirm()
        }

        {!this.state.confirmRegistration &&
          this._renderDefaultContent()
        }
      </View>
    );
  }
}
