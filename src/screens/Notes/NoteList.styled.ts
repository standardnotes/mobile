import { StyleSheet } from 'react-native';
import styled from 'styled-components/native';

// no support for generic types in Flatlist
export const styles = StyleSheet.create({
  list: {
    height: '100%',
  },
  inputStyle: {
    height: 30,
  },
  androidSearch: {
    height: 30,
  },
});

export const Container = styled.View`
  background-color: ${props => props.theme.stylekitBackgroundColor};
`;

export const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  z-index: -1;
  position: absolute;
  height: 100%;
  width: 100%;
`;

export const LoadingText = styled.Text`
  position: absolute;
  opacity: 0.5;
  color: ${props => props.theme.stylekitForegroundColor};
`;

export const HeaderContainer = styled.View`
  padding-left: 5px;
  padding-right: 5px;
`;
