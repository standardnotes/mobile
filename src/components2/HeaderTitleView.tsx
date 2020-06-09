import React, { Component } from 'react';
import { View, Text, TextStyle } from 'react-native';
import PlatformStyles from '@Models/PlatformStyles';

type Props = {
  subtitleColor?: TextStyle['color'];
  title: string;
  subtitle?: string;
};

export default class HeaderTitleView extends Component<Props> {
  constructor(props: Readonly<Props>) {
    super(props);
  }

  render() {
    let styles = this.getStyles();

    let subtitleStyles = styles.get('headerSubtitle');
    if (this.props.subtitleColor) {
      subtitleStyles[0].color = this.props.subtitleColor;
      subtitleStyles[0].opacity = 1.0;
    }

    return (
      <View style={styles.get('headerContainer')}>
        <Text style={styles.get('headerTitle')}>{this.props.title}</Text>

        {this.props.subtitle && (
          <Text
            numberOfLines={1}
            style={subtitleStyles}
            adjustsFontSizeToFit={true}
          >
            {this.props.subtitle}
          </Text>
        )}
      </View>
    );
  }

  getStyles() {
    return new PlatformStyles({
      headerContainer: {
        backgroundColor: this.context?.getThemeService().variables
          .stylekitContrastBackgroundColor,
        flex: 1,
        justifyContent: 'flex-start',
        flexDirection: 'column',
      },

      headerContainerAndroid: {
        alignItems: 'flex-start',
      },

      headerTitle: {
        color: this.context?.getThemeService().variables
          .stylekitForegroundColor,
        fontWeight: 'bold',
        fontSize: 18,
        textAlign: 'center',
      },

      headerSubtitle: {
        color: this.context?.getThemeService().variables
          .stylekitForegroundColor,
        opacity: 0.6,
        fontSize: 12,
      },

      headerSubtitleIOS: {
        textAlign: 'center',
      },

      headerSubtitleAndroid: {
        fontSize: 13,
      },
    });
  }
}
