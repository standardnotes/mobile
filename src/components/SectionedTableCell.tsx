import React, { Component } from 'react';
import { View } from 'react-native';
import { ApplicationContext } from 'App';

export type Props = {
  first?: boolean;
  last?: boolean;
  textInputCell?: any;
  height?: number;
  extraStyles?: any;
  testID?: string;
};

export default class SectionedTableCell<AdditionalProps = {}> extends Component<
  Props & AdditionalProps
> {
  static contextType = ApplicationContext;
  declare context: React.ContextType<typeof ApplicationContext>;
  rules() {
    let rules = [this.context?.getThemeService().styles.sectionedTableCell];
    if (this.props.first) {
      rules.concat(
        this.context?.getThemeService().stylesForKey('sectionedTableCellFirst')
      );
    }
    if (this.props.last) {
      rules.concat(
        this.context?.getThemeService().stylesForKey('sectionedTableCellLast')
      );
    }
    if (this.props.textInputCell) {
      rules.push(this.context?.getThemeService().styles.textInputCell);
    }
    if (this.props.height) {
      rules.push({ height: this.props.height });
    }
    if (this.props.extraStyles) {
      rules = rules.concat(this.props.extraStyles);
    }
    return rules;
  }

  render() {
    return <View style={this.rules()}>{this.props.children}</View>;
  }
}
