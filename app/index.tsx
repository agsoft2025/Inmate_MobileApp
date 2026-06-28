// app/index.tsx
import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function Index() {
  const { isLoggedIn } = useAuth();
  
  if (isLoggedIn) {
    return <Redirect href="/(tabs)/profile" />;
  }
  
  return <Redirect href="/sign-in" />;
}