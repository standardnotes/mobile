import React, { Fragment } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextStyle,
  ViewStyle,
} from 'react-native';
import ThemedComponent from '@Components/ThemedComponent';
import SideMenuCell from '@Screens/SideMenu/SideMenuCell';

type Props = {
  title: string;
  collapsed?: boolean;
  options?: any[];
};

type State = {
  collapsed: boolean;
};

export type SideMenuOption = {
  text: string;
  subtext?: string;
  textClass?: 'info' | 'danger' | 'warning';
  key?: string;
  iconDesc?: {
    type: string;
    side?: 'left' | 'right';
    name?: string;
    value?: string;
    backgroundColor?: string;
    borderColor?: string;
    size?: number;
  };
  dimmed?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onLongPress?: () => void;
};

export default class SideMenuSection extends ThemedComponent<Props, State> {
  styles!: Record<string, ViewStyle | TextStyle>;
  static BuildOption({
    text,
    subtext,
    textClass,
    key,
    iconDesc,
    dimmed,
    selected,
    onSelect,
    onLongPress,
  }: SideMenuOption) {
    return {
      text,
      subtext,
      textClass,
      key,
      iconDesc,
      dimmed,
      selected,
      onSelect,
      onLongPress,
    };
  }

  constructor(props: Readonly<Props>) {
    super(props);
    this.state = { collapsed: props.collapsed ?? false };
  }

  toggleCollapse = () => {
    this.setState(prevState => {
      return { collapsed: !prevState.collapsed };
    });
  };

  render() {
    const options = this.props.options || [];
    const collapsedLabel =
      options.length > 0 ? options.length + ' Options' : 'Hidden';
    return (
      <View style={this.styles.root}>
        <TouchableOpacity
          style={[
            this.styles.header,
            this.state.collapsed ? this.styles.collapsedHeader : null,
          ]}
          // TODO: removed prop
          // underlayColor={StyleKit.variables.stylekitBorderColor}
          onPress={this.toggleCollapse}
        >
          <Fragment>
            <Text style={this.styles.title}>{this.props.title}</Text>
            {this.state.collapsed && (
              <Text style={this.styles.collapsedLabel}>{collapsedLabel}</Text>
            )}
          </Fragment>
        </TouchableOpacity>

        {!this.state.collapsed && (
          <Fragment>
            {options.map(option => {
              return (
                <SideMenuCell
                  text={option.text}
                  textClass={option.textClass}
                  subtext={option.subtext}
                  key={option.text + option.subtext + option.key}
                  iconDesc={option.iconDesc}
                  dimmed={option.dimmed}
                  selected={option.selected}
                  onSelect={option.onSelect}
                  onLongPress={option.onLongPress}
                />
              );
            })}

            {this.props.children}
          </Fragment>
        )}
      </View>
    );
  }

  loadStyles() {
    const styleKitVariables = this.context!.getThemeService().variables;
    this.styles = {
      root: {
        paddingBottom: 6,
      },
      header: {
        height: 22,
      },
      collapsedHeader: {
        height: 50,
      },
      title: {
        color: styleKitVariables.stylekitInfoColor,
        fontSize: 13,
        fontWeight: '700',
      },

      collapsedLabel: {
        fontSize: 12,
        opacity: 0.7,
        marginTop: 3,
        color: styleKitVariables.stylekitContrastForegroundColor,
      },
    };
  }
}
