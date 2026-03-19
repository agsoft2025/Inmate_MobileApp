// app/subscription.tsx
import AsyncStorage from "@/utils/storage";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useAuth } from "./contexts/AuthContext"; // Import the useAuth hook
import { useRazorpay } from "./hooks/useRazorpay";

export default function SubscriptionScreen() {
  const router = useRouter();
  const { signIn } = useAuth(); // Use the signIn function from the useAuth hook
  const { startPayment } = useRazorpay();
  const [loading, setLoading] = useState(false);
  const [subscriptionAmount, setSubscriptionAmount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState<'1' | '3' | '6' | '12'>('1');
  const auth = useAuth();

  useEffect(() => {
    const loadSubscriptionAmount = async () => {
      try {
        // const amount = await SecureStore.getItemAsync("subscriptionAmount") || "100";
        const location = await AsyncStorage.getItem('@selectedLocation');
        const { subscription_amount } = JSON.parse(location || '{}');

        setSubscriptionAmount(subscription_amount ? parseInt(subscription_amount, 10) : null);
      } catch (err) {
        console.error('Error loading subscription amount:', err);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load subscription amount",
          position: "bottom",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadSubscriptionAmount();
  }, []);

  const handleSubscribe = async () => {
    if (!subscriptionAmount) return;

    setLoading(true);
    try {
      const jsonValue = await AsyncStorage.getItem('@authData');
      const { user } = JSON.parse(jsonValue || '{}');
      const studentId = user?.username;

      if (!studentId) {
        throw new Error('Student ID not found');
      }

      const ok = await startPayment(studentId, Number(subscriptionAmount), true, selectedDuration);

      if (ok) {
        // Pass the username to updateSubscriptionStatus
        await updateSubscriptionStatus(studentId);
      } else {
        Toast.show({
          type: "error",
          text1: "Payment Failed",
          text2: "There was an issue with your payment. Please try again.",
          position: "bottom",
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "An error occurred during payment. Please try again.",
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionStatus = async (username: string) => {
    try {
      // First, try to sign in with the username (as both username and password)
      const user = await signIn(username, username);

      if (user) {
        // Store the necessary user data
        await SecureStore.setItemAsync("username", username);
        const studentId = user.id;
        if (studentId) {
          await SecureStore.setItemAsync("studentId", studentId);
        }

        // Check if subscription is active in the response
        if (user.subscription) {
          // Navigate to OTP screen
          router.replace("/otp");
        } else {
          // If subscription is not active, check again after a short delay
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          const retryUser = await signIn(username, username);

          if (retryUser?.subscription) {
            router.replace("/otp");
          } else {
            throw new Error('Subscription not activated yet. Please try again in a moment.');
          }
        }
      } else {
        throw new Error('Failed to sign in after subscription');
      }
    } catch (error: any) {
      console.error('Subscription update error:', error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to verify subscription status. Please check your account or contact support.",
        position: "bottom",
      });
    }
  };

  const getDurationLabel = (duration: string) => {
    switch (duration) {
      case '1m': return 'Month';
      case '3m': return '3 Months';
      case '6m': return '6 Months';
      case '1y': return 'Year';
      default: return 'Year';
    }
  };

  const updateSubscriptionAmount = async (duration: string) => {
    // Get the base monthly amount from the location data
    const location = JSON.parse(await AsyncStorage.getItem('@selectedLocation') || '{}');
    const monthlyAmount = location?.subscription_amount ? parseInt(location.subscription_amount, 10) : 0;

    // Calculate prices based on duration
    const prices: Record<string, number> = {
      '1': monthlyAmount,                    // 1 month
      '3': Math.round(monthlyAmount * 3),  // 5% discount for 3 months
      '6': Math.round(monthlyAmount * 6),  // 10% discount for 6 months
      '12': Math.round(monthlyAmount * 12)  // 15% discount for 1 year
    };

    setSubscriptionAmount(prices[duration] || monthlyAmount);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#40407a" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.popup}>
        <Text style={styles.title}>Subscribe to Premium</Text>
        <Text style={styles.subtitle}>
          Get access to all premium features and content
        </Text>

        <View style={styles.durationContainer}>
          {[
            { value: '1', label: '1 Month' },
            { value: '3', label: '3 Months' },
            { value: '6', label: '6 Months' },
            { value: '12', label: '1 Year' }
          ].map((duration) => (
            <TouchableOpacity
              key={duration.value}
              style={[
                styles.durationButton,
                selectedDuration === duration.value && styles.selectedDurationButton
              ]}
              onPress={() => {
                setSelectedDuration(duration.value as any);
                // You can update the subscription amount here based on the selected duration
                updateSubscriptionAmount(duration.value);
              }}
            >
              <Text style={[
                styles.durationButtonText,
                selectedDuration === duration.value && styles.selectedDurationButtonText
              ]}>
                {duration.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.priceBox}>
          <Text style={subscriptionAmount ? styles.priceText : styles.priceTextInactive}>
            ₹{subscriptionAmount || '--'} / {getDurationLabel(selectedDuration)}
          </Text>
        </View>

        <View style={styles.features}>
          <Text style={styles.feature}>✓ Access to all content</Text>
          <Text style={styles.feature}>✓ Ad-free experience</Text>
          <Text style={styles.feature}>✓ Priority support</Text>
          <Text style={styles.feature}>✓ Regular updates</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, (loading || !subscriptionAmount) && styles.buttonDisabled]}
          onPress={handleSubscribe}
          disabled={loading || !subscriptionAmount}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Subscribe Now</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.laterButton}
          onPress={async () => {
            try {
              await auth.signOut();
              router.replace('/(auth)/sign-in');
            } catch (error) {
              router.replace('/(auth)/sign-in');
            }
          }}
        >
          <Text style={styles.laterButtonText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingContainer: {
    backgroundColor: "#fff",
  },
  popup: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#40407a",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
  },
  priceBox: {
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#e0e5ff",
  },
  priceText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#40407a",
    textAlign: "center",
  },
  priceTextInactive: {
    fontSize: 22,
    fontWeight: "700",
    color: "#aaa",
    textAlign: "center",
  },
  features: {
    alignSelf: "stretch",
    marginBottom: 30,
  },
  feature: {
    fontSize: 16,
    color: "#444",
    marginBottom: 12,
    paddingLeft: 8,
  },
  button: {
    backgroundColor: "#40407a",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#40407a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  laterButton: {
    padding: 10,
  },
  laterButtonText: {
    color: "#666",
    fontSize: 15,
    textDecorationLine: "underline",
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    width: '100%',
    flexWrap: 'wrap',
  },
  durationButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    margin: 5,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedDurationButton: {
    backgroundColor: '#40407a',
    borderColor: '#40407a',
  },
  durationButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  selectedDurationButtonText: {
    color: '#fff',
  },
});
