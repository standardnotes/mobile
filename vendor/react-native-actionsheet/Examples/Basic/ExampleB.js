import React from 'react'
import { View, Text, StyleSheet, Modal, ListView } from 'react-native'
import { ActionSheetCustom as ActionSheet } from 'react-native-actionsheet'

const CANCEL_INDEX = 0
const DESTRUCTIVE_INDEX = 4
const options = [
  'Cancel',
  'Apple',
  <Text style={{color: 'yellow'}}>Banana</Text>,
  'Watermelon',
  <Text style={{color: 'red'}}>Durian</Text>
]
const title = <Text style={{color: '#000', fontSize: 18}}>Which one do you like?</Text>

class ExampleB extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      selected: ''
    }
    this.handlePress = this.handlePress.bind(this)
    this.showActionSheet = this.showActionSheet.bind(this)
  }

  showActionSheet() {
    this.ActionSheet.show()
  }

  handlePress(i) {
    this.setState({
      selected: i
    })
  }

  render() {
    return (
      <View style={styles.wrapper}>
        <Text style={{marginBottom: 20}} >I like {options[this.state.selected]}</Text>
        <Text style={styles.button} onPress={this.showActionSheet}>Example B</Text>
        <ActionSheet
          ref={o => this.ActionSheet = o}
          title={title}
          message="custom message custom message custom message custom message custom message custom message "
          options={options}
          cancelButtonIndex={CANCEL_INDEX}
          destructiveButtonIndex={DESTRUCTIVE_INDEX}
          onPress={this.handlePress}
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  button: {
    width: 200,
    marginBottom: 10,
    paddingTop: 15,
    paddingBottom: 15,
    textAlign: 'center',
    color: '#fff',
    backgroundColor: '#38f'
  }
})

export default ExampleB






