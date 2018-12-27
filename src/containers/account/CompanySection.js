import React, { Component } from 'react';
import StyleKit from "../../style/StyleKit"
import ApplicationState from "../../ApplicationState"
import {TextInput, View, Text, Platform} from 'react-native';

import SectionHeader from "../../components/SectionHeader";
import ButtonCell from "../../components/ButtonCell";
import TableSection from "../../components/TableSection";
import SectionedTableCell from "../../components/SectionedTableCell";
import SectionedAccessoryTableCell from "../../components/SectionedAccessoryTableCell";

export default class CompanySection extends Component {
  render() {
    let storeName = Platform.OS == 'android' ? "Play Store" : "App Store";
    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        <ButtonCell first={true} leftAligned={true} title="Help" onPress={() => this.props.onAction("help")} />

        <ButtonCell leftAligned={true} title="Send Feedback" onPress={() => this.props.onAction("feedback")} />

        <ButtonCell leftAligned={true} title="Tell a Friend" onPress={() => this.props.onAction("friend")} />

        <ButtonCell leftAligned={true} title="Learn more about Standard Notes" onPress={() => this.props.onAction("learn_more")} />

        <ButtonCell leftAligned={true} title="Our Privacy Manifesto" onPress={() => this.props.onAction("privacy")} />

        <ButtonCell last={true} leftAligned={true} title="Rate Standard Notes" onPress={() => this.props.onAction("rate")} >
          <View style={{display: "flex", flexDirection: "column"}}>
            <Text style={{color: StyleKit.variable("stylekitNeutralColor"), marginTop: 3}}>Version {ApplicationState.version}</Text>
            <Text style={{color: StyleKit.variable("stylekitNeutralColor"), marginTop: 3}}>Help support us with a review on the {storeName}.</Text>
          </View>
        </ButtonCell>

      </TableSection>
    );
  }
}
