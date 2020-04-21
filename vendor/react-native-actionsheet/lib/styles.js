import { StyleSheet, Dimensions, StatusBar } from 'react-native'

export const hairlineWidth = StyleSheet.hairlineWidth

export default StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.4,
    backgroundColor: '#000'
  }
})

export const sheetStyle = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: 'row'
  },
  bd: {
    flex: 1,
    alignSelf: 'flex-end',
    backgroundColor: '#e5e5e5'
  },
  title: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  message: {
    height: 40,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  titleText: {
    color: '#8f8f8f',
    fontSize: 12
  }
})

export const btnStyle = StyleSheet.create({
  wrapper: {
    height: 50,
    marginTop: hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 18
  }
})
