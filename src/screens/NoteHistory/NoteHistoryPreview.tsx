import { IoniconsHeaderButton } from '@Components/IoniconsHeaderButton';
import { ApplicationContext } from '@Root/ApplicationContext';
import { HistoryStackNavigationProp } from '@Root/HistoryStack';
import {
  SCREEN_COMPOSE,
  SCREEN_NOTES,
  SCREEN_NOTE_HISTORY_PREVIEW,
} from '@Screens/screens';
import { ButtonType, PayloadSource, SNNote } from '@standardnotes/snjs';
import { useCustomActionSheet } from '@Style/custom_action_sheet';
import { ELIPSIS } from '@Style/icons';
import { ThemeService } from '@Style/theme_service';
import React, { useCallback, useContext, useLayoutEffect } from 'react';
import { LogBox } from 'react-native';
import { HeaderButtons, Item } from 'react-navigation-header-buttons';
import {
  Container,
  StyledTextView,
  TextContainer,
  Title,
  TitleContainer,
} from './NoteHistoryPreview.styled';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

type Props = HistoryStackNavigationProp<typeof SCREEN_NOTE_HISTORY_PREVIEW>;
export const NoteHistoryPreview = ({
  navigation,
  route: {
    params: { revision, title, originalNoteUuid },
  },
}: Props) => {
  // Context
  const application = useContext(ApplicationContext);
  const { showActionSheet } = useCustomActionSheet();

  // State

  const restore = useCallback(
    async (asCopy: boolean) => {
      const originalNote = application?.items.findItem(
        originalNoteUuid
      ) as SNNote;

      const run = async () => {
        if (asCopy) {
          await application?.mutator.duplicateItem(originalNote!, {
            ...revision.payload.safeContent,
            title: revision.payload.safeContent.title
              ? revision.payload.safeContent.title + ' (copy)'
              : undefined,
          });

          // @ts-expect-error
          navigation.navigate(SCREEN_NOTES);
        } else {
          await application?.mutator.changeAndSaveItem(
            originalNoteUuid,
            mutator => {
              mutator.unsafe_setCustomContent(revision.payload.safeContent);
            },
            true,
            PayloadSource.RemoteActionRetrieved
          );
          if (application?.getAppState().isTabletDevice) {
            // @ts-expect-error
            navigation.navigate(SCREEN_NOTES);
          } else {
            // @ts-expect-error
            navigation.navigate(SCREEN_COMPOSE);
          }
        }
      };

      if (!asCopy) {
        if (originalNote.locked) {
          application?.alertService.alert(
            "This note has editing disabled. If you'd like to restore it to a previous revision, enable editing and try again."
          );
          return;
        }
        const confirmed = await application?.alertService?.confirm(
          "Are you sure you want to replace the current note's contents with what you see in this preview?",
          'Restore note',
          'Restore',
          ButtonType.Info
        );
        if (confirmed) {
          run();
        }
      } else {
        run();
      }
    },
    [application, navigation, originalNoteUuid, revision.payload.safeContent]
  );

  const onPress = useCallback(() => {
    showActionSheet(title!, [
      {
        text: 'Restore',
        callback: () => restore(false),
      },
      {
        text: 'Restore as copy',
        callback: async () => restore(true),
      },
    ]);
  }, [showActionSheet, title, restore]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
          <Item
            testID="notePreviewOptions"
            disabled={false}
            iconSize={25}
            title={''}
            iconName={ThemeService.nameForIcon(ELIPSIS)}
            onPress={onPress}
          />
        </HeaderButtons>
      ),
    });
  }, [navigation, onPress]);

  return (
    <Container>
      <TitleContainer>
        <Title testID="notePreviewTitleField">
          {revision.payload.safeContent?.title}
        </Title>
      </TitleContainer>

      <TextContainer>
        <StyledTextView testID="notePreviewText">
          {revision.payload.safeContent?.text}
        </StyledTextView>
      </TextContainer>
    </Container>
  );
};
