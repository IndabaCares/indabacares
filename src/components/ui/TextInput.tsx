import React, { forwardRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <View className="mb-4">
        {label && (
          <Text className="mb-1.5 text-sm font-medium text-slate-700">{label}</Text>
        )}
        <RNTextInput
          ref={ref}
          className={`rounded-xl border bg-white px-4 py-3 text-base text-slate-900 ${
            error ? 'border-danger-500' : 'border-slate-200 focus:border-primary-500'
          } ${className || ''}`}
          placeholderTextColor="#94a3b8"
          {...props}
        />
        {error && (
          <Text className="mt-1 text-xs text-danger-500">{error}</Text>
        )}
        {hint && !error && (
          <Text className="mt-1 text-xs text-slate-400">{hint}</Text>
        )}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';
