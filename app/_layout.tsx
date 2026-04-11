// app/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthAwareLayout />
    </AuthProvider>
  );
}

function AuthAwareLayout() {
  const { isLoggedIn } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false }}
        redirect={!isLoggedIn}
      />
      <Stack.Screen
        name="(auth)"
        options={{ headerShown: false }}
        redirect={isLoggedIn}
      />
      <Stack.Screen 
        name="otp" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="subscription" 
        options={{ headerShown: false }}
      />
      <Stack.Screen name="index" redirect={isLoggedIn} />
    </Stack>
  );
}
