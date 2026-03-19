// app/(tabs)/profile.tsx
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { inmateApi } from '../api/inmate';
import { useAuth } from '../contexts/AuthContext';
import { Inmate } from '@/types/inmate';

function ProfileContent() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [inmate, setInmate] = useState<Inmate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchInmateData = useCallback(async () => {
    
    if (user?.id) {
      setLoading(true);
      try {
        const response = await inmateApi.getInmateById(user.username);
        
        if (response.success && response.data.length > 0) {
          setInmate(response.data[0]);
        }
        setError(null);
      } catch (err) {
        setError('Failed to fetch inmate data');
      } finally {
        setLoading(false);
      }
    }
  }, [user?.id]);

  // Fetch data on initial render and when screen comes into focus
  useEffect(() => {
    fetchInmateData();
  }, [fetchInmateData]);

  // This will refetch data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchInmateData();
    }, [fetchInmateData])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!inmate) {
    return (
      <View style={styles.centered}>
        <Text>No inmate data found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.header}>Personal Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.nameValue}>{`${inmate.firstName} ${inmate.lastName}`}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Balance:</Text>
          <Text style={styles.balanceValue}>₹{inmate.balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Inmate ID:</Text>
          <Text style={styles.value}>{inmate.inmateId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Mobile No:</Text>
          <Text style={styles.value}>{inmate.phonenumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Date of Birth:</Text>
          <Text style={styles.value}>{new Date(inmate.dateOfBirth).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.header}>Custody Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Custody Type:</Text>
          <Text style={styles.value}>{inmate.custodyType}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Cell Number:</Text>
          <Text style={styles.value}>{inmate.cellNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Admission Date:</Text>
          <Text style={styles.value}>{new Date(inmate.admissionDate).toLocaleDateString()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Crime Type:</Text>
          <Text style={styles.value}>{inmate.crimeType}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, { color: inmate.status === 'active' ? 'green' : 'red' }]}>
            {inmate.status}
          </Text>
        </View>
      </View>

      {/* <View style={styles.buttonContainer}>
        <Text 
          style={styles.signOutButton}
          onPress={async () => {
            await signOut();
            router.replace('/sign-in');
          }}>
          Sign Out
        </Text>
      </View>     */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  signOutButton: {
    backgroundColor: '#ff4444',
    color: 'white',
    padding: 15,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  balanceValue:{
    fontSize: 20,
    fontWeight: '800',
    color: 'green',
    flex: 1,
    textAlign: 'right',
  },
  nameValue:{
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  }
});

export default function Profile() {
  return <ProfileContent />;
}
