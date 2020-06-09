import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ViewProps,
} from 'react-native';
import { Circle } from '@Components/Circle';
import ThemedComponent from '@Root/components2/ThemedComponent';
import KeysManager from '@Lib/keysManager';
import Auth from '@Lib/snjs/authManager';
import ModelManager from '@Lib/snjs/modelManager';

type Props = {
  onPress: () => void;
  outOfSync: boolean;
  onOutOfSyncPress: () => void;
  testID: ViewProps['testID'];
};

export default class SideMenuHero extends ThemedComponent<Props> {
  styles!: Record<string, ViewStyle | TextStyle>;
  getText() {
    const offline = Auth.get().offline();
    const hasEncryption =
      !offline || KeysManager.get().isStorageEncryptionEnabled();
    if (offline) {
      return {
        title: 'Data Not Backed Up',
        text: hasEncryption
          ? 'Sign in or register to enable sync to your other devices.'
          : 'Sign in or register to add encryption and enable sync to your other devices.',
      };
    } else {
      const email = KeysManager.get().getUserEmail();
      const items = ModelManager.get().allItemsMatchingTypes(['Note', 'Tag']);
      const itemsStatus =
        items.length + '/' + items.length + ' notes and tags encrypted';
      return {
        title: email,
        text: itemsStatus,
      };
    }
  }

  render() {
    const textData = this.getText();
    const styleKitVariables = this.context!.getThemeService().variables;
    return (
      <View style={[this.styles.cell]}>
        <TouchableOpacity
          testID={this.props.testID}
          onPress={this.props.onPress}
        >
          <Text style={this.styles.title}>{textData.title}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={this.props.onPress}>
          <Text style={this.styles.subtitle}>{textData.text}</Text>
        </TouchableOpacity>

        {this.props.outOfSync && (
          <TouchableOpacity
            style={this.styles.outOfSyncContainer}
            onPress={this.props.onOutOfSyncPress}
          >
            <View style={this.styles.iconCircle}>
              <Circle
                size={10}
                backgroundColor={styleKitVariables.stylekitWarningColor}
                borderColor={styleKitVariables.stylekitWarningColor}
              />
            </View>
            <Text style={this.styles.outOfSync}>Potentially Out of Sync</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  loadStyles() {
    const styleKitVariables = this.context!.getThemeService().variables;
    this.styles = {
      cell: {
        backgroundColor: styleKitVariables.stylekitContrastBackgroundColor,
        borderBottomColor: styleKitVariables.stylekitContrastBorderColor,
        borderBottomWidth: 1,
        padding: 15,
        paddingTop: 10,
        paddingBottom: 12,
        paddingRight: 25,
      },

      title: {
        fontWeight: 'bold',
        fontSize: 16,
        color: styleKitVariables.stylekitContrastForegroundColor,
        marginBottom: 3,
      },

      subtitle: {
        fontSize: 13,
        color: styleKitVariables.stylekitContrastForegroundColor,
        opacity: 0.6,
      },

      outOfSyncContainer: {
        flex: 0,
        flexDirection: 'row',
        alignItems: 'center',
      },

      iconCircle: {
        marginTop: 10,
        width: 15,
      },

      outOfSync: {
        marginTop: 10,
        fontSize: 13,
        color: styleKitVariables.stylekitWarningColor,
        fontWeight: 'bold',
      },
    };
  }
}
