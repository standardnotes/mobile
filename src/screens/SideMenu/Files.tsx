import { useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStackNavigationProp } from '@Root/AppStack';
import { useFiles } from '@Root/hooks/useFiles';
import { SCREEN_COMPOSE, SCREEN_UPLOADED_FILES_LIST } from '@Screens/screens';
import { IconsContainer, SNIconStyled } from '@Screens/SideMenu/Files.styled';
import { SideMenuCell } from '@Screens/SideMenu/SideMenuCell';
import { SideMenuOptionIconDescriptionType } from '@Screens/SideMenu/SideMenuSection';
import { SNNote } from '@standardnotes/snjs';
import React, { FC, useContext } from 'react';
import { View } from 'react-native';

type Props = {
  note: SNNote;
};

const MaximumVisibleFilesCount = 3;

export const Files: FC<Props> = ({ note }) => {
  const application = useContext(ApplicationContext);

  const navigation =
    useNavigation<
      AppStackNavigationProp<typeof SCREEN_COMPOSE>['navigation']
    >();
  const { showActionsMenu, attachedFiles } = useFiles({ note });

  if (!application) {
    return null;
  }

  const openFilesScreen = () => {
    navigation.navigate(SCREEN_UPLOADED_FILES_LIST, { note });
  };

  const isFilesListTruncated = attachedFiles.length > MaximumVisibleFilesCount;

  return (
    <View>
      {attachedFiles.slice(0, MaximumVisibleFilesCount).map(file => {
        const iconType = application.iconsController.getIconForFileType(
          file.mimeType
        );

        return (
          <View>
            <SideMenuCell
              text={file.name}
              key={file.uuid}
              onSelect={() => showActionsMenu(file)}
              iconDesc={{
                side: 'right',
                type: SideMenuOptionIconDescriptionType.CustomComponent,
                value: (
                  <IconsContainer>
                    {file.protected && (
                      <SNIconStyled
                        type={'lock-filled'}
                        width={16}
                        height={16}
                      />
                    )}
                    <SNIconStyled type={iconType} width={16} height={16} />
                  </IconsContainer>
                ),
              }}
            />
          </View>
        );
      })}
      <SideMenuCell
        text={
          isFilesListTruncated ? 'Show all attached files' : 'Show other files'
        }
        onSelect={openFilesScreen}
      />
      <SideMenuCell
        text={'Upload new file'}
        onSelect={() => console.error('Not implemented')}
      />
    </View>
  );
};
