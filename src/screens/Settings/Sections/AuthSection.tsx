import React, { Component, Fragment } from 'react';
import { TextInput, View, Text, Keyboard, Alert } from 'react-native';
import ButtonCell from '@Components/ButtonCell';
import SectionedAccessoryTableCell from '@Components/SectionedAccessoryTableCell';
import SectionHeader from '@Components/SectionHeader';
import TableSection from '@Components/TableSection';
import SectionedTableCell from '@Components/SectionedTableCell';
import Auth from '@Lib/snjs/authManager';
import Sync from '@Lib/snjs/syncManager';
import StyleKit from '@Style/StyleKit';

const DEFAULT_SIGN_IN_TEXT = 'Sign In';
const DEFAULT_REGISTER_TEXT = 'Register';

export default class AuthSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: AuthSection.emailInProgress,
      password: AuthSection.passwordInProgress,
      signingIn: false,
      registering: false,
      strictSignIn: false,
      signInButtonText: DEFAULT_SIGN_IN_TEXT,
      registerButtonText: DEFAULT_REGISTER_TEXT,
    };
  }

  componentDidMount() {
    this.setState({ server: Auth.get().serverUrl() });
  }

  showAdvanced = () => {
    this.setState({ showAdvanced: true });
  };

  onSignInPress = () => {
    this.setState({ signingIn: true, signInButtonText: 'Generating Keys...' });

    Keyboard.dismiss();

    /**
     * Merge params back into our own state.params. The reason is, if you have
     * immediate passcode enabled, and 2FA enabled, when you press sign in,
     * see your 2fa prompt, exit the app to get your code and come back, the
     * AuthSection component is destroyed.
     *
     * Its data will need to be repopulated, and will use this.state.params
     * this.setState({params: params});
     */

    const email = this.state.email;
    const password = this.state.password;

    if (!this.validate(email, password)) {
      this.setState({
        signingIn: false,
        signInButtonText: DEFAULT_SIGN_IN_TEXT,
      });
      return;
    }

    const extraParams = {};
    if (this.state.mfa) {
      extraParams[this.state.mfa.payload.mfa_key] = this.state.mfa_token;
    }

    const strict = this.state.strictSignIn;

    /**
     * Prevent a timed sync from occuring while signing in. There may be a race
     * condition where when calling `markAllItemsDirtyAndSaveOffline` during
     * sign in, if an authenticated sync happens to occur right before that's
     * called, items retreived from that sync will be marked as dirty, then
     * resynced, causing mass duplication. Unlock sync after all sign in
     * processes are complete.
     */
    Sync.get().lockSyncing();

    Auth.get()
      .login(this.state.server, email, password, strict, extraParams)
      .then(response => {
        if (!response || response.error) {
          const error = response
            ? response.error
            : { message: 'An unknown error occured.' };

          Sync.get().unlockSyncing();

          if (error.tag === 'mfa-required' || error.tag === 'mfa-invalid') {
            this.setState({ mfa: error });
          } else if (error.message) {
            Alert.alert('Oops', error.message, [{ text: 'OK' }]);
          }
          this.setState({
            signingIn: false,
            signInButtonText: DEFAULT_SIGN_IN_TEXT,
          });
          return;
        }

        this.setState({ email: null, password: null, mfa: null });

        this.onAuthSuccess();
      });
  };

  validate(email, password) {
    if (!email) {
      Alert.alert('Missing Email', 'Please enter a valid email address.', [
        { text: 'OK' },
      ]);
      return false;
    }

    if (!password) {
      Alert.alert('Missing Password', 'Please enter your password.', [
        { text: 'OK' },
      ]);
      return false;
    }

    return true;
  }

  onRegisterPress = () => {
    Keyboard.dismiss();

    const email = this.state.email;
    const password = this.state.password;

    if (!this.validate(email, password)) {
      this.setState({
        registering: false,
        registerButtonText: DEFAULT_REGISTER_TEXT,
      });
      return;
    }

    this.setState({ confirmRegistration: true });
  };

  onRegisterConfirmCancel = () => {
    this.setState({ confirmRegistration: false });
  };

  onAuthSuccess = () => {
    AuthSection.emailInProgress = null;
    AuthSection.passwordInProgress = null;
    Sync.get()
      .markAllItemsDirtyAndSaveOffline(false)
      .then(() => {
        Sync.get().unlockSyncing();
        Sync.get().sync();
        this.props.onAuthSuccess();
      });
  };

  toggleStrictMode = () => {
    this.setState(prevState => {
      return { strictSignIn: !prevState.strictSignIn };
    });
  };

  onConfirmRegistrationPress = () => {
    if (this.state.password !== this.state.passwordConfirmation) {
      Alert.alert(
        "Passwords Don't Match",
        'The passwords you entered do not match. Please try again.',
        [{ text: 'OK' }]
      );
    } else {
      this.setState({ registering: true });

      Auth.get()
        .register(this.state.server, this.state.email, this.state.password)
        .then(response => {
          this.setState({ registering: false, confirmRegistration: false });

          if (!response || response.error) {
            const error = response
              ? response.error
              : { message: 'An unknown error occured.' };
            Alert.alert('Oops', error.message, [{ text: 'OK' }]);
            return;
          }

          this.onAuthSuccess();
        });
    }
  };

  cancelMfa = () => {
    this.setState({ mfa: null });
  };

  emailInputChanged = text => {
    this.setState({ email: text });
    /**
     * If you have a local passcode with immediate timing, and you're trying to
     * sign in, and 2FA is prompted then by the time you come back from Auth,
     * AuthSection will have unmounted and remounted (because Settings returns
     * LockedView), clearing any values. So we'll hang on to them here.
     */
    AuthSection.emailInProgress = text;
  };

  passwordInputChanged = text => {
    this.setState({ password: text });
    AuthSection.passwordInProgress = text;
  };

  _renderRegistrationConfirm() {
    const padding = 14;
    return (
      <TableSection>
        <SectionHeader title={'Confirm Password'} />

        <Text
          style={[
            StyleKit.styles.uiText,
            {
              paddingLeft: padding,
              paddingRight: padding,
              marginBottom: padding,
            },
          ]}
        >
          Due to the nature of our encryption, Standard Notes cannot offer
          password reset functionality. If you forget your password, you will
          permanently lose access to your data.
        </Text>

        <SectionedTableCell first={true} textInputCell={true}>
          <TextInput
            testID="passwordConfirmationField"
            style={StyleKit.styles.sectionedTableCellTextInput}
            placeholder={'Password confirmation'}
            onChangeText={text => this.setState({ passwordConfirmation: text })}
            value={this.state.passwordConfirmation}
            secureTextEntry={true}
            autoFocus={true}
            keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
            underlineColorAndroid={'transparent'}
          />
        </SectionedTableCell>

        <ButtonCell
          testID="registerConfirmButton"
          disabled={this.state.registering}
          title={this.state.registering ? 'Generating Keys...' : 'Register'}
          bold={true}
          onPress={() => this.onConfirmRegistrationPress()}
        />

        <ButtonCell
          title="Cancel"
          onPress={() => this.onRegisterConfirmCancel()}
        />
      </TableSection>
    );
  }

  _renderDefaultContent() {
    const textPadding = 14;
    const renderMfaSubcontent = () => {
      return (
        <View>
          <Text
            style={[
              StyleKit.styles.uiText,
              {
                paddingLeft: textPadding,
                paddingRight: textPadding,
                marginBottom: textPadding,
              },
            ]}
          >
            {this.state.mfa.message}
          </Text>
          <SectionedTableCell textInputCell={true} first={true}>
            <TextInput
              style={StyleKit.styles.sectionedTableCellTextInput}
              placeholder=""
              onChangeText={text => this.setState({ mfa_token: text })}
              value={this.state.mfa_token}
              keyboardType={'numeric'}
              keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
              autoFocus={true}
              underlineColorAndroid={'transparent'}
              placeholderTextColor={StyleKit.variables.stylekitNeutralColor}
              onSubmitEditing={this.onSignInPress}
            />
          </SectionedTableCell>
        </View>
      );
    };

    const renderNonMfaSubcontent = () => {
      return (
        <Fragment>
          <View>
            <SectionedTableCell textInputCell={true} first={true}>
              <TextInput
                testID="emailField"
                style={StyleKit.styles.sectionedTableCellTextInput}
                placeholder={'Email'}
                onChangeText={text => this.emailInputChanged(text)}
                value={this.state.email}
                autoCorrect={false}
                autoCapitalize={'none'}
                keyboardType={'email-address'}
                textContentType={'emailAddress'}
                keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
                underlineColorAndroid={'transparent'}
                placeholderTextColor={StyleKit.variables.stylekitNeutralColor}
              />
            </SectionedTableCell>

            <SectionedTableCell textInputCell={true}>
              <TextInput
                testID="passwordField"
                style={StyleKit.styles.sectionedTableCellTextInput}
                placeholder={'Password'}
                onChangeText={text => this.passwordInputChanged(text)}
                value={this.state.password}
                textContentType={'password'}
                secureTextEntry={true}
                keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
                underlineColorAndroid={'transparent'}
                placeholderTextColor={StyleKit.variables.stylekitNeutralColor}
              />
            </SectionedTableCell>
          </View>

          {(this.state.showAdvanced || !this.state.server) && (
            <View>
              <SectionHeader title={'Advanced'} />
              <SectionedTableCell textInputCell={true} first={true}>
                <TextInput
                  testID="syncServerField"
                  style={StyleKit.styles.sectionedTableCellTextInput}
                  placeholder={'Sync Server'}
                  onChangeText={text => this.setState({ server: text })}
                  value={this.state.server}
                  autoCorrect={false}
                  autoCapitalize={'none'}
                  keyboardType={'url'}
                  keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
                  underlineColorAndroid={'transparent'}
                  placeholderTextColor={StyleKit.variables.stylekitNeutralColor}
                />
              </SectionedTableCell>

              <SectionedAccessoryTableCell
                onPress={() => this.toggleStrictMode()}
                text={'Use strict sign in'}
                selected={() => {
                  return this.state.strictSignIn;
                }}
                first={false}
                last={true}
              />
            </View>
          )}
        </Fragment>
      );
    };

    return (
      <TableSection>
        {this.props.title && <SectionHeader title={this.props.title} />}

        {this.state.mfa && renderMfaSubcontent()}

        {!this.state.mfa && renderNonMfaSubcontent()}

        <ButtonCell
          testID="signInButton"
          title={this.state.signInButtonText}
          disabled={this.state.signingIn}
          bold={true}
          onPress={() => this.onSignInPress()}
        />

        {this.state.mfa && (
          <ButtonCell
            last={this.state.showAdvanced}
            title={'Cancel'}
            disabled={this.state.signingIn}
            onPress={() => this.cancelMfa()}
          />
        )}

        {!this.state.mfa && (
          <ButtonCell
            testID="registerButton"
            last={this.state.showAdvanced}
            title={this.state.registerButtonText}
            disabled={this.state.registering}
            bold={true}
            onPress={() => this.onRegisterPress()}
          />
        )}

        {!this.state.showAdvanced && !this.state.mfa && (
          <ButtonCell
            testID="otherOptionsButton"
            last={true}
            title="Other Options"
            onPress={() => this.showAdvanced()}
          />
        )}
      </TableSection>
    );
  }

  render() {
    return (
      <View>
        {this.state.confirmRegistration && this._renderRegistrationConfirm()}

        {!this.state.confirmRegistration && this._renderDefaultContent()}
      </View>
    );
  }
}
