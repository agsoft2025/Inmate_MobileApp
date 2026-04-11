import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from '../../src/contexts/AuthContext';


export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { signOut } = useAuth();

    const handleLogout = async () => {
        try {
            await signOut();
            router.replace('/(auth)/sign-in');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };
    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                tabBarShowLabel: true,
                tabBarActiveTintColor: "#fff",
                tabBarInactiveTintColor: "rgba(255, 255, 255, 0.4)",
                tabBarStyle: {
                    backgroundColor: "#40407a",
                    borderTopWidth: 0.5,
                    height: 60 + insets.bottom,
                    paddingBottom: insets.bottom,
                    paddingTop: 5,
                    borderTopColor: "rgba(255,255,255,0.2)",
                },
            }}
        >
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
                    headerStyle: { backgroundColor: "#40407a" },
                    headerTitleStyle: { color: "#fff" },
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => {
                                signOut();
                            }}
                            style={{ marginRight: 15 }}
                        >
                            <Ionicons name="log-out-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    ),
                }}
            />
            <Tabs.Screen
                name="transactions"
                options={{
                    title: 'Transactions',
                    tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
                    headerStyle: { backgroundColor: "#40407a" },
                    headerTitleStyle: { color: "#fff" },
                }}
            />
            <Tabs.Screen
                name="payments"
                options={{
                    title: 'Payments',
                    tabBarIcon: ({ color }) => <Ionicons name="card" size={24} color={color} />,
                    headerStyle: { backgroundColor: "#40407a" },
                    headerTitleStyle: { color: "#fff" },
                }}
            />
        </Tabs>
    );
}
