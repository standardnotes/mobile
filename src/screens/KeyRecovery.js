import React, { Component } from 'react';
import { TextInput, View, Text, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-navigation';
import StyleKit from "@Style/StyleKit"
import SF from '@SFJS/sfjs'
import KeysManager from "@Lib/keysManager"
import ModelManager from "@SFJS/modelManager"
import Sync from "@SFJS/syncManager"
import TableSection from "@Components/TableSection";
import SectionedTableCell from "@Components/SectionedTableCell";
import SectionHeader from "@Components/SectionHeader";
import ButtonCell from "@Components/ButtonCell";
import Abstract from "@Screens/Abstract"
import ApplicationState from "@Lib/ApplicationState"
import AlertManager from "@SFJS/alertManager"

export default class KeyRecovery extends Abstract {

  static navigationOptions = ({ navigation, navigationOptions }) => {
    let templateOptions = {
      title: "Key Recovery",
      leftButton: {
        title: ApplicationState.isIOS ? "Cancel" : null,
        iconName: ApplicationState.isIOS ? null : StyleKit.nameForIcon("close"),
      }
    }
    return Abstract.getDefaultNavigationOptions({navigation, navigationOptions, templateOptions});
  };

  constructor(props) {
    super(props);

    props.navigation.setParams({
      leftButton: {
        title: ApplicationState.isIOS ? "Cancel" : null,
        iconName: ApplicationState.isIOS ? null : StyleKit.nameForIcon("close"),
        onPress: () => {
          this.dismiss();
        }
      }
    })

    this.state = {text: ""}

    this.reloadData();
  }

  reloadData() {
    this.items = ModelManager.get().allItems;
    this.encryptedCount = 0;
    for(var item of this.items) {
      if(item.errorDecrypting) {
        this.encryptedCount++;
      }
    }
  }

  dismiss() {
    this.props.navigation.goBack(null);
  }

  submit = async () => {
    let authParams = KeysManager.get().offlineAuthParams;
    let keys = await SF.get().crypto.computeEncryptionKeysForUser(this.state.text, authParams);
    await SFJS.itemTransformer.decryptMultipleItems(this.items, keys);

    this.encryptedCount = 0;
    for(var item of this.items) {
      if(item.errorDecrypting) {
        this.encryptedCount++;
      }
    }

    let useKeys = async (confirm) => {
      let run = async () => {
        await KeysManager.get().persistOfflineKeys(keys);
        await ModelManager.get().mapResponseItemsToLocalModelsOmittingFields(this.items, null, SFModelManager.MappingSourceLocalRetrieved);
        await Sync.get().writeItemsToLocalStorage(this.items);
        this.dismiss();
      }

      if(confirm) {
        AlertManager.get().confirm({
          title: "Use Keys?",
          text: `Are you sure you want to use these keys? Not all items are decrypted, but if some have been, it may be an optimal solution.`,
          cancelButtonText: "Cancel",
          confirmButtonText: "Use",
          onConfirm: () => {
            run();
          }
        })
      } else {
        run();
      }
    }

    if(this.encryptedCount == 0) {
      // This is the correct passcode, automatically use it.
      useKeys();
    } else {
      AlertManager.get().confirm({
        title: "Unable to Decrypt",
        text: `The passcode you attempted still yields ${this.encryptedCount} un-decryptable items. It's most likely incorrect.`,
        cancelButtonText: "Use Anyway",
        confirmButtonText: "Try Again",
        onConfirm: () => {
          // Try again
          this.setState({text: ""});
        },
        onCancel: () => {
          // Use anyway
          useKeys(true);
        }
      })
    }
  }

  onTextChange = (text) => {
    this.setState({text: text})
  }

  render() {

    return (
      <SafeAreaView style={[StyleKit.styles.container, StyleKit.styles.baseBackground]}>
        <TableSection extraStyles={[StyleKit.styles.container]}>
          <SectionedTableCell first={true}>
            <Text>
              {this.encryptedCount} items are encrypted and missing keys.
              This can occur as a result of a device cloud restore.
              Please enter the value of your local passcode as it was before the restore.
              We'll be able to determine if it is correct based on its ability to decrypt your items.
            </Text>
          </SectionedTableCell>
          <SectionedTableCell textInputCell={true} last={true}>
            <TextInput
              ref={(ref) => {this.inputRef = ref}}
              style={[StyleKit.styles.sectionedTableCellTextInput]}
              placeholder={"Enter Local Passcode"}
              onChangeText={this.onTextChange}
              value={this.state.text}
              secureTextEntry={true}
              autoCorrect={false}
              autoCapitalize={'none'}
              keyboardAppearance={StyleKit.get().keyboardColorForActiveTheme()}
              autoFocus={true}
              placeholderTextColor={StyleKit.variable("stylekitNeutralColor")}
              underlineColorAndroid={'transparent'}
              onSubmitEditing={this.submit.bind(this)}
            />
          </SectionedTableCell>

          <ButtonCell
            maxHeight={45}
            disabled={this.state.text.length == 0}
            title={"Submit"}
            bold={true}
            onPress={() => this.submit()}
          />
        </TableSection>
      </SafeAreaView>
    );
  }

}
