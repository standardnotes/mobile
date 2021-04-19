import { Icon, IconType } from '@Components/Icon';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import React, {
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Dimensions, LayoutChangeEvent, Platform, View } from 'react-native';
import styled, { css } from 'styled-components/native';

export type BottomSheetActionType = {
  text: string;
  key: string;
  iconType?: IconType;
  callback?: () => void;
  danger?: boolean;
  centered?: boolean;
  description?: string;
  dismissSheetOnPress?: boolean;
};

export type BottomSheetSectionType = {
  key: string;
  actions: BottomSheetActionType[];
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
`;

const ActionItemMainInfo = styled.View`
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

const ActionIcon = styled(Icon).attrs(({ theme }) => ({
  color: theme.stylekitNeutralColor,
}))`
  text-align: center;
`;

const ActionText = styled.Text<{ danger?: boolean; centered?: boolean }>`
  color: ${({ theme, danger }) =>
    danger ? theme.stylekitDangerColor : theme.stylekitForegroundColor};
  font-size: 16px;
  width: 100%;
  margin-right: ${({ centered }) => (centered ? 0 : '16px')};
  text-align: ${({ centered }) => (centered ? 'center' : 'left')};
`;

const ActionDescription = styled.Text`
  color: ${({ theme }) => theme.stylekitNeutralColor};
  font-size: 14px;
  margin-top: 2px;
  margin-left: 40px;
`;

const HandleComponent: React.FC = () => (
  <HandleContainer>
    <Handle />
  </HandleContainer>
);

const ActionItem: React.FC<{
  action: BottomSheetActionType;
  onActionPress?: () => void;
}> = ({ action, onActionPress }) => {
  const onPress = () => {
    if (action.callback) {
      action.callback();
    }
    if (onActionPress) {
      onActionPress();
    }
  };

  return (
    <ActionItemContainer onPress={onPress}>
      <ActionItemMainInfo>
        {action.centered ? null : (
          <ActionIconContainer>
            {action.iconType ? (
              <ActionIcon type={action.iconType} size={24} />
            ) : null}
          </ActionIconContainer>
        )}
        <ActionText danger={action.danger} centered={action.centered}>
          {action.text}
        </ActionText>
      </ActionItemMainInfo>
      {action.description && (
        <ActionDescription>{action.description}</ActionDescription>
      )}
    </ActionItemContainer>
  );
};

const Section: React.FC<{
  section: BottomSheetSectionType;
  first: boolean;
  dismissBottomSheet: () => void;
}> = ({ section, first, dismissBottomSheet }) => (
  <View key={section.key}>
    <SectionSeparator first={first} />
    {section.actions.map(action => (
      <ActionItem
        key={action.key}
        action={action}
        onActionPress={
          action.dismissSheetOnPress ? dismissBottomSheet : undefined
        }
      />
    ))}
  </View>
);

export const BottomSheet: React.FC<Props> = ({
  visible,
  onDismiss,
  sections,
  title,
}) => {
  const ref = useRef<BottomSheetModal>(null);
  const [titleHeight, setTitleHeight] = useState(0);
  const [listHeight, setListHeight] = useState(0);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    }
  }, [visible]);

  useEffect(() => {
    if (!title) {
      setTitleHeight(0);
    }
  }, [title]);

  const onTitleLayout = (e: LayoutChangeEvent) => {
    setTitleHeight(e.nativeEvent.layout.height);
  };

  const onListLayout = (e: LayoutChangeEvent) => {
    setListHeight(e.nativeEvent.layout.height);
  };

  const contentHeight = useMemo(() => titleHeight + listHeight, [
    titleHeight,
    listHeight,
  ]);

  const snapPoints = useMemo(() => {
    const screenHeight = Dimensions.get('window').height;
    const maxLimit = 0.85 * screenHeight;
    return contentHeight < maxLimit ? [contentHeight] : [maxLimit];
  }, [contentHeight]);

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
          <TitleContainer onLayout={onTitleLayout}>
            <Title>{title}</Title>
          </TitleContainer>
        ) : null}
        <BottomSheetScrollView>
          <View onLayout={onListLayout}>
            {sections.map((section, index) => (
              <Section
                section={section}
                first={index === 0}
                dismissBottomSheet={() => ref.current?.dismiss()}
              />
            ))}
          </View>
        </BottomSheetScrollView>
      </>
    </BottomSheetModal>
  );
};

export const useBottomSheet = () => {
  const [bottomSheetSections, setBottomSheetSections] = useState<
    BottomSheetSectionType[]
  >([]);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [bottomSheetTitle, setBottomSheetTitle] = useState('');

  const presentBottomSheet = (title: string) => {
    setBottomSheetTitle(title);
    setBottomSheetVisible(true);
  };

  const dismissBottomSheet = () => {
    setBottomSheetVisible(false);
  };

  return [
    bottomSheetTitle,
    bottomSheetSections,
    bottomSheetVisible,
    setBottomSheetSections,
    presentBottomSheet,
    dismissBottomSheet,
  ] as [
    string,
    BottomSheetSectionType[],
    boolean,
    React.Dispatch<SetStateAction<BottomSheetSectionType[]>>,
    (title: string) => void,
    () => void
  ];
};
