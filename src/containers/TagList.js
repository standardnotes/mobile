// import React, { Component } from 'react';
// import { StyleSheet, View, FlatList, RefreshControl, ScrollView, Text } from 'react-native';
// import StyleKit from "../style/StyleKit"
// import TableSection from "../components/TableSection";
// import SectionHeader from "../components/SectionHeader";
// import SectionedAccessoryTableCell from "../components/SectionedAccessoryTableCell";
// import ItemActionManager from '../lib/itemActionManager'
// import ActionSheet from 'react-native-actionsheet'
// import ApplicationState from "../ApplicationState"
//
// export default class TagList extends Component {
//   constructor(props) {
//     super(props);
//     this.state = {};
//   }
//
//   onPress = (tag) => {
//     this.props.onTagSelect(tag);
//   }
//
//   onLongPress = (tag) => {
//     this.props.onTagLongPress(tag);
//   }
//
//   // // must pass title, text, and tags as props so that it re-renders when either of those change
//   // _renderItem = ({item}) => {
//   //   return (
//   //     <View>
//   //       <SectionedAccessoryTableCell
//   //         onPress={() => {this.onPress(item)}}
//   //         onLongPress={() => this.showActionSheet(item)}
//   //         text={item.deleted ? "Deleting..." : item.title}
//   //         color={item.deleted ? StyleKit.variable("stylekitInfoColor") : undefined}
//   //         key={item.uuid}
//   //         first={this.props.tags.indexOf(item) == 0}
//   //         last={this.props.tags.indexOf(item) == this.props.tags.length - 1}
//   //         selected={() => {return this.props.selected.includes(item.uuid)}}
//   //       />
//   //
//   //       <ActionSheet
//   //         title={this.state.actionSheetTitle}
//   //         ref={o => this.actionSheet = o}
//   //         options={this.actionSheetActions().map((action) => {return action[0]})}
//   //         cancelButtonIndex={TagList.ActionSheetCancelIndex}
//   //         destructiveButtonIndex={TagList.ActionSheetDestructiveIndex}
//   //         onPress={this.handleActionSheetPress}
//   //         {...StyleKit.actionSheetStyles()}
//   //       />
//   //     </View>
//   //   )
//   // }
//
//   render() {
//     return (
//       <TableSection style={{backgroundColor: "transparent"}}>
//         // <SectionHeader
//         //   backgroundColor={this.props.backgroundColor}
//         //   foregroundColor={this.props.foregroundColor}
//         //   title={this.props.title}
//         //   buttonText={this.props.hasClearButton && "Clear"}
//         //   buttonAction={() => {this.props.clearSelection(true)}}
//         // />
//
//         // <FlatList style={[{height: "100%"}, StyleKit.styles().contrastView]}
//         //   initialNumToRender={10}
//         //   windowSize={10}
//         //   maxToRenderPerBatch={10}
//         //   data={this.props.tags}
//         //   renderItem={this._renderItem}
//         // />
//
//       </TableSection>
//     );
//   }
// }
