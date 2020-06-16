import styled from 'styled-components/native';
import Icon from 'react-native-vector-icons/Ionicons';

const MARGIN = 4;
const PADDING = 12;

const Touchable = styled.TouchableWithoutFeedback``;
const Container = styled.View`
  flex: 1;
  flex-direction: 'row';
  margin: ${MARGIN}px;
  padding: ${PADDING}px;
  border-width: 1;
  border-radius: 4;
  border-color: ${props => props.theme.stylekitBorderColor};
`;
const CenterContainer = styled.View`
  justify-content: center;
`;
const UserIcon = styled(Icon)`
  font-size: 24;
  color: ${props => props.theme.stylekitInfoColor};
`;
const ForwardIcon = styled(UserIcon)`
  color: ${props => props.theme.stylekitNeutralColor};
`;
const TextContainer = styled.View`
  flex: 1;
  padding-left: ${PADDING};
`;
const BoldText = styled.Text`
  font-size: 15px;
  font-weight: '600';
  color: ${props => props.theme.stylekitForegroundColor};
`;
const SubText = styled.Text`
  margin-top: 2;
  font-size: 11;
  color: ${props => props.theme.stylekitNeutralColor};
`;

export {
  Touchable,
  Container,
  CenterContainer,
  UserIcon,
  ForwardIcon,
  TextContainer,
  BoldText,
  SubText,
};
