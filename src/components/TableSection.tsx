import React, { Component } from 'react';
import { View, ViewStyle } from 'react-native';
import { ApplicationContext } from 'App';

type Props = {
  extraStyles?: ViewStyle | ViewStyle[];
};

export default class TableSection extends Component<Props> {
  static contextType = ApplicationContext;
  declare context: React.ContextType<typeof ApplicationContext>;
  rules() {
    let rules = [this.context!.getThemeService().styles.tableSection];
    if (this.props.extraStyles) {
      rules = rules.concat(this.props.extraStyles);
    }
    return rules;
  }

  render() {
    return <View style={this.rules()}>{this.props.children}</View>;
  }
}
