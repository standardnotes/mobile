import { useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStackNavigationProp } from '@Root/AppStack';
import { useFiles } from '@Root/hooks/useFiles';
import { SCREEN_COMPOSE, SCREEN_UPLOADED_FILES_LIST } from '@Screens/screens';
import { SNIconStyled } from '@Screens/SideMenu/Files.styled';
import { SideMenuCell } from '@Screens/SideMenu/SideMenuCell';
import { SideMenuOptionIconDescriptionType } from '@Screens/SideMenu/SideMenuSection';
import { SNNote } from '@standardnotes/snjs';
import React, { FC, useContext } from 'react';
import { View } from 'react-native';

type Props = {
  note: SNNote;
};

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

  return (
    <View>
      {attachedFiles.slice(0, 3).map(file => {
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
                value: <SNIconStyled type={iconType} width={16} height={16} />,
              }}
            />
          </View>
        );
      })}
      <SideMenuCell text={'Show all files'} onSelect={openFilesScreen} />
      <SideMenuCell
        text={'Upload new file'}
        onSelect={() => console.error('Not implemented')}
      />
    </View>
  );
};
