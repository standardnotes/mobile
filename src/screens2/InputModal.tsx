import React from 'react';
import {
  TextInput,
  Keyboard,
  Alert,
  KeyboardTypeOptions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-navigation';
import ButtonCell from '@Root/components2/ButtonCell';
import SectionedTableCell from '@Root/components2/SectionedTableCell';
import SectionedOptionsTableCell from '@Root/components2/SectionedOptionsTableCell';
import TableSection from '@Root/components2/TableSection';
import LockedView from '@Containers/LockedView';
import Abstract, {
  AbstractState,
  AbstractProps,
} from '@Root/screens2/Abstract';
import { ICON_CLOSE } from '@Style/icons';
import { StyleKit } from '@Style/StyleKit';

type State = {
  text: string;
  confirmText: string;
} & AbstractState;

export default class InputModal extends Abstract<AbstractProps, State> {
  static navigationOptions = ({ navigation, navigationOptions }: any) => {
    const templateOptions = {
      leftButton: {
        title: Platform.OS === 'ios' ? 'Cancel' : null,
        iconName:
          Platform.OS === 'ios' ? null : StyleKit.nameForIcon(ICON_CLOSE),
      },
    };
    return Abstract.getDefaultNavigationOptions({
      navigation,
      _navigationOptions: navigationOptions,
      templateOptions,
    });
  };
  requireConfirm: boolean;
  showKeyboardChooser: boolean;
  keyboardType: KeyboardTypeOptions;
  confirmInputRef: TextInput | null = null;
  inputRef: TextInput | null = null;

  constructor(props: Readonly<AbstractProps>) {
    super(props);

    props.navigation.setParams({
      leftButton: {
        title: Platform.OS === 'ios' ? 'Cancel' : null,
        iconName:
          Platform.OS === 'ios' ? null : StyleKit.nameForIcon(ICON_CLOSE),
        onPress: () => {
          this.dismiss();
        },
      },
    });

    this.requireConfirm = this.getProp('requireConfirm');
    this.showKeyboardChooser = this.getProp('showKeyboardChooser');
    this.keyboardType = 'default';

    this.constructState({ text: this.getProp('initialValue') || '' });
  }

  dismiss() {
    this.props.navigation.goBack(null);
  }

  onTextSubmit = () => {
    if (this.requireConfirm && !this.state.confirmText) {
      this.confirmInputRef?.focus();
    } else {
      this.submit();
    }
  };

  onConfirmSubmit = () => {
    this.submit();
  };

  submit = () => {
    if (this.requireConfirm) {
      if (this.state.text !== this.state.confirmText) {
        Alert.alert(
          'Invalid Confirmation',
          'The two values you entered do not match. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    if (this.getProp('validate')) {
      if (!this.getProp('validate')(this.state.text)) {
        this.getProp('onError')(this.state.text);
        return;
      }
    }
    this.getProp('onSubmit')(this.state.text, this.keyboardType);
    this.dismiss();
  };

  onTextChange = (text: string) => {
    this.setState({ text: text });
  };

  onConfirmTextChange = (text: string) => {
    this.setState({ confirmText: text });
  };

  refreshKeyboard() {
    if (Platform.OS === 'ios') {
      // on Android, keyboard will update right away
      Keyboard.dismiss();
      setTimeout(() => {
        this.inputRef && this.inputRef.focus();
      }, 100);
    }
  }

  onKeyboardOptionsSelect = (option: { key: any }) => {
    this.keyboardType = option.key;
    this.forceUpdate();
    this.refreshKeyboard();
  };

  render() {
    if (this.state.lockContent) {
      return <LockedView />;
    }

    const keyboardOptions = [
      {
        title: 'General',
        key: 'default',
        selected: this.keyboardType === 'default',
      },
      {
        title: 'Numeric',
        key: 'numeric',
        selected: this.keyboardType === 'numeric',
      },
    ];

    const keyboardOptionsCell = (
      <SectionedOptionsTableCell
        title={'Keyboard Type'}
        options={keyboardOptions}
        onPress={this.onKeyboardOptionsSelect}
      />
    );

    return (
      <SafeAreaView
        style={[
          this.context?.getThemeService().styles.container,
          this.context?.getThemeService().styles.baseBackground,
        ]}
      >
        <TableSection
          extraStyles={[this.context!.getThemeService().styles.container]}
        >
          <SectionedTableCell textInputCell={true} first={true}>
            <TextInput
              ref={ref => {
                this.inputRef = ref;
              }}
              style={[
                this.context?.getThemeService().styles
                  .sectionedTableCellTextInput,
              ]}
              placeholder={this.getProp('placeholder')}
              onChangeText={this.onTextChange}
              value={this.state.text}
              secureTextEntry={this.getProp('secureTextEntry')}
              autoCorrect={false}
              autoCapitalize={'none'}
              keyboardType={this.keyboardType}
              keyboardAppearance={this.context
                ?.getThemeService()
                .keyboardColorForActiveTheme()}
              autoFocus={true}
              placeholderTextColor={
                this.context?.getThemeService().variables.stylekitNeutralColor
              }
              underlineColorAndroid={'transparent'}
              onSubmitEditing={this.onTextSubmit.bind(this)}
            />
          </SectionedTableCell>

          {this.requireConfirm && (
            <SectionedTableCell textInputCell={true} first={false}>
              <TextInput
                ref={ref => {
                  this.confirmInputRef = ref;
                }}
                style={[
                  this.context?.getThemeService().styles
                    .sectionedTableCellTextInput,
                ]}
                placeholder={this.getProp('confirmPlaceholder')}
                onChangeText={this.onConfirmTextChange}
                value={this.state.confirmText}
                secureTextEntry={this.getProp('secureTextEntry')}
                autoCorrect={false}
                autoCapitalize={'none'}
                keyboardType={this.keyboardType}
                keyboardAppearance={this.context
                  ?.getThemeService()
                  .keyboardColorForActiveTheme()}
                placeholderTextColor={
                  this.context?.getThemeService().variables.stylekitNeutralColor
                }
                underlineColorAndroid={'transparent'}
                onSubmitEditing={this.onConfirmSubmit.bind(this)}
              />
            </SectionedTableCell>
          )}

          {this.showKeyboardChooser && keyboardOptionsCell}

          <ButtonCell
            maxHeight={45}
            disabled={this.state.text.length === 0}
            title={'Save'}
            bold={true}
            onPress={() => this.submit()}
          />
        </TableSection>
      </SafeAreaView>
    );
  }
}
