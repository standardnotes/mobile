import React, { Component } from 'react';
import StyleKit from "../../style/StyleKit"
import {TextInput, View, Linking} from 'react-native';

import SectionHeader from "../../components/SectionHeader";
import ButtonCell from "../../components/ButtonCell";
import TableSection from "../../components/TableSection";
import SectionedTableCell from "../../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../../components/SectionedAccessoryTableCell";

export default class ThemesSection extends Component {
  render() {
    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        {this.props.themes.map(function(theme, i) {
          return (
            <SectionedAccessoryTableCell
              onPress={() => this.props.onThemeSelect(theme)}
              onLongPress={() => this.props.onThemeLongPress(theme)}
              text={theme.name}
              key={theme.uuid}
              first={i == 0}
              selected={() => {return StyleKit.get().isThemeActive(theme)}}
              dimmed={theme.getNotAvailOnMobile()}
              last={i == this.props.themes.length - 1 && this.props.themes.length > 1}
            />
          )
        }.bind(this))}

        {this.props.themes.length == 1 &&
          <SectionedAccessoryTableCell
            onPress={() => Linking.openURL("https://standardnotes.org/extensions")}
            last={true}
            text={"More Themes"}
          />
        }

      </TableSection>
    );
  }
}
