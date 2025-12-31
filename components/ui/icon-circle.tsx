import React, { useContext } from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { ThemedText } from '../shared';

interface IconCircleProps {
  input: string;
  color?: string;
  size?: number;
  iconSize?: number;
  backgroundColor?: string;
  borderSize?: number;
  opacity?: 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;
  circle?: boolean;
}

enum InputType {
  Letter = 'letter',
  FaName = 'faName',
  Base64 = 'base64',
  Url = 'url',
  Emoji = 'emoji',
}

const IconCircle: React.FC<IconCircleProps> = ({
  input,
  color = 'white',
  size = 36,
  backgroundColor = 'bg-myColors-Colors-primary',
  iconSize = undefined,
  borderSize = 0,
  opacity = 100,
  circle = true,
}) => {
  if (!input) return null;

  let inputType = InputType.Letter;

  if (input.startsWith('http')) {
    inputType = InputType.Url;
  } else if (input.startsWith('data:image') || input.length > 20) {
    //If it's not a url and it's longer than 20 characters, it's a base64 image
    inputType = InputType.Base64;
  } else if (/\p{Emoji}/u.test(input)) {
    inputType = InputType.Emoji;
  } else if (input.length === 1) {
    inputType = InputType.Letter;
  } else {
    inputType = InputType.FaName;
  }

  let logoSize = iconSize ? iconSize : circle === false ? size / 1.5 : size / 1.8;

  if (inputType === InputType.Url || inputType === InputType.Base64) {
    logoSize = size * 1.1;
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderWidth: borderSize,
        },
      ]}
      className={`${backgroundColor} opacity-${opacity.toString()} items-center justify-center`}
    >
      {inputType === InputType.Emoji && (
        <Text style={{ fontSize: logoSize, lineHeight: logoSize * 1.55 }} className="my-auto mx-auto p-0 text-center">
          {input}
        </Text>
      )}
      {inputType === InputType.Letter && (
        <ThemedText
          type="defaultSemiBold"
          style={{ fontSize: logoSize, lineHeight: logoSize * 1.55 }}
          className="my-auto mx-auto p-0 text-center"
        >
          {input.toUpperCase()}
        </ThemedText>
      )}
      {inputType === InputType.FaName && <FontAwesome6 name={input} size={logoSize} color={color} />}
      {(inputType === InputType.Base64 || inputType === InputType.Url) && (
        <Image
          source={{
            uri: inputType === InputType.Base64 ? `data:image/png;base64,${input.replace(/"/g, '')}` : input,
          }}
          style={{ width: logoSize, height: logoSize }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderStyle: 'solid',
  },
});

export default IconCircle;
