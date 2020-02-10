import React, { Component } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import StyleKit from '@Style/StyleKit';

export default class LockedView extends Component {
  constructor(props) {
    super(props);
    this.loadStyles();
  }

  render() {
    const color = StyleKit.variables.stylekitInfoColor;
    const styles = [
      StyleKit.styles.centeredContainer,
      { backgroundColor: StyleKit.variables.stylekitBackgroundColor }
    ];
    if (this.props.style) {
      styles.push(this.props.style);
    }
    return (
      <View style={styles}>
        <Text style={{ color: color, marginTop: 5, fontWeight: 'bold' }}>
          Application Locked.
        </Text>

        {!this.props.onUnlockPress && (
          <Text style={{ color: color, marginTop: 5 }}>
            Return to Notes to unlock.
          </Text>
        )}

        {this.props.onUnlockPress && (
          <TouchableOpacity onPress={this.props.onUnlockPress}>
            <View style={this.styles.unlockButton}>
              <Text style={this.styles.unlockButtonText}>Unlock</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  loadStyles = () => {
    this.styles = {
      unlockButton: {
        marginTop: 15,
        padding: 8,
        paddingLeft: 20,
        paddingRight: 20,
        borderRadius: 3,
        backgroundColor: StyleKit.variables.stylekitInfoColor
      },

      unlockButtonText: {
        color: StyleKit.variables.stylekitInfoContrastColor,
        textAlign: 'center',
        fontWeight: 'bold'
      }
    };
  };
}
