import { ButtonCell } from '@Components/ButtonCell';
import {
  Option,
  SectionedOptionsTableCell,
} from '@Components/SectionedOptionsTableCell';
import { SectionedTableCell } from '@Components/SectionedTableCell';
import { TableSection } from '@Components/TableSection';
import { ModalStackNavigationProp } from '@Root/App';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_INPUT_MODAL_PASSCODE } from '@Root/screens2/screens';
import { StyleKitContext } from '@Style/StyleKit';
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
      // this.submit();
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
      setSettingPassocode(false);
      props.navigation.goBack();
    }
  };

  const keyboardOptions: Option[] = useMemo(
    () => [
      {
        title: 'General',
        key: 'default',
        selected: keyboardType === 'default',
      },
      {
        title: 'Numeric',
        key: 'numeric',
        selected: keyboardType === 'numeric',
      },
    ],
    [keyboardType]
  );

  const onKeyboardTypeSelect = (option: Option) => {
    setKeyboardType(option.key as KeyboardType);
    if (Platform.OS === 'ios') {
      // on Android, keyboard will update right away
      Keyboard.dismiss();
      setTimeout(() => {
        textRef.current?.focus();
      }, 100);
    }
  };

  return (
    <Container>
      <TableSection>
        <SectionedTableCell textInputCell first={true}>
          <Input
            ref={textRef}
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
