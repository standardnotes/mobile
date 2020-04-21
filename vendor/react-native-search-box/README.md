## React Native Search Box
- A simple search box with animation, inspired from ios search bar.
- Lightweight, fast, flexible, customizable.
- Support both iOS/Android devices
- Support vertical, horizontal layout
- Shadow invisible by default

## Install
```
npm install --save react-native-search-box

or

yarn add react-native-search-box
```

## Demo

| Platform | Android | iOS |
|:--------:|:-------:|:---:|
| Demo | ![Android](https://media.giphy.com/media/3oKIPja49woFsDBuPC/giphy.gif) | ![iOS](https://media.giphy.com/media/3oKIPvb7oymPsobWI8/giphy.gif) |

## Example code

[Example](https://github.com/agiletechvn/react-native-atoz-listview/blob/master/example/src/screens/Contacts/Home.js#L162)

## Usage

```javascript
import React, { PureComponent } from 'react';
import { TouchableHightLight, Text, View } from 'react-native';
import AtoZListView from 'react-native-atoz-listview';
import Search from 'react-native-search-box';

const rowHeight = 40;

class MyScene extends PureComponent {

  state = {
    data: {
      "A": [
        {
          "name": "Anh Tuan Nguyen",
          "age": 28
        },
        {
          "name": "An Nhien",
          "age": 2
        },
      ],
      "Z": [
        {
          "name": "Thanh Tu Pham",
          "age": 32
        },
        {
          "name": "Tien Thanh",
          "age": 24
        },
      ]
    }
  }

    renderRow = (item, sectionId, index) => {
      return (
        <TouchableHightLight
          style={{
            height: rowHeight,
            justifyContent: 'center',
            alignItems: 'center'}}
        >
          <Text>{item.name}</Text>
        </TouchableHightLight>
      );
    }

    // Important: You must return a Promise
    beforeFocus = () => {
        return new Promise((resolve, reject) => {
            console.log('beforeFocus');
            resolve();
        });
    }

    // Important: You must return a Promise
    onFocus = (text) => {
        return new Promise((resolve, reject) => {
            console.log('onFocus', text);
            resolve();
        });
    }

    // Important: You must return a Promise
    afterFocus = () => {
        return new Promise((resolve, reject) => {
            console.log('afterFocus');
            resolve();
        });
    }

  render() {
    // inside your render function
    return (
      <View style={{ flex: 1}}>
        <Search
          ref="search_box"
          /**
          * There many props that can customizable
          * Please scroll down to Props section
          */
        />

        <AtoZListView
          data={this.state.data}
          renderRow={this.renderRow}
          rowHeight={rowHeight}
          sectionHeaderHeight={40}
        />
      </View>
    );
  }
}
```

## Props

```
    /**
     * onFocus
     * return a Promise
     * beforeFocus, onFocus, afterFocus
     */
    beforeFocus: PropTypes.func,
    onFocus: PropTypes.func,
    afterFocus: PropTypes.func,

    /**
     * onSearch
     * return a Promise
     * NOTE: As of RN V0.48.3 the blurOnSubmit property must be set to {true} for this to trigger
     */
    beforeSearch: PropTypes.func,
    onSearch: PropTypes.func,
    afterSearch: PropTypes.func,

    /**
     * onChangeText
     * return a Promise
     */
    onChangeText: PropTypes.func,

    /**
     * onCancel
     * return a Promise
     */
    beforeCancel: PropTypes.func,
    onCancel: PropTypes.func,
    afterCancel: PropTypes.func,

    /**
     * async await
     * return a Promise
     * beforeDelete, onDelete, afterDelete
     */
    beforeDelete: PropTypes.func,
    onDelete: PropTypes.func,
    afterDelete: PropTypes.func,

    /**
     * styles
     */
    backgroundColor: PropTypes.string,
    placeholderTextColor: PropTypes.string,
    titleCancelColor: PropTypes.string,
    tintColorSearch: PropTypes.string,
    tintColorDelete: PropTypes.string,
    cancelButtonWidth: PropTypes.number,
    cancelButtonStyle: PropTypes.PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.object
    ]),
    cancelButtonTextStyle: PropTypes.PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.object
    ]),
    onLayout: PropTypes.func,
    inputStyle: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.object
    ]),

    /**
     * text input
     */
    defaultValue: PropTypes.string,
    placeholder: PropTypes.string,
    cancelTitle: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object
    ]),
    iconDelete: PropTypes.object,
    iconSearch: PropTypes.object,
    returnKeyType: PropTypes.string,
    keyboardType: PropTypes.string,
    autoCapitalize: PropTypes.string,
    inputHeight: PropTypes.number,
    inputBorderRadius: PropTypes.number,
    contentWidth: PropTypes.number,
    middleWidth: PropTypes.number,
    blurOnSubmit: PropTypes.bool,
    keyboardDismissOnSubmit: PropTypes.bool,

    /**
     * Positioning
     */
    positionRightDelete: PropTypes.number,
    searchIconCollapsedMargin: PropTypes.number,
    searchIconExpandedMargin: PropTypes.number,
    placeholderCollapsedMargin: PropTypes.number,
    placeholderExpandedMargin: PropTypes.number,
```

## Prop Defaults
```
    searchIconCollapsedMargin: 25,
    searchIconExpandedMargin: 10,
    placeholderCollapsedMargin: 15,
    placeholderExpandedMargin: 20,
    shadowVisible: false
```

## LICENSE

The MIT License

Copyright (c) 2017 Agiletech. https://github.com/agiletechvn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
