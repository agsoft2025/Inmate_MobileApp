// src/services/paymentService.ts
import AsyncStorage from "@/utils/storage";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Toast from "react-native-toast-message";

// Helper function to get base URL
const getBaseUrl = async () => {
  const location = await AsyncStorage.getItem('@selectedLocation');
  if (location) {
    const { baseUrl } = JSON.parse(location);
    return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  }
  return "http://localhost:3000/api/";
};

// Create Axios instance with dynamic baseURL
let API: any = null;

// Initialize API with base URL
const initializeAPI = async () => {
  const baseURL = await getBaseUrl();
  console.log("Initializing API with baseURL:", baseURL);
  
  API = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add auth token interceptor
  API.interceptors.request.use(async (config: any) => {
    const token = await SecureStore.getItemAsync("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return API;
};

// Get or initialize API instance
const getAPI = async () => {
  if (!API) {
    return await initializeAPI();
  }
  return API;
};

export const createOrder = async (studentId: string, amount: number, subscription: boolean = false,selectedDuration?:string) => {
  try {
    const api = await getAPI();
    const endpoint = subscription ? "payment/subscribe/create" : "payment/create";
    
    console.log("Creating order with:", { studentId, amount, subscription });
    
    const { data } = await api.post(endpoint, { 
      inmateId:studentId, 
      amount,
      month:selectedDuration ? selectedDuration : '',
      // Add any additional required fields here
    });
    
    return data;
  } catch (e: any) {
    const errorMessage = e.response?.data?.message || "Failed to create order";
    console.log("Error in createOrder:", {
      message: e.message,
      response: e.response?.data,
      code: e.code,
    });
    
    Toast.show({ 
      type: "error", 
      text1: "Error", 
      text2: errorMessage 
    });
    throw e;
  }
};

export const verifyPayment = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  subscription: boolean;
  inmateId?: string;
  month?: string;
}) => {
  const api = await getAPI();
  const endpoint = payload.subscription ? "payment/subscribe/verify" : "payment/verify";
  const inmateId = payload.inmateId || await SecureStore.getItemAsync("inmateId");
  
  if (!inmateId) {
    throw new Error("Inmate ID not found");
  }

  const requestPayload = {
    razorpay_order_id: payload.razorpay_order_id,
    razorpay_payment_id: payload.razorpay_payment_id,
    razorpay_signature: payload.razorpay_signature,
    inmateId,
    month:payload.month
  };

  console.log('Sending verification request to:', `${api.defaults.baseURL}${endpoint}`);
  console.log('Request payload:', JSON.stringify(requestPayload, null, 2));

  try {
    const response = await api.post(endpoint, requestPayload, {
      timeout: 30000,
      validateStatus: (status: number) => true // Don't throw on any status code
    });

    console.log('Verification response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });

    if (response.status >= 200 && response.status < 300) {
      return response.data;
    } else {
      const errorMessage = response.data?.message || 
                          response.data?.error?.message || 
                          `Server responded with status ${response.status}`;
      
      console.log('Verification failed:', {
        status: response.status,
        message: errorMessage,
        responseData: response.data
      });

      throw new Error(errorMessage);
    }
  } catch (e: any) {
    console.log('Verification request failed:', {
      name: e.name,
      message: e.message,
      code: e.code,
      config: {
        url: e.config?.url,
        method: e.config?.method,
        data: e.config?.data,
        headers: e.config?.headers
      },
      response: {
        status: e.response?.status,
        statusText: e.response?.statusText,
        data: e.response?.data,
        headers: e.response?.headers
      },
      stack: e.stack
    });

    let errorMessage = "Payment verification failed";
    
    if (e.response?.data?.message) {
      errorMessage = e.response.data.message;
    } else if (e.response?.data?.error) {
      errorMessage = typeof e.response.data.error === 'string' 
        ? e.response.data.error 
        : JSON.stringify(e.response.data.error);
    } else if (e.message) {
      errorMessage = e.message;
    }

    const error = new Error(errorMessage);
    (error as any).response = e.response;
    throw error;
  }
};
