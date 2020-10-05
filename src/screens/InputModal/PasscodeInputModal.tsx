import { ButtonCell } from '@Components/ButtonCell';
import {
  Option,
  SectionedOptionsTableCell,
} from '@Components/SectionedOptionsTableCell';
import { SectionedTableCell } from '@Components/SectionedTableCell';
import { TableSection } from '@Components/TableSection';
import { PasscodeKeyboardType, UnlockTiming } from '@Lib/application_state';
import { ApplicationContext } from '@Root/ApplicationContext';
import { ModalStackNavigationProp } from '@Root/ModalStack';
import { SCREEN_INPUT_MODAL_PASSCODE } from '@Screens/screens';
import { StyleKitContext } from '@Style/stylekit';
import React, { useContext, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardType, Platform, TextInput } from 'react-native';
import { Container, Input } from './InputModal.styled';

type Props = ModalStackNavigationProp<typeof SCREEN_INPUT_MODAL_PASSCODE>;
export const PasscodeInputModal = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext);
  const styleKit = useContext(StyleKitContext);

  // State
  const [settingPassocode, setSettingPassocode] = useState(false);
  const [text, setText] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [keyboardType, setKeyboardType] = useState<KeyboardType>('default');

  // Refs
  const textRef = useRef<TextInput>(null);
  const confirmTextRef = useRef<TextInput>(null);

  const onTextSubmit = () => {
    if (!confirmText) {
      confirmTextRef.current?.focus();
    } else {
      Keyboard.dismiss();
    }
  };

  const onSubmit = async () => {
    if (settingPassocode) {
      return;
    }
    setSettingPassocode(true);
    if (text !== confirmText) {
      application?.alertService?.alert(
        'The two values you entered do not match. Please try again.',
        'Invalid Confirmation',
        'OK'
      );
      setSettingPassocode(false);
    } else {
      await application?.setPasscode(text);
      await application?.getAppState().setPasscodeTiming(UnlockTiming.OnQuit);
      await application?.getAppState().setScreenshotPrivacy();
      setSettingPassocode(false);
      props.navigation.goBack();
    }
  };

  const keyboardOptions: Option[] = useMemo(
    () => [
      {
        title: 'General',
        key: 'default' as PasscodeKeyboardType,
        selected: keyboardType === 'default',
      },
      {
        title: 'Numeric',
        key: 'numeric' as PasscodeKeyboardType,
        selected: keyboardType === 'numeric',
      },
    ],
    [keyboardType]
  );

  const onKeyboardTypeSelect = (option: Option) => {
    setKeyboardType(option.key as KeyboardType);
    application
      ?.getAppState()
      .setPasscodeKeyboardType(option.key as PasscodeKeyboardType);
  };

  return (
    <Container>
      <TableSection>
        <SectionedTableCell textInputCell first={true}>
          <Input
            ref={textRef}
            key={Platform.OS === 'android' ? keyboardType + '1' : undefined}
            placeholder="Enter a passcode"
            onChangeText={setText}
            value={text}
            secureTextEntry
            autoCorrect={false}
            autoCapitalize={'none'}
            keyboardType={keyboardType}
            keyboardAppearance={styleKit?.keyboardColorForActiveTheme()}
            autoFocus={true}
            underlineColorAndroid={'transparent'}
            onSubmitEditing={onTextSubmit}
          />
        </SectionedTableCell>

        <SectionedTableCell textInputCell first={false}>
          <Input
            ref={confirmTextRef}
            key={Platform.OS === 'android' ? keyboardType + '2' : undefined}
            placeholder="Confirm passcode"
            onChangeText={setConfirmText}
            value={confirmText}
            secureTextEntry
            autoCorrect={false}
            autoCapitalize={'none'}
            keyboardType={keyboardType}
            keyboardAppearance={styleKit?.keyboardColorForActiveTheme()}
            underlineColorAndroid={'transparent'}
            onSubmitEditing={onSubmit}
          />
        </SectionedTableCell>

        <SectionedOptionsTableCell
          title={'Keyboard Type'}
          leftAligned
          options={keyboardOptions}
          onPress={onKeyboardTypeSelect}
        />

        <ButtonCell
          maxHeight={45}
          disabled={settingPassocode || text.length === 0}
          title={'Save'}
          bold
          onPress={onSubmit}
        />
      </TableSection>
    </Container>
  );
};
