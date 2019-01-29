import React, { Component } from 'react';
import StyleKit from "@Style/StyleKit"
import ApplicationState from "@Lib/ApplicationState"
import {TextInput, View, Text, Platform, Share, Linking} from 'react-native';

import SectionHeader from "@Components/SectionHeader";
import ButtonCell from "@Components/ButtonCell";
import TableSection from "@Components/TableSection";
import SectionedTableCell from "@Components/SectionedTableCell";
import SectionedAccessoryTableCell from "@Components/SectionedAccessoryTableCell";

export default class CompanySection extends Component {

  onAction = (action) => {
    if(action == "feedback") {
      var platformString = Platform.OS == "android" ? "Android" : "iOS";
      ApplicationState.openURL(`mailto:hello@standardnotes.org?subject=${platformString} app feedback (v${ApplicationState.version})`);
    } else if(action == "learn_more") {
      ApplicationState.openURL("https://standardnotes.org");
    } else if(action == "privacy") {
      ApplicationState.openURL("https://standardnotes.org/privacy");
    } else if(action == "help") {
      ApplicationState.openURL("https://standardnotes.org/help");
    } else if(action == "rate") {
      if(ApplicationState.isIOS) {
        ApplicationState.openURL("https://itunes.apple.com/us/app/standard-notes/id1285392450?ls=1&mt=8");
      } else {
        ApplicationState.openURL("market://details?id=com.standardnotes");
      }
    } else if(action == "friend") {
      let title = "Standard Notes";
      var message = "Check out Standard Notes, a free, open-source, and completely encrypted notes app.";
      let url = "https://standardnotes.org";
      // Android ignores url. iOS ignores title.
      if(ApplicationState.isAndroid) {
        message += "\n\nhttps://standardnotes.org";
      }

      ApplicationState.get().performActionWithoutStateChangeImpact(() => {
        Share.share({title: title, message: message, url: url})
      })
    } else if(action == "spread-encryption") {
     let title = "The Unexpected Benefits of Encrypted Writing";
     var message = ApplicationState.isIOS ? title : "";
     let url = "https://standardnotes.org/why-encrypted";
     // Android ignores url. iOS ignores title.
     if(ApplicationState.isAndroid) {
       message += "\n\nhttps://standardnotes.org/why-encrypted";
     }

     ApplicationState.get().performActionWithoutStateChangeImpact(() => {
       Share.share({title: title, message: message, url: url})
     })
   }
  }

  render() {
    let storeName = Platform.OS == 'android' ? "Play Store" : "App Store";
    return (
      <TableSection>

        <SectionHeader title={this.props.title} />

        <ButtonCell first={true} leftAligned={true} title="Help" onPress={() => this.onAction("help")}>
          <Text style={{color: StyleKit.variable("stylekitNeutralColor"), marginTop: 3}}>https://standardnotes.org/help</Text>
        </ButtonCell>

        <ButtonCell leftAligned={true} title="Contact Support" onPress={() => this.onAction("feedback")}>
          <View style={{display: "flex", flexDirection: "column"}}>
            <Text style={{color: StyleKit.variable("stylekitNeutralColor"), marginTop: 3}}>hello@standardnotes.org</Text>
          </View>
        </ButtonCell>

        <ButtonCell leftAligned={true} title="Spread Encryption" onPress={() => this.onAction("spread-encryption")}>
          <Text style={{color: StyleKit.variable("stylekitNeutralColor"), marginTop: 3}}>Share the unexpected benefits of encrypted writing.</Text>
        </ButtonCell>

        <ButtonCell leftAligned={true} title="Tell a Friend" onPress={() => this.onAction("friend")}>
          <Text style={{color: StyleKit.variable("stylekitNeutralColor"), marginTop: 3}}>Share Standard Notes with a friend.</Text>
        </ButtonCell>

        <ButtonCell leftAligned={true} title="Learn About Standard Notes" onPress={() => this.onAction("learn_more")}>
          <Text style={{color: StyleKit.variable("stylekitNeutralColor"), marginTop: 3}}>https://standardnotes.org</Text>
        </ButtonCell>

        <ButtonCell leftAligned={true} title="Our Privacy Manifesto" onPress={() => this.onAction("privacy")}>
          <Text style={{color: StyleKit.variable("stylekitNeutralColor"), marginTop: 3}}>https://standardnotes.org/privacy</Text>
        </ButtonCell>

        <ButtonCell last={true} leftAligned={true} title="Rate Standard Notes" onPress={() => this.onAction("rate")} >
          <View style={{display: "flex", flexDirection: "column"}}>
            <Text style={{color: StyleKit.variable("stylekitNeutralColor"), marginTop: 3}}>Version {ApplicationState.version}</Text>
            <Text style={{color: StyleKit.variable("stylekitNeutralColor"), marginTop: 3}}>Help support us with a review on the {storeName}.</Text>
          </View>
        </ButtonCell>

      </TableSection>
    );
  }
}
