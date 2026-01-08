import React from 'react';
import { View, type ViewProps } from 'react-native';
import { ThemedText } from '@/components/shared';
import { InputHeader } from './input-header';
import { BaseInputProps } from './types';

interface InputContainerProps extends Omit<ViewProps, 'children'> {
  readonly children: React.ReactNode;
  readonly error?: string;
  readonly noBorder?: boolean;
  readonly className?: string;
}

export const InputContainer = React.forwardRef<View, InputContainerProps>(
  ({ children, error, noBorder = false, className = 'min-h-14 h-auto overflow-hidden flex pt-2 pb-1', ...rest }, ref) => {
    const borderClassName = noBorder ? 'border-none' : 'border-b-2 border-background-tertiary';

    return (
      <View ref={ref} className={`${className} ${borderClassName}`} {...rest}>
        {children}
        {error && <ThemedText className="text-error text-xs mt-1">{error}</ThemedText>}
      </View>
    );
  }
);

InputContainer.displayName = 'InputContainer';

interface InputRowProps extends BaseInputProps {
  readonly children: React.ReactNode;
  readonly disabled?: boolean;
  readonly error?: string;
  readonly infoText?: string;
  readonly required?: boolean;
  readonly noBorder?: boolean;
  readonly className?: string;
  readonly rowClassName?: string;
  readonly rightClassName?: string;
  readonly footer?: React.ReactNode;
}

export function InputRow({
  icon,
  label,
  iconAlign,
  disabled = false,
  error,
  infoText,
  required = false,
  noBorder = false,
  className = 'h-14 py-2',
  rowClassName = 'flex-row items-center',
  rightClassName = 'ml-auto',
  footer,
  children,
}: InputRowProps) {
  return (
    <InputContainer className={className} error={error} noBorder={noBorder}>
      <View className={rowClassName}>
        <InputHeader
          icon={icon}
          label={label}
          iconAlign={iconAlign}
          infoText={infoText}
          disabled={disabled}
          required={required}
        />
        <View className={rightClassName}>{children}</View>
      </View>
      {footer}
    </InputContainer>
  );
}
