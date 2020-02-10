import React from 'react';
import { TextInput, View, Alert, ScrollView } from 'react-native';
import ButtonCell from '@Components/ButtonCell';
import SectionHeader from '@Components/SectionHeader';
import SectionedAccessoryTableCell from '@Components/SectionedAccessoryTableCell';
import SectionedTableCell from '@Components/SectionedTableCell';
import ApplicationState from '@Lib/ApplicationState';
import Abstract from '@Screens/Abstract';
import { ICON_CLOSE } from '@Style/icons';
import StyleKit from '@Style/StyleKit';

export default class Authenticate extends Abstract {
  static navigationOptions = ({ navigation, navigationOptions }) => {
    const templateOptions = {
      /**
       * On Android, not having a left button will make the title appear all
       * the way at the edge. Below will add some padding
       */
      title: ApplicationState.isAndroid ? '  Authenticate' : 'Authenticate'
    };
    return Abstract.getDefaultNavigationOptions({
      navigation,
      navigationOptions,
      templateOptions
    });
  };

  constructor(props) {
    super(props);

    for (const source of this.sources) {
      source.onRequiresInterfaceReload = () => {
        this.forceUpdate();
      };
      source.initializeForInterface();
    }

    this.stateObserver = ApplicationState.get().addStateObserver(state => {
      if (state === ApplicationState.GainingFocus) {
        if (!this.state.activeSource) {
          this.begin();
        }
      } else if (state === ApplicationState.Backgrounding) {
        this.cancel();
      }
    });

    this._sessionLength = this.getProp('selectedSessionLength');

    if (this.getProp('hasCancelOption')) {
      props.navigation.setParams({
        leftButton: {
          title: ApplicationState.isIOS ? 'Cancel' : null,
          iconName: ApplicationState.isIOS
            ? null
            : StyleKit.nameForIcon(ICON_CLOSE),
          onPress: () => {
            this.getProp('onCancel')();
            this.dismiss();
          }
        }
      });
    }

    this.pendingSources = this.sources.slice();
    this.successfulSources = [];
  }

  get sources() {
    return this.getProp('authenticationSources');
  }

  componentWillUnmount() {
    /**
     * Typically there should be no way to exit this window if it doesn't have
     * a cancel option. However, on Android, you can press the hardware back
     * button to dismiss it. We want to notify caller that this screen has
     * unmounted.
     */
    const onUnmount = this.getProp('onUnmount');
    if (onUnmount) {
      onUnmount();
    }

    super.componentWillUnmount();
    ApplicationState.get().removeStateObserver(this.stateObserver);
  }

  submitPressed() {
    if (this.activeSource && this.activeSource.isLocked()) {
      return;
    }

    /**
     * If we just pressed submit on the only pending source left, disable
     * submit button
     */
    if (this.pendingSources.length === 1) {
      this.setState({ submitDisabled: true });
    }

    if (this.state.activeSource) {
      this.validateAuthentication(this.state.activeSource);
    }
  }

  componentWillFocus() {
    super.componentWillFocus();

    if (
      ApplicationState.get().getMostRecentState() !==
      ApplicationState.LosingFocus
    ) {
      this.begin();
    }
  }

  cancel() {
    if (this.state.activeSource) {
      this.state.activeSource.cancel();
      this.setState({ activeSource: null });
    }
  }

  begin() {
    this.beginNextAuthentication();
  }

  beginNextAuthentication() {
    if (this.pendingSources && this.pendingSources.length) {
      const firstSource = this.pendingSources[0];
      this.beginAuthenticationForSource(firstSource);
    }
  }

