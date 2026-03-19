// app/components/ProtectedRoute.tsx
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (!auth) {
    // This should never happen if your app is properly wrapped in AuthProvider
    return null;
  }

  const { isLoggedIn } = auth;
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simulate checking auth state
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <Redirect href="/sign-in" />;
  }

  return <>{children}</>;
}