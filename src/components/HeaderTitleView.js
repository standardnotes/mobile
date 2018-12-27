import React, { Component } from 'react';
import {DeviceEventEmitter, Modal, View, Text} from 'react-native';
import GlobalStyles from "../Styles";
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
          <Text style={styles.get('headerSubtitle')}>{this.props.subtitle}</Text>
        }
      </View>
    )
  }

  getStyles() {
    return new PlatformStyles({
      headerContainer: {
        backgroundColor: GlobalStyles.constants().mainBackgroundColor,
        flex: 1,
        justifyContent: 'flex-start',
        flexDirection: "column"
      },

      headerContainerAndroid: {
        alignItems: 'flex-start',
      },

      headerTitle: {
        color: GlobalStyles.constants().mainTextColor,
        fontWeight: "bold",
        fontSize: 18,
        textAlign: "center",
      },

      headerSubtitle: {
        color: GlobalStyles.constants().mainTextColor,
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
