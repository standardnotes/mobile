import React, { useMemo, useState } from 'react';
import { SideMenuCell } from './SideMenuCell';
import { CollapsedLabel, Header, Root, Title } from './SideMenuSection.styled';

export type SideMenuOption = {
  text: string;
  subtext?: string;
  textClass?: 'info' | 'danger' | 'warning';
  key?: string;
  iconDesc?: {
    type: string;
    side?: 'left' | 'right';
    name?: string;
    value?: string;
    backgroundColor?: string;
    borderColor?: string;
    size?: number;
  };
  dimmed?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onLongPress?: () => void;
};

type Props = {
  title: string;
  collapsed?: boolean;
  options?: SideMenuOption[];
};

export const SideMenuSection: React.FC<Props> = props => {
  const [collapsed, setCollapsed] = useState(Boolean(props.collapsed));
  const options = useMemo(() => {
    return props.options || [];
  }, [props.options]);
  const collapsedLabel =
    options.length > 0 ? options.length + ' Options' : 'Hidden';
  return (
    <Root>
      <Header collapsed={collapsed} onPress={() => setCollapsed(!collapsed)}>
        <>
          <Title>{props.title}</Title>
          {collapsed && <CollapsedLabel>{collapsedLabel}</CollapsedLabel>}
        </>
      </Header>

      {!collapsed && (
        <>
          {options.map(option => {
            return (
              <SideMenuCell
                text={option.text}
                textClass={option.textClass}
                subtext={option.subtext}
                key={option.text + option.subtext + option.key}
                iconDesc={option.iconDesc}
                dimmed={option.dimmed}
                selected={option.selected}
                onSelect={option.onSelect}
                onLongPress={option.onLongPress}
              />
            );
          })}
          {props.children}
        </>
      )}
    </Root>
  );
};
