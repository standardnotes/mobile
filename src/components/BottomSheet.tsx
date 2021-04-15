import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetSectionList,
} from '@gorhom/bottom-sheet';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
  Platform,
  SectionListRenderItem,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import styled, { css } from 'styled-components/native';

export type BottomSheetActionType = {
  text: string;
  key: string;
  iconName?: string;
  callback?: () => void;
  danger?: boolean;
  centered?: boolean;
};

export type BottomSheetSectionType = {
  data: BottomSheetActionType[];
  first?: boolean;
};

type Props = {
  visible: boolean;
  onDismiss: () => void;
  sections: BottomSheetSectionType[];
  title?: string;
};

const HandleContainer = styled.View`
  background-color: transparent;
  display: flex;
  align-items: center;
  border-radius: 0;
  margin-top: -13px;
`;

const Handle = styled.View`
  background-color: #bbbec4;
  height: 5px;
  width: 44px;
  border-radius: 100px;
`;

const TitleContainer = styled.View`
  padding: 20px;
  border-bottom-width: 1px;
  border-color: ${({ theme }) => theme.stylekitBorderColor};
`;

const Title = styled.Text`
  font-weight: ${Platform.OS === 'ios' ? 600 : 'bold'};
  font-size: 16px;
  color: ${({ theme }) => theme.stylekitForegroundColor};
`;

const SectionSeparator = styled.View<{ first?: boolean }>`
  ${({ first }) =>
    first
      ? css`
          margin-bottom: 8px;
        `
      : css`
          height: 1px;
          background-color: ${({ theme }) => theme.stylekitBorderColor};
          margin: 8px 0 8px 56px;
        `};
`;

const ActionItemContainer = styled.TouchableOpacity`
  padding: 10px 16px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const ActionIconContainer = styled.View`
  height: 24px;
  width: 24px;
  display: flex;
  margin-right: 16px;
  justify-content: center;
`;

const ActionText = styled.Text<{ danger?: boolean; centered?: boolean }>`
  color: ${({ theme, danger }) =>
    danger ? theme.stylekitDangerColor : theme.stylekitForegroundColor};
  font-size: 16px;
  width: 100%;
  margin-right: ${({ centered }) => (centered ? 0 : '16px')};
  text-align: ${({ centered }) => (centered ? 'center' : 'left')};
`;

const ActionIcon = styled(Icon)`
  text-align: center;
`;

const HandleComponent: React.FC = () => (
  <HandleContainer>
    <Handle />
  </HandleContainer>
);

const ActionItem: React.FC<{
  action: BottomSheetActionType;
  onActionPress: () => void;
}> = ({ action, onActionPress }) => {
  const onPress = () => {
    if (action.callback) {
      action.callback();
    }
    onActionPress();
  };

  return (
    <ActionItemContainer onPress={onPress}>
      <>
        {action.centered ? null : (
          <ActionIconContainer>
            {action.iconName ? (
              <ActionIcon name={action.iconName} size={24} color={'#72767E'} />
            ) : null}
          </ActionIconContainer>
        )}
        <ActionText danger={action.danger} centered={action.centered}>
          {action.text}
        </ActionText>
      </>
    </ActionItemContainer>
  );
};

export const BottomSheet: React.FC<Props> = ({
  visible,
  onDismiss,
  sections,
  title,
}) => {
  const ref = useRef<BottomSheetModal>(null);
  const [actionListHeight, setActionListHeight] = useState(0);
  const [titleContainerHeight, setTitleContainerHeight] = useState(0);
  const [shouldUpdateSnapPoints, setShouldUpdateSnapPoints] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldUpdateSnapPoints(true);
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const renderActionItem: SectionListRenderItem<BottomSheetActionType> = ({
    item,
  }) => (
    <ActionItem action={item} onActionPress={() => ref.current?.dismiss()} />
  );

  const onTitleContainerLayout = (e: LayoutChangeEvent) => {
    setTitleContainerHeight(e.nativeEvent.layout.height);
  };

  const onActionListLayout = (e: LayoutChangeEvent) => {
    if (shouldUpdateSnapPoints) {
      setActionListHeight(e.nativeEvent.layout.height);
      setShouldUpdateSnapPoints(false);
    }
  };

  const snapPoints = useMemo(() => {
    const contentHeight = actionListHeight + titleContainerHeight;
    const screenHeight = Dimensions.get('window').height;
    const predefinedPercentages = [0.3, 0.5, 0.7, 0.9];
    const proportionalHeights = predefinedPercentages.map(
      percentage => percentage * screenHeight
    );
    const points = proportionalHeights.filter(height => height < contentHeight);
    points.push(contentHeight);
    return points;
  }, [actionListHeight, titleContainerHeight]);

  const sectionListStyle = { flexGrow: 0 };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      handleComponent={HandleComponent}
      backdropComponent={BottomSheetBackdrop}
      onDismiss={onDismiss}
    >
      <>
        {title ? (
          <TitleContainer onLayout={onTitleContainerLayout}>
            <Title>{title}</Title>
          </TitleContainer>
        ) : null}
        <BottomSheetSectionList
          style={sectionListStyle}
          sections={sections.map((section, index) => ({
            ...section,
            first: index === 0,
          }))}
          keyExtractor={action => action.key}
          renderItem={renderActionItem}
          renderSectionHeader={({ section }) => (
            <SectionSeparator first={section.first} />
          )}
          onLayout={onActionListLayout}
        />
      </>
    </BottomSheetModal>
  );
};

export const useBottomSheet = () => {
  const [bottomSheetSections, setBottomSheetSections] = useState<
    BottomSheetSectionType[]
  >([]);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);

  return [
    bottomSheetSections,
    setBottomSheetSections,
    bottomSheetVisible,
    setBottomSheetVisible,
  ] as [
    BottomSheetSectionType[],
    (sections: BottomSheetSectionType[]) => void,
    boolean,
    (visible: boolean) => void
  ];
};
