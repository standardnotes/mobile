import React, { Component } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import Icons from '@Style/Icons';
import StyleKit from "@Style/StyleKit"
import Circle from "@Components/Circle"

export default class SideMenuCell extends Component {

  constructor(props) {
    super(props);
    this.loadStyles();
    this.updateStyles();
  }

  componentDidUpdate() {
    this.updateStyles();
  }

  updateStyles() {
    if(this.props.iconDesc && this.props.iconDesc.side == "right") {
      if(!this.styles.cellContent.justifyContent) {
        let styles = _.cloneDeep(this.styles);
        styles.cellContent.justifyContent = "space-between";
        this.styles = styles;
      }
    }
  }

  onPress = () => {
    this.props.onSelect();
  }

  onLongPress = () => {
    this.props.onLongPress();
  }

  getIconElement() {
    let desc = this.props.iconDesc;
    if(!desc) {
      return null;
    }

    if(desc.type == "icon") {
      return (
        <Icon name={desc.name} size={14} color={this.styles.iconColor} />
      )
    } else if(desc.type == "ascii") {
        return (
          <Text style={this.styles.iconAscii}>{desc.value}</Text>
        )
    } else if(desc.type == "circle") {
      return (
        <Circle backgroundColor={desc.backgroundColor} borderColor={desc.borderColor} />
      )
    } else {
      return (
        <Text>*</Text>
      )
    }
  }

  aggregateStyles(base, addition, condition) {
    if(condition) {
      return [base, addition];
    } else {
      return base;
    }
  }

  render() {
    let iconSide = this.props.iconDesc.side ? this.props.iconDesc.side : "left";
    return (
      <TouchableOpacity
        style={this.styles.cell}

        onPress={this.onPress}
        onLongPress={this.onLongPress}
      >
        <View style={this.styles.cellContent}>
          {iconSide == "left" &&
            <View style={[this.styles.iconContainer, this.styles.iconContainerLeft]}>
              {this.getIconElement()}
            </View>
          }

          <View style={this.aggregateStyles(this.styles.textContainer, this.styles.textContainerSelected, this.props.selected)}>
            <Text style={this.aggregateStyles(this.styles.text, this.styles.textSelected, this.props.selected)}>{this.props.text}</Text>
          </View>

          {this.props.children}

          {iconSide == "right" &&
            <View style={[this.styles.iconContainer, this.styles.iconContainerRight]}>
              {this.getIconElement()}
            </View>
          }
        </View>
      </TouchableOpacity>
    )
  }

  loadStyles() {
    this.styles = {
      iconColor: StyleKit.variable("stylekitContrastInfoColor"),
      selectionBgColor: StyleKit.hexToRGBA(StyleKit.variable("stylekitInfoColor"), 0.1),

      cell: {
        minHeight: 42,
      },

      cellContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: "center"
      },

      iconContainer: {
        flex: 0,
        justifyContent: "center",
        flexDirection: 'column',
      },

      iconContainerLeft: {
        marginRight: 6,
        height: "100%",
      },

      iconContainerRight: {
        marginLeft: 6,
        marginRight: 3,
        height: "100%",
      },

      textContainer: {
        height: 24
      },

      textContainerSelected: {
        borderBottomColor: StyleKit.variable("stylekitInfoColor"),
        borderBottomWidth: 2,
      },

      text: {
        height: "100%",
        color: StyleKit.variable("stylekitContrastForegroundColor"),
        fontWeight: 'bold',
        fontSize: 15,
      },

      iconAscii: {
        fontSize: 15,
        fontWeight: "bold",
        color: StyleKit.variable("stylekitNeutralColor"),
        opacity: 0.6,
        marginTop: -4
      }
    }
  }
}
