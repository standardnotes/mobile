import React from 'react';
import { View, ViewStyle } from 'react-native';
import SectionedTableCell, {
  Props as SectionTableCellProps
} from '@Components/SectionedTableCell';

type Props = {
  size?: number;
  backgroundColor: ViewStyle['backgroundColor'];
  borderColor: ViewStyle['borderColor'];
};

export default class Circle extends SectionedTableCell<Props> {
  styles!: Record<string, ViewStyle>;
  size: number;
  constructor(props: Readonly<SectionTableCellProps & Props>) {
    super(props);
    this.size = props.size || 12;
    this.loadStyles();
  }

  render() {
    return <View style={this.styles.circle} />;
  }

  loadStyles() {
    this.styles = {
      circle: {
        width: this.size,
        height: this.size,
        borderRadius: this.size / 2.0,
        backgroundColor: this.props.backgroundColor,
        borderColor: this.props.borderColor,
        borderWidth: 1
      }
    };
  }
}
