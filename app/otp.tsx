// app/(auth)/otp.tsx
import axios from 'axios';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import AsyncStorage from '../src/utils/storage';

const joinUrl = (base: string, path: string) =>
    `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

const getAuthEndpointCandidates = (baseUrl: string, path: string) => {
    const normalized = baseUrl.replace(/\/+$/, '');
    const withoutApi = normalized.replace(/\/api$/i, '');
    const urls = [joinUrl(withoutApi, path)];
    return urls;
};

export default function OTPScreen() {
    const [otp, setOtp] = useState<string[]>(['', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const auth = useAuth();
    const inputs = useRef<TextInput[]>([]);

    if (!auth) {
        // This should never happen if your app is properly wrapped in AuthProvider
        return null;
    }

    const { user, setState } = auth;

    const handleVerify = async () => {
        let otpString = '';
        let usernameFromStorage = '';
        let baseUrl = '';

        try {
            setIsLoading(true);
            otpString = otp.join('');
            if (otpString.length !== 4) {
                Alert.alert('Error', 'Please enter a valid 4-digit OTP');
                return;
            }

            const location = await AsyncStorage.getItem('@selectedLocation');
            usernameFromStorage = await AsyncStorage.getItem('@username') || '';

            if (!location) {
                throw new Error('No location selected');
            }

            baseUrl = JSON.parse(location).baseUrl;
            const requestData = {
                username: usernameFromStorage,
                otp: otpString
            };

            const endpointCandidates = getAuthEndpointCandidates(baseUrl, 'user/login/verify');
            let data: any = null;
            let resolved = false;
            let requestError: unknown = null;

            for (const endpoint of endpointCandidates) {
                try {
                    const response = await axios.post(
                        endpoint,
                        requestData,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                ...(user?.token && { 'Authorization': `Bearer ${user.token}` }),
                            },
                            validateStatus: () => true // This will prevent axios from throwing on HTTP error status
                        }
                    );
                    if (response.status === 404) {
                        continue;
                    }
                    data = response.data;
                    resolved = true;
                    if (response.status !== 404) {
                        break;
                    }
                } catch (error) {
                    requestError = error;
                    throw error;
                }
            }

            if (!resolved) {
                throw requestError || new Error('OTP verification endpoint not found');
            }

            if (data.status) {
                // Create updated user with the new token and verification status
                const updatedUser = {
                    ...data.user,
                    token: data.token,
                    isVerified: true,
                    subscription: data.user?.subscription || false
                };

                // Update auth data in AsyncStorage
                const updatedAuthData = {
                    isLoggedIn: true,
                    isVerified: true,
                    user: updatedUser
                };

                await AsyncStorage.setItem('@authData', JSON.stringify(updatedAuthData));

                // Update the auth context
                setState({
                    isLoggedIn: true,
                    user: updatedUser as any,
                    isLoading: false
                });

                // Check subscription status and navigate accordingly
                if (data.user?.subscription === false) {
                    router.replace('/subscription');
                } else {
                    // Navigate to the main app
                    router.replace('/(tabs)/profile');
                }
            } else {
                throw new Error(data.message || 'Authentication data not found');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to verify OTP';
            Alert.alert('Error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (text: string, index: number) => {
        // Update OTP value
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Auto move to next input
        if (text && index < 3) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Verify OTP' }} />
            <View style={{ backgroundColor: '#fff', paddingVertical: 40, paddingHorizontal: 20, borderRadius: 10 }} >
                <Text>Enter OTP sent to your mobile number</Text>
                <View style={{ flexDirection: 'row', marginVertical: 20 }}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => {
                                if (ref) inputs.current[index] = ref;
                            }}
                            style={styles.otpInput}
                            value={digit}
                            onChangeText={(text) => handleChange(text.replace(/[^0-9]/g, ""), index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                        />
                    ))}
                </View>
                <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={handleVerify}
                >
                    <Text style={styles.verifyButtonText}>Verify OTP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.verifyBackButton}
                    onPress={async () => {
                        try {
                            await auth.signOut();
                            router.replace('/(auth)/sign-in');
                        } catch (error) {
                            router.replace('/(auth)/sign-in');
                        }
                    }}
                >
                    <Text style={styles.verifyBackButtonText}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center', // vertical center
        alignItems: 'center',
        backgroundColor: '#40407a'
    },
    otpInput: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        width: 60,
        height: 55,
        textAlign: "center" as const,
        fontSize: 22,
        marginRight: 10
    },
    verifyButton: {
        backgroundColor: '#40407a',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 16,
        alignSelf: 'center', // ✅ centers the button itself
    },
    verifyButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    verifyBackButton:{
         paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 16,
        alignSelf: 'center',
        borderColor: '#40407a',
        borderWidth: 1,
        backgroundColor: 'white',
        color: '#40407a',
    },
    verifyBackButtonText: {
        color: '#40407a',
        fontSize: 16,
        fontWeight: '600',
    },
});

