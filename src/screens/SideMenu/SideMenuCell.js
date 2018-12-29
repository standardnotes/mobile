import React, { Component } from 'react';
import { ScrollView, View, Text, TouchableHighlight } from 'react-native';
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

  render() {
    let iconSide = this.props.iconDesc.side ? this.props.iconDesc.side : "left";
    return (
      <TouchableHighlight
        style={this.styles.cell}
        underlayColor={StyleKit.variable("stylekitBorderColor")}
        onPress={this.onPress}
        onLongPress={this.onLongPress}
      >
        <View style={this.styles.cellContent}>
          {iconSide == "left" &&
            <View style={this.styles.iconContainerLeft}>
              {this.getIconElement()}
            </View>
          }

          <Text style={this.styles.text}>{this.props.text}</Text>

          {this.props.children}

          {iconSide == "right" &&
            <View style={this.styles.iconContainerRight}>
              {this.getIconElement()}
            </View>
          }
        </View>
      </TouchableHighlight>
    )
  }

  loadStyles() {
    this.styles = {
      iconColor: StyleKit.variable("stylekitContrastInfoColor"),

      cell: {
        minHeight: 42 ,
      },

      cellContent: {
        flex: 1,
        flexDirection: 'row'
      },

      iconContainerLeft: {
        marginRight: 6
      },

      iconContainerRight: {
        marginLeft: 6,
        marginRight: 3
      },

      text: {
        color: StyleKit.variable("stylekitContrastForegroundColor"),
        fontWeight: 'bold',
        fontSize: 15
      },

      iconAscii: {
        fontSize: 15,
        fontWeight: "bold",
        color: StyleKit.variable("stylekitNeutralColor"),
        opacity: 0.6,
      }
    }
  }
}
