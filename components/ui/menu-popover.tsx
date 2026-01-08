import React, { ReactNode, useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

interface MenuPopoverProps {
  readonly trigger: ReactNode;
  readonly children: ReactNode | ((actions: { close: () => void }) => ReactNode);
  readonly containerClassName?: string;
  readonly menuClassName?: string;
}

export function MenuPopover({ trigger, children, containerClassName, menuClassName }: MenuPopoverProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen(prev => !prev), []);

  const content =
    typeof children === 'function' ? (children as (actions: { close: () => void }) => ReactNode)({ close }) : children;

  return (
    <View className={`items-end relative ${containerClassName ?? ''}`}>
      <Pressable onPress={toggle}>{trigger}</Pressable>
      {open ? (
        <View
          className={`absolute top-10 right-0 min-w-44 bg-background-tertiary border-2 border-background-tertiary rounded-md shadow-lg z-50 ${
            menuClassName ?? ''
          }`}
        >
          {content}
        </View>
      ) : null}
    </View>
  );
}
