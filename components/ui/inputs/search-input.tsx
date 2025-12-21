import { useState, useRef, useEffect, startTransition } from 'react';
import { View, TextInput, TextInputProps, Pressable } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { ColorSchemeProvider, useColorScheme } from '@/hooks/use-color-scheme';

interface SearchInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  onQueryChange: (query: string) => void;
  debounceMs?: number;
  containerClassName?: string;
}

export function SearchInput({
  onQueryChange,
  debounceMs = 500,
  containerClassName,
  placeholder = 'Search',
  ...textInputProps
}: SearchInputProps) {
  const theme = useColorScheme();
  const placeholderTextColor = theme === 'light' ? Colors.light.textSecondary : Colors.dark.textSecondary;
  const [value, setValue] = useState('');
  const debounceHandleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef('');

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceHandleRef.current) {
        clearTimeout(debounceHandleRef.current);
      }
    };
  }, []);

  const handleChangeText = (text: string) => {
    setValue(text);
    if (debounceHandleRef.current) clearTimeout(debounceHandleRef.current);
    debounceHandleRef.current = setTimeout(() => {
      startTransition(() => onQueryChange(valueRef.current));
    }, debounceMs);
  };

  const handleClear = () => {
    setValue('');
    if (debounceHandleRef.current) clearTimeout(debounceHandleRef.current);
    startTransition(() => onQueryChange(''));
  };

  return (
    <View
      className={
        containerClassName ||
        'h-10 rounded-full border border-background-tertiary bg-background-secondary items-center px-3 flex-row'
      }
    >
      <TextInput
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        className="flex-1 text-white"
        inputMode="search"
        value={value}
        {...textInputProps}
      />
      {value.length > 0 ? (
        <Pressable onPress={handleClear} className="ml-2">
          <FontAwesome6 name="xmark" size={16} color="gray" />
        </Pressable>
      ) : (
        <View className="ml-2">
          <FontAwesome6 name="magnifying-glass" size={16} color="gray" />
        </View>
      )}
    </View>
  );
}
