import React, { Component } from 'react';
import {DeviceEventEmitter, Modal, View, Text} from 'react-native';
import StyleKit from "@Style/StyleKit";
import PlatformStyles from "../models/PlatformStyles";

export default class HeaderTitleView extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    let styles = this.getStyles();

    return (
      <View style={styles.get('headerContainer')}>
        <Text style={styles.get('headerTitle')}>{this.props.title}</Text>
        {this.props.subtitle &&
          <Text
            numberOfLines={1}
            style={styles.get('headerSubtitle')}
            adjustsFontSizeToFit={true}
          >
            {this.props.subtitle}
          </Text>
        }
      </View>
    )
  }

  getStyles() {
    return new PlatformStyles({
      headerContainer: {
        backgroundColor: StyleKit.variable("stylekitContrastBackgroundColor"),
        flex: 1,
        justifyContent: 'flex-start',
        flexDirection: "column"
      },

      headerContainerAndroid: {
        alignItems: 'flex-start',
      },

      headerTitle: {
        color: StyleKit.variable("stylekitForegroundColor"),
        fontWeight: "bold",
        fontSize: 18,
        textAlign: "center",
      },

      headerSubtitle: {
        color: StyleKit.variable("stylekitForegroundColor"),
        opacity: 0.6,
        fontSize: 12,
      },

      headerSubtitleIOS: {
        textAlign: "center",
      },

      headerSubtitleAndroid: {
        fontSize: 13,
      }
    });
  }
}
