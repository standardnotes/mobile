import React, { Component } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ThemedComponent from "@Components/ThemedComponent";
import ApplicationState from "@Lib/ApplicationState"

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
    this.props.onLongPress && this.props.onLongPress();
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

  colorForTextClass = (textClass) => {
    if(!textClass) {return null;}

    return {
      "info" : StyleKit.variables.stylekitInfoColor,
      "danger" : StyleKit.variables.stylekitDangerColor,
      "warning" : StyleKit.variables.stylekitWarningColor,
    }[textClass];
  }

  render() {
    let hasIcon = this.props.iconDesc;
    let iconSide = (hasIcon && this.props.iconDesc.side) ? this.props.iconDesc.side : (hasIcon ? "left" : null);
    let textColor = this.colorForTextClass(this.props.textClass);

    // if this is a dimmed cell, override text color with Neutral color
    if(this.props.dimmed) {
      textColor = StyleKit.variable("stylekitNeutralColor");
    }

    return (
      <TouchableOpacity style={this.styles.cell} onPress={this.onPress} onLongPress={this.onLongPress}>
        <View style={this.styles.cellContent}>

          {iconSide == "left" &&
            <View style={[this.styles.iconContainer, this.styles.iconContainerLeft]}>
              {this.getIconElement()}
            </View>
          }

          <View style={this.aggregateStyles(this.styles.textContainer, this.styles.textContainerSelected, this.props.selected)}>
            {this.props.subtext &&
              <View style={this.aggregateStyles(this.styles.subtextContainer, this.styles.subtextContainerSelected, this.props.selected)}>
              <Text style={this.aggregateStyles(this.styles.subtext, this.styles.subtextSelected, this.props.selected)}>{this.props.subtext}</Text>
              </View>
            }
            <Text style={[this.aggregateStyles(this.styles.text, this.styles.textSelected, this.props.selected), (textColor ? {color: textColor} : null)]}>{this.props.text}</Text>
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
        minHeight: this.props.subtext ? 52 : 42,
      },

      cellContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: "center",
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
        minHeight: this.props.subtext ? 38 : 24,
        marginLeft: 6
      },

      textContainerSelected: {
        borderBottomColor: StyleKit.variable("stylekitInfoColor"),
        borderBottomWidth: 2,
      },

      text: {
        color: StyleKit.variables.stylekitContrastForegroundColor,
        fontWeight: 'bold',
        fontSize: 15,
        paddingBottom: 0,
        fontFamily: ApplicationState.isAndroid ? 'Roboto' : null, // https://github.com/facebook/react-native/issues/15114#issuecomment-364458149
      },

      subtext: {
        color: StyleKit.variables.stylekitContrastForegroundColor,
        opacity: 0.75,
        fontSize: 12,
        marginTop: -5,
        marginBottom: 3,
        fontFamily: ApplicationState.isAndroid ? 'Roboto' : null, // https://github.com/facebook/react-native/issues/15114#issuecomment-364458149
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