  async beginAuthenticationForSource(source) {
    /**
     * Authentication modal may be displayed on lose focus just before the app
     * is closing. In this state however, we don't want to begin auth. We'll
     * wait until the app gains focus.
     */
    const isLosingFocus =
      ApplicationState.get().getMostRecentState() ===
      ApplicationState.LosingFocus;

    if (source.type === 'biometric' && !isLosingFocus) {
      /** Begin authentication right away, we're not waiting for any input */
      this.validateAuthentication(source);
    } else if (source.type === 'input') {
      if (source.inputRef) {
        source.inputRef.focus();
      }
    }

    source.setWaitingForInput();
    this.setState({ activeSource: source });
    this.forceUpdate();
  }

  successfulSourcesIncludesSource(source) {
    for (const candidate of this.successfulSources) {
      if (candidate.identifier === source.identifier) {
        return true;
      }
    }

    return false;
  }

  isAllSourcesSuccessful() {
    for (const source of this.sources) {
      if (this.successfulSourcesIncludesSource(source) === false) {
        return false;
      }
    }

    return true;
  }

  async validateAuthentication(source) {
    if (this.state.sourceLocked) {
      return;
    }

    /**
     * Don't double validate, otherwise the comparison of
     * successfulSources.length will be misleading.
     */
    const alreadySuccessful = this.successfulSourcesIncludesSource(source);
    if (alreadySuccessful || source.isAuthenticating()) {
      return;
    }

    /** Disable submit while we're processing. Will be re-enabled below. */
    this.setState({ submitDisabled: true });

    const result = await source.authenticate();
    if (source.isInSuccessState()) {
      this.successfulSources.push(source);
      _.pull(this.pendingSources, source);
      this.forceUpdate();
    } else if (source.isLocked()) {
      this.onSourceLocked(source);
      return;
    } else {
      if (result.error && result.error.message) {
        Alert.alert('Unsuccessful', result.error.message);
      }
    }

    if (this.isAllSourcesSuccessful()) {
      this.onSuccess();
    } else {
      this.setState({ submitDisabled: false });
      if (!result.error) {
        this.beginNextAuthentication();
      }
    }
  }

  async onBiometricDirectPress(source) {
    if (source.isLocked()) {
      return;
    }

    /** Validate current auth if set. Validating will also handle going to next */
    if (this.state.activeSource && this.state.activeSource !== source) {
      this.validateAuthentication(this.state.activeSource);
    } else {
      this.beginAuthenticationForSource(source);
    }
  }

  /**
   * @private
   * When a source returns in a locked status we create a timeout for the lock
   * period. This will auto reprompt the user for auth after the period is up.
   */
  onSourceLocked(source) {
    this.setState({ sourceLocked: true, submitDisabled: true });

    setTimeout(() => {
      this.setState({ sourceLocked: false, submitDisabled: false });
      this.beginAuthenticationForSource(source);
      this.forceUpdate();
    }, source.lockTimeout);
  }

  onSuccess() {
    /**
     * Wait for componentWillBlur/componentDidlBlur to call onSuccess callback.
     * This way, if the callback has another route change, the dismissal of this
     * one won't affect it.
     */
    this.needsSuccessCallback = true;
    this.dismiss();
  }

  componentWillBlur() {
    super.componentWillBlur();
    if (this.needsSuccessCallback) {
      this.triggerSuccessCallback();
    }
  }

  /**
   * On Android, when pressing physical back then re-opening app and
   * authenticating and closing modal, componentWillBlur is not called for some
   * reason. componentDidBlur is called however, albiet ~2 seconds later.
   * Note however that this only seems to happen on the emulator, and not on
   * physical device.
   */
  componentDidBlur() {
    super.componentDidBlur();
    if (this.needsSuccessCallback) {
      this.triggerSuccessCallback();
    }
  }

  triggerSuccessCallback() {
    this.getProp('onSuccess')(this._sessionLength);
    this.needsSuccessCallback = false;
  }

  inputTextChanged(text, source) {
    source.setAuthenticationValue(text);
    this.forceUpdate();
  }

  get sessionLengthOptions() {
    return this.getProp('sessionLengthOptions');
  }

