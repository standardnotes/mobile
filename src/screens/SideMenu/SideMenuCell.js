import React, { Component } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ThemedComponent from "@Components/ThemedComponent";

import StyleKit from "@Style/StyleKit"
import Circle from "@Components/Circle"

export default class SideMenuCell extends ThemedComponent {

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
        <View style={this.styles.iconGraphic}>
          <Icon name={desc.name} size={desc.size || 20} color={this.styles.iconColor} />
        </View>
      )
    } else if(desc.type == "ascii") {
        return (
          <Text style={this.styles.iconAscii}>{desc.value}</Text>
        )
    } else if(desc.type == "circle") {
      return (
        <View style={this.styles.iconCircle}>
          <Circle backgroundColor={desc.backgroundColor} borderColor={desc.borderColor} />
        </View>
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
    let hasIcon = this.props.iconDesc;
    let iconSide = (hasIcon && this.props.iconDesc.side) ? this.props.iconDesc.side : (hasIcon ? "left" : null);
    return (
      <TouchableOpacity style={this.styles.cell} onPress={this.onPress} onLongPress={this.onLongPress}>
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
      iconColor: StyleKit.variables.stylekitInfoColor,
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
        marginRight: 4,
        height: "100%",
      },

      textContainer: {
        height: 24,
        marginLeft: 6
      },

      textContainerSelected: {
        borderBottomColor: StyleKit.variable("stylekitInfoColor"),
        borderBottomWidth: 2,
      },

      text: {
        height: "100%",
        color: StyleKit.variables.stylekitContrastForegroundColor,
        fontWeight: 'bold',
        fontSize: 15,
      },

      iconGraphic: {
        marginTop: -3,
        width: 20,
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
      },

      iconCircle: {
        marginTop: -5,
        width: 20,
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
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
