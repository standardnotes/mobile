import { ApplicationContext } from '@Root/ApplicationContext';
import { SideMenuCell } from '@Screens/SideMenu/SideMenuCell';
import { SNNote } from '@standardnotes/snjs';
import { ListedAccountInfo } from '@standardnotes/snjs/dist/@types/services/api/responses';
import { useCustomActionSheet } from '@Style/custom_action_sheet';
import React, { FC, useContext } from 'react';
import { FlatList, View } from 'react-native';

type TProps = {
  listedAccountDetails: (ListedAccountInfo | undefined)[];
  note: SNNote;
  getListedAccountsDetails: () => Promise<void>;
};

export const Listed: FC<TProps> = ({
  note,
  listedAccountDetails,
  getListedAccountsDetails,
}) => {
  const application = useContext(ApplicationContext);
  const { showActionSheet } = useCustomActionSheet();

  if (!application) {
    return null;
  }
  return (
    <View>
      <FlatList
        data={listedAccountDetails}
        renderItem={({ item }) => {
          if (!item) {
            return null;
          }
          return (
            <>
              <SideMenuCell
                text={item.display_name}
                onSelect={() => {
                  showActionSheet(
                    item.display_name,
                    item.actions.map(action => ({
                      text: action.label,
                      callback: async () => {
                        const response = await application.actionsManager.runAction(
                          action,
                          note
                        );

                        if (!response || response.error) {
                          return;
                        }
                        await getListedAccountsDetails();
                      },
                    }))
                  );
                }}
              />
            </>
          );
        }}
      />
    </View>
  );
};