  setSessionLength(length) {
    this._sessionLength = length;
    this.forceUpdate();
  }

  _renderAuthenticationSoure = (source, index) => {
    const isLast = index === this.sources.length - 1;

    const inputAuthenticationSource = source => (
      <View
        style={[
          this.styles.authSourceSection,
          !isLast ? this.styles.authSourceSectionNotLast : undefined
        ]}
      >
        <SectionedTableCell
          textInputCell={true}
          first={true}
          onPress={() => {}}
        >
          <TextInput
            ref={ref => {
              source.inputRef = ref;
            }}
            style={StyleKit.styles.sectionedTableCellTextInput}
            placeholder={source.inputPlaceholder}
            onChangeText={text => {
              this.inputTextChanged(text, source);
            }}
            value={source.getAuthenticationValue()}
            autoCorrect={false}
            autoFocus={false}
            autoCapitalize={'none'}
            secureTextEntry={true}
            keyboardType={source.keyboardType || 'default'}
            keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
            underlineColorAndroid={'transparent'}
            placeholderTextColor={StyleKit.variables.stylekitNeutralColor}
            onSubmitEditing={() => {
              this.validateAuthentication(source);
            }}
          />
        </SectionedTableCell>
      </View>
    );

    const biometricAuthenticationSource = source => (
      <View
        style={[
          this.styles.authSourceSection,
          !isLast ? this.styles.authSourceSectionNotLast : undefined
        ]}
      >
        <SectionedAccessoryTableCell
          first={true}
          dimmed={source !== this.state.activeSource}
          tinted={source === this.state.activeSource}
          text={source.label}
          onPress={() => {
            this.onBiometricDirectPress(source);
          }}
        />
      </View>
    );

    const hasHeaderSubtitle = source.type === 'input';
    let sourceTitle = source.title;
    if (source.status === 'waiting-turn') {
      sourceTitle += ' - Waiting';
    } else if (source.status === 'locked') {
      sourceTitle += ' - Locked';
    }

    return (
      <View key={source.identifier}>
        <SectionHeader
          title={sourceTitle}
          subtitle={hasHeaderSubtitle && source.label}
          tinted={source === this.state.activeSource}
          buttonText={source.headerButtonText}
          buttonAction={source.headerButtonAction}
          buttonStyles={source.headerButtonStyles}
        />
        {source.type === 'input' && inputAuthenticationSource(source)}
        {source.type === 'biometric' && biometricAuthenticationSource(source)}
      </View>
    );
  };

  render() {
    return (
      <View style={StyleKit.styles.container}>
        <ScrollView
          style={{
            backgroundColor: StyleKit.variables.stylekitBackgroundColor
          }}
          keyboardShouldPersistTaps={'always'}
          keyboardDismissMode={'interactive'}
        >
          {this.sources.map((source, index) => {
            return this._renderAuthenticationSoure(source, index);
          })}

          <ButtonCell
            style={this.styles.submitButtonCell}
            maxHeight={45}
            disabled={this.state.submitDisabled}
            title={this.pendingSources.length > 1 ? 'Next' : 'Submit'}
            bold={true}
            onPress={() => this.submitPressed()}
          />

          {this.sessionLengthOptions && this.sessionLengthOptions.length > 0 && (
            <View style={this.styles.rememberForSection}>
              <SectionHeader title={'Remember For'} />
              {this.sessionLengthOptions.map((option, index) => (
                <SectionedAccessoryTableCell
                  text={option.label}
                  key={`${index}`}
                  first={index === 0}
                  last={index === this.sessionLengthOptions.length - 1}
                  selected={() => {
                    return option.value === this._sessionLength;
                  }}
                  onPress={() => {
                    this.setSessionLength(option.value);
                  }}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  loadStyles() {
    this.styles = {
      authSourceSectionNotLast: {
        marginBottom: 10
      },
      rememberForSection: {
        marginTop: 10
      }
    };
  }
}
