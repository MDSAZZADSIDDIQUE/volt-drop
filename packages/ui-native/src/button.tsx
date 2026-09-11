import { Pressable, Text, type PressableProps } from 'react-native';

const VARIANTS = {
  primary: { container: 'bg-primary', label: 'text-primary-foreground' },
  secondary: { container: 'border border-border bg-background', label: 'text-foreground' },
} as const;

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  /** The label: shown on the button and read out as its accessible name. */
  children: string;
  variant?: keyof typeof VARIANTS;
  className?: string;
}

/**
 * The button for the Expo apps. Screen readers announce it as a button, named by its label, and
 * hear when it's disabled. The touch target is at least 44 points tall: an exact value, because
 * NativeWind's rem is 14, so `min-h-11` would be smaller.
 */
export function Button({
  children,
  variant = 'primary',
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const styles = VARIANTS[variant];
  const state = disabled === true ? 'opacity-50' : 'active:opacity-80';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      className={`min-h-[44px] items-center justify-center rounded-md px-4 ${styles.container} ${state} ${className}`}
      {...props}
    >
      <Text className={`text-base font-medium ${styles.label}`}>{children}</Text>
    </Pressable>
  );
}
