import { ButtonCell } from '@Components/ButtonCell';
import { SectionedTableCell } from '@Components/SectionedTableCell';
import { TableSection } from '@Components/TableSection';
import { ModalStackNavigationProp } from '@Root/App';
import { ApplicationContext } from '@Root/ApplicationContext';
import { SCREEN_INPUT_MODAL_TAG } from '@Root/screens2/screens';
import { StyleKitContext } from '@Style/StyleKit';
import React, { useContext, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { Container, Input } from './InputModal.styled';

type Props = ModalStackNavigationProp<typeof SCREEN_INPUT_MODAL_TAG>;
export const TagInputModal = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext);
  const styleKit = useContext(StyleKitContext);

  // State
  const [text, setText] = useState('');

  // Refs
  const textRef = useRef<TextInput>(null);

  const onSubmit = () => {};

  return (
    <Container>
      <TableSection>
        <SectionedTableCell textInputCell first={true}>
          <Input
            ref={textRef}
            placeholder={
              props.route.params.initialValue ? 'Tag name' : 'New tag name'
            }
            onChangeText={setText}
            value={text}
            autoCorrect={false}
            autoCapitalize={'none'}
            keyboardAppearance={styleKit?.keyboardColorForActiveTheme()}
            autoFocus
            underlineColorAndroid={'transparent'}
            onSubmitEditing={onSubmit}
          />
        </SectionedTableCell>

        <ButtonCell
          maxHeight={45}
          disabled={text.length === 0}
          title={'Save'}
          bold
          onPress={() => {}}
        />
      </TableSection>
    </Container>
  );
};
