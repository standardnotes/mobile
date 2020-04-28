import React from 'react';
import { TextInput, Text } from 'react-native';
import { SafeAreaView } from 'react-navigation';
import ButtonCell from '@Components/ButtonCell';
import { SFModelManager, protocolManager } from 'snjs';
import SectionedTableCell from '@Components/SectionedTableCell';
import TableSection from '@Components/TableSection';
import ApplicationState from '@Lib/ApplicationState';
import KeysManager from '@Lib/keysManager';
import Abstract from '@Screens/Abstract';
import ModelManager from '@Lib/snjs/modelManager';
import Sync from '@Lib/snjs/syncManager';
import AlertManager from '@Lib/snjs/alertManager';
import { ICON_CLOSE } from '@Style/icons';
import StyleKit from '@Style/StyleKit';

export default class KeyRecovery extends Abstract {
  static navigationOptions = ({ navigation, navigationOptions }) => {
    const templateOptions = {
      title: 'Key Recovery',
      leftButton: {
        title: ApplicationState.isIOS ? 'Cancel' : null,
        iconName: ApplicationState.isIOS
          ? null
          : StyleKit.nameForIcon(ICON_CLOSE),
      },
    };
    return Abstract.getDefaultNavigationOptions({
      navigation,
      navigationOptions,
      templateOptions,
    });
  };

  constructor(props) {
    super(props);

    props.navigation.setParams({
      leftButton: {
        title: ApplicationState.isIOS ? 'Cancel' : null,
        iconName: ApplicationState.isIOS
          ? null
          : StyleKit.nameForIcon(ICON_CLOSE),
        onPress: () => {
          this.dismiss();
        },
      },
    });

    this.state = { text: '' };

    this.reloadData();
  }

  reloadData() {
    this.items = ModelManager.get().allItems;
    this.encryptedCount = 0;
    for (const item of this.items) {
      if (item.errorDecrypting) {
        this.encryptedCount++;
      }
    }
  }

  dismiss() {
    this.props.navigation.goBack(null);
  }

  submit = async () => {
    const authParams = KeysManager.get().offlineAuthParams;
    const keys = await protocolManager.computeEncryptionKeysForUser(
      this.state.text,
      authParams
    );
    await SF.get().itemTransformer.decryptMultipleItems(this.items, keys);

    this.encryptedCount = 0;
    for (const item of this.items) {
      if (item.errorDecrypting) {
        this.encryptedCount++;
      }
    }

    let useKeys = async confirm => {
      const run = async () => {
        await KeysManager.get().persistOfflineKeys(keys);
        await ModelManager.get().mapResponseItemsToLocalModelsOmittingFields(
          this.items,
          null,
          SFModelManager.MappingSourceLocalRetrieved
        );
        await Sync.get().writeItemsToLocalStorage(this.items);
        this.dismiss();
      };

      if (confirm) {
        AlertManager.get().confirm({
          title: 'Use Keys?',
          text:
            'Are you sure you want to use these keys? Not all items are decrypted, but if some have been, it may be an optimal solution.',
          cancelButtonText: 'Cancel',
          confirmButtonText: 'Use',
          onConfirm: () => {
            run();
          },
        });
      } else {
        run();
      }
    };

    if (this.encryptedCount === 0) {
      // This is the correct passcode, automatically use it.
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useKeys();
    } else {
      AlertManager.get().confirm({
        title: 'Unable to Decrypt',
        text: `The passcode you attempted still yields ${this.encryptedCount} un-decryptable items. It's most likely incorrect.`,
        cancelButtonText: 'Use Anyway',
        confirmButtonText: 'Try Again',
        onConfirm: () => {
          // Try again
          this.setState({ text: '' });
        },
        onCancel: () => {
          // Use anyway
          // eslint-disable-next-line react-hooks/rules-of-hooks
          useKeys(true);
        },
      });
    }
  };

  onTextChange = text => {
    this.setState({ text: text });
  };

  render() {
    return (
      <SafeAreaView
        style={[StyleKit.styles.container, StyleKit.styles.baseBackground]}
      >
        <TableSection extraStyles={[StyleKit.styles.container]}>
          <SectionedTableCell first={true}>
            <Text>
              {this.encryptedCount} items are encrypted and missing keys. This
              can occur as a result of a device cloud restore. Please enter the
              value of your local passcode as it was before the restore. We'll
              be able to determine if it is correct based on its ability to
              decrypt your items.
            </Text>
          </SectionedTableCell>
          <SectionedTableCell textInputCell={true} last={true}>
            <TextInput
              ref={ref => {
                this.inputRef = ref;
              }}
              style={[StyleKit.styles.sectionedTableCellTextInput]}
              placeholder={'Enter Local Passcode'}
              onChangeText={this.onTextChange}
              value={this.state.text}
              secureTextEntry={true}
              autoCorrect={false}
              autoCapitalize={'none'}
              keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
              autoFocus={true}
              placeholderTextColor={StyleKit.variables.stylekitNeutralColor}
              underlineColorAndroid={'transparent'}
              onSubmitEditing={this.submit.bind(this)}
            />
          </SectionedTableCell>

          <ButtonCell
            maxHeight={45}
            disabled={this.state.text.length === 0}
            title={'Submit'}
            bold={true}
            onPress={() => this.submit()}
          />
        </TableSection>
      </SafeAreaView>
    );
  }
}
