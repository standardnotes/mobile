import styled from 'styled-components/native';

export type Props = {
  first?: boolean;
  last?: boolean;
  textInputCell?: any;
  height?: number;
  extraStyles?: any;
};

export const SectionedTableCell = styled.View<Props>`
  border-bottom-color: ${props => props.theme.stylekitBorderColor};
  border-bottom-width: 1;
  padding-left: ${props => props.theme.paddingLeft};
  padding-right: ${props => props.theme.paddingLeft};
  max-height: ${props => (props.textInputCell ? 0 : 13)};
  padding-bottom: ${props => (props.textInputCell ? 0 : 12)};
  background-color: ${props => props.theme.stylekitBackgroundColor};
  border-top-color: ${props =>
    props.first ? props.theme.stylekitBorderColor : undefined};
  border-top-width: ${props => (props.first ? 1 : undefined)};
  max-height: ${props => (props.textInputCell ? 50 : undefined)};
  height: ${props => props.height ?? undefined};
`;

export const SectionedTableCellTouchableHighlight = styled.TouchableHighlight<
  Props
>`
  border-bottom-color: ${props => props.theme.stylekitBorderColor};
  border-bottom-width: 1;
  padding-left: ${props => props.theme.paddingLeft};
  padding-right: ${props => props.theme.paddingLeft};
  max-height: ${props => (props.textInputCell ? 0 : 13)};
  padding-bottom: ${props => (props.textInputCell ? 0 : 12)};
  background-color: ${props => props.theme.stylekitBackgroundColor};
  border-top-color: ${props =>
    props.first ? props.theme.stylekitBorderColor : undefined};
  border-top-width: ${props => (props.first ? 1 : undefined)};
  max-height: ${props => (props.textInputCell ? 50 : undefined)};
  height: ${props => props.height ?? undefined};
`;
