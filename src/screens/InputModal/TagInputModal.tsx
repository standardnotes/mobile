import React, { useContext, useState, useRef } from 'react';
import { TextInput } from 'react-native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { Container, Input } from './InputModal.styled';
import { TableSection } from '@Components/TableSection';
import { SectionedTableCell } from '@Components/SectionedTableCell';
import { ButtonCell } from '@Components/ButtonCell';
import { SCREEN_INPUT_MODAL_TAG } from '@Root/screens2/screens';
import { ModalStackNavigationProp } from '@Root/App';

type Props = ModalStackNavigationProp<typeof SCREEN_INPUT_MODAL_TAG>;
export const TagInputModal = (props: Props) => {
  // Context
  const application = useContext(ApplicationContext);

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
            keyboardAppearance={application
              ?.getThemeService()
              .keyboardColorForActiveTheme()}
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
