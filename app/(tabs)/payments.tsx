import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useRazorpay } from '../../src/hooks/useRazorpay';
import AsyncStorage from '../../src/utils/storage';

export default function PaymentScreen() {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const { startPayment } = useRazorpay();

   useEffect(() => {
    const loadUsername = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('@authData');
        const { user } = JSON.parse(jsonValue || '{}');
        
        if (user?.username) {
          setUsername(user.username);
        }
      } catch (error) {
        console.log('Failed to load username', error);
      }
    };
    loadUsername();
  }, []);

  const handleSendPayment = async () => {
    if (!amount || !username) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
       const isSubscription = false; // Change this based on your payment type
      const ok = await startPayment(username, amountNum, isSubscription);
      
      if (ok) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Payment initiated successfully',
          position: 'bottom',
        });
        setAmount('');
      } else {
        throw new Error('Payment initialization failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Recipient's Username</Text>
        <TextInput
          style={styles.disabledInput}
          placeholder="Enter recipient's username"
          value={username || ''}
          // onChangeText={setRecipient}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
      </View>

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSendPayment}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Processing...' : 'Send Payment'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  disabledInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  button: {
    backgroundColor: '#40407a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#84c1ff',
  },
});

