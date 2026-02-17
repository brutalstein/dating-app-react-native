import React, { ForwardedRef, forwardRef, memo, useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  secureToggle?: boolean;
}

function AuthInputComponent(
  { label, error, secureToggle = false, onFocus, onBlur, secureTextEntry, ...props }: AuthInputProps,
  ref: ForwardedRef<TextInput>
) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHidden, setIsHidden] = useState(secureToggle);

  useEffect(() => {
    if (!secureToggle) {
      setIsHidden(false);
    }
  }, [secureToggle]);

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus]
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      setIsFocused(false);
      onBlur?.(e);
    },
    [onBlur]
  );

  const toggleHidden = useCallback(() => {
    setIsHidden((prev) => !prev);
  }, []);

  return (
    <View className="mb-4">
      <Text className="text-zinc-200 text-sm font-semibold mb-2">{label}</Text>
      <View
        className={`h-14 rounded-xl px-4 flex-row items-center bg-zinc-900/90 border ${isFocused ? 'border-[#FF5A5F]' : 'border-zinc-600'}`}
        style={{
          shadowColor: isFocused ? '#FF5A5F' : 'transparent',
          shadowOpacity: isFocused ? 0.25 : 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: isFocused ? 3 : 0,
        }}
      >
        <TextInput
          ref={ref}
          {...props}
          className="flex-1 text-white text-base"
          placeholderTextColor="#8A8A8F"
          secureTextEntry={secureToggle ? isHidden : secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label}
        />

        {secureToggle && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isHidden ? 'Şifreyi göster' : 'Şifreyi gizle'}
            onPress={toggleHidden}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={isHidden ? 'eye' : 'eye-off'} size={20} color="#C8C8CC" />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text className="text-rose-400 text-xs mt-1">{error}</Text>}
    </View>
  );
}

export default memo(forwardRef(AuthInputComponent));
