import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@/utils/storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Location {
  _id: string;
  name: string;
  location: string;
  baseUrl: string;
}

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

export default function SignInScreen() {
  const [step, setStep] = useState<'location' | 'login'>('location');
  const [query, setQuery] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordInputRef = useRef<TextInput>(null);
  const router = useRouter();
  const { signIn } = useAuth(); // Use the signIn method from the useAuth hook

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        searchLocations(query);
      } else {
        setLocations([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const searchLocations = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setLocations([]);
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const response = await axios.get(`${Constants.expoConfig?.extra?.globalurl}api/location?search=${searchQuery}`);

      if (response.data.status) {
        setLocations(response.data.data);
      } else {
        setError('Failed to fetch locations');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (location: Location) => {
    const normalizedLocation = {
      ...location,
      baseUrl: normalizeBaseUrl(location.baseUrl),
    };

    setSelectedLocation(location);
    setStep('login');
    AsyncStorage.setItem('@selectedLocation', JSON.stringify(normalizedLocation));
    api.defaults.baseURL = normalizedLocation.baseUrl;
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    if (!selectedLocation) {
      setError('Please select a facility first');
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    setError('');

    try {
      // Sign in and get user data
      await signIn(username, password);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message ||
        error.message ||
        'Login failed. Please check your credentials and try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderLocationStep = () => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Your Facility</Text>
          <Text style={styles.subtitle}>Choose your facility to continue</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for your facility..."
            value={query}
            onChangeText={setQuery}
            autoCapitalize="words"
            autoFocus
            placeholderTextColor="#999"
          />
          {isSearching && (
            <ActivityIndicator size="small" color="#4a6bff" style={styles.searchIndicator} />
          )}
        </View>

        <FlatList
          data={locations}
          keyExtractor={(item) => item._id}
          style={styles.locationsList}
          contentContainerStyle={styles.locationsListContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.locationItem}
              onPress={() => handleSelectLocation(item)}
              activeOpacity={0.7}
            >
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={20} color="#4a6bff" />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationName} numberOfLines={1} ellipsizeMode="tail">
                  {item.name}
                </Text>
                <Text style={styles.locationAddress} numberOfLines={1} ellipsizeMode="tail">
                  {item.location}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            query.length >= 2 && !isSearching ? (
              <View style={styles.emptyState}>
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="location" size={40} color="#ccc" />
                  <View />
                </View>
                <Text style={styles.emptyStateText}>No facilities found</Text>
                <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
              </View>
            ) : null
          }
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </TouchableWithoutFeedback>
  );

  const renderLoginStep = () => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setStep('location');
            setError('');
          }}
          disabled={isLoading}
        >
          <Ionicons name="arrow-back" size={24} color="#4a6bff" />
        </TouchableOpacity> */}

        <View style={styles.locationHeader}>
          <Text style={styles.selectedLocation} numberOfLines={1} ellipsizeMode="tail">
            {selectedLocation?.name}
          </Text>
          <Text style={styles.signInLocationAddress} numberOfLines={1} ellipsizeMode="tail">
            {selectedLocation?.location}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              returnKeyType="next"
              onSubmitEditing={() => {
                passwordInputRef.current?.focus();
              }}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              disabled={isLoading}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View>
            <TouchableOpacity
              style={[
                styles.loginButton,
                (!username || !password || isLoading) && styles.disabledButton
              ]}
              onPress={handleLogin}
              disabled={!username || !password || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.loginButtonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color="#40407a" style={styles.buttonIcon} />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => {
                setStep('location');
                setError('');
              }}
              disabled={isLoading}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="arrow-back" size={20} color="#40407a" style={styles.buttonIcon} />
                <Text style={styles.loginButtonText}>Back</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );

  return step === 'location' ? renderLocationStep() : renderLoginStep();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#40407a',
    justifyContent: 'center',
    // alignItems: 'center',
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: "center"
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#1a1a1a',
  },
  searchIndicator: {
    marginLeft: 12,
  },
  locationsList: {
    flex: 1,
  },
  locationsListContent: {
    paddingBottom: 20,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 107, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  locationTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  // strikeThrough: {
  //   position: 'absolute',
  //   height: 2,
  //   width: '100%',
  //   backgroundColor: '#ccc',
  //   top: '50%',
  //   left: 0,
  //   transform: [{ rotate: '-45deg' }],
  // },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#40407a',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#40407a',
  },
  signInLocationAddress: {
    fontSize: 14,
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  backButton: {
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  locationHeader: {
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  selectedLocation: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#1a1a1a',
  },
  loginButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4a6bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#40407a',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    marginTop: 16,
    alignSelf: 'center',
  },
  forgotPasswordText: {
    color: '#4a6bff',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 8,
  },
  eyeIcon: {
    padding: 10,
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8, // Space between text and icon
  },
  buttonIcon: {
    // Ensures the icon is properly aligned with the text
    marginTop: 2,
  }

});
