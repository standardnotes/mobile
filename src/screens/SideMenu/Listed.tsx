import { ApplicationContext } from '@Root/ApplicationContext';
import {
  CantLoadActionsText,
  CreateBlogContainer,
  LearnMore,
} from '@Screens/SideMenu/Listed.styled';
import { SideMenuCell } from '@Screens/SideMenu/SideMenuCell';
import { ButtonType, ListedAccount, SNNote } from '@standardnotes/snjs';
import { ListedAccountInfo } from '@standardnotes/snjs/dist/@types/services/api/responses';
import { useCustomActionSheet } from '@Style/custom_action_sheet';
import React, { FC, useCallback, useContext, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';

type TProps = {
  note: SNNote;
};

type TListedAccountItem =
  | ListedAccountInfo
  | Pick<ListedAccountInfo, 'display_name'>;

export const Listed: FC<TProps> = ({ note }) => {
  const application = useContext(ApplicationContext);

  const [isRequestingAccount, setIsRequestingAccount] = useState(false);
  const [listedAccounts, setListedAccounts] = useState<ListedAccount[]>([]);
  const [listedAccountDetails, setListedAccountDetails] = useState<
    TListedAccountItem[]
  >([]);

  const { showActionSheet } = useCustomActionSheet();

  const loadListedAccountsDetails = useCallback(
    async (accounts: ListedAccount[]) => {
      if (!application) {
        return;
      }
      const listedAccountsArray: TListedAccountItem[] = [];

      for (const listedAccountItem of accounts) {
        const listedItemInfo = await application.getListedAccountInfo(
          listedAccountItem,
          note?.uuid
        );

        listedAccountsArray.push(
          listedItemInfo
            ? listedItemInfo
            : { display_name: listedAccountItem.authorId }
        );
      }
      setListedAccountDetails(listedAccountsArray);
    },
    [application, note?.uuid]
  );

  const reloadListedAccounts = useCallback(async () => {
    if (!application) {
      return [];
    }
    const accounts = await application.getListedAccounts();
    setListedAccounts(accounts);

    await loadListedAccountsDetails(accounts);
  }, [application, loadListedAccountsDetails]);

  const registerNewAccount = useCallback(() => {
    if (!application || isRequestingAccount) {
      return;
    }

    const requestAccount = async () => {
      setIsRequestingAccount(true);
      const account = await application.requestNewListedAccount();
      if (account) {
        const openSettings = await application.alertService.confirm(
          'Your new Listed blog has been successfully created!' +
            ' You can publish a new post to your blog from Standard Notes via the' +
            ' <i>Actions</i> menu in the editor pane. Open your blog settings to begin setting it up.',
          undefined,
          'Open Settings',
          ButtonType.Info,
          'Later'
        );
        reloadListedAccounts();

        if (openSettings) {
          const info = await application.getListedAccountInfo(account);
          if (info) {
            application.deviceInterface.openUrl(info?.settings_url);
          }
        }
      }
      setIsRequestingAccount(false);
    };

    requestAccount();
  }, [application, isRequestingAccount, reloadListedAccounts]);

  useEffect(() => {
    const loadListedData = async () => {
      await reloadListedAccounts();
    };
    loadListedData();
  }, [reloadListedAccounts]);

  const doesListedItemHaveActions = (
    item: TListedAccountItem
  ): item is ListedAccountInfo => {
    return (item as ListedAccountInfo).author_url !== undefined;
  };

  const showActionsMenu = (item: TListedAccountItem) => {
    if (!application) {
      return;
    }
    if (!doesListedItemHaveActions(item)) {
      application.alertService.alert('Unable to load actions.');
      return;
    }
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
          await loadListedAccountsDetails(listedAccounts);
          showActionsMenu(item);
        },
      }))
    );
  };

  if (!application) {
    return null;
  }

  return (
    <View>
      {listedAccountDetails.length > 0 && (
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
                  onSelect={() => showActionsMenu(item)}
                />
                {!isRequestingAccount && !doesListedItemHaveActions(item) && (
                  <CantLoadActionsText>
                    Unable to load actions
                  </CantLoadActionsText>
                )}
              </>
            );
          }}
        />
      )}
      <CreateBlogContainer>
        <SideMenuCell
          text={
            isRequestingAccount ? 'Creating account...' : 'Create New Author'
          }
          onSelect={registerNewAccount}
        />
        <LearnMore
          onPress={() => {
            application.deviceInterface.openUrl('https://listed.to');
          }}
        >
          Learn more
        </LearnMore>
      </CreateBlogContainer>
    </View>
  );
};
