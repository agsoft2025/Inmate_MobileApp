// src/hooks/useRazorpay.ts
import RazorpayCheckout from "react-native-razorpay";
import Toast from "react-native-toast-message";
import { createOrder, verifyPayment } from "../services/service/paymentService";

export const useRazorpay = () => {
  const startPayment = async (studentId: string, amount: number, subscription: boolean = false,selectedDuration?:string) => {
    try {
      console.log('Starting payment for student:', studentId, 'amount:', amount, 'subscription:', subscription);
      const order = await createOrder(studentId, amount, subscription,selectedDuration);
      console.log('Order created:', JSON.stringify(order, null, 2));

      const options = {
        description: 'Payment for services',
        image: 'https://your-logo-url.com/logo.png',
        currency: 'INR',
        key: subscription ? 'rzp_live_Rt5vLcnxGaTs8Y'  : 'rzp_test_qXH0h7SCch7OVM', // Replace with your test key
        amount: order.order.amount.toString(),
        name: 'Your App Name',
        order_id: order.order.id,
        prefill: {
          email: 'user@example.com',
          contact: '9191919191',
          name: 'User Name'
        },
        theme: { color: '#53a20e' }
      };

      console.log('Opening Razorpay checkout...');
      const data = await RazorpayCheckout.open(options);
      console.log('Razorpay response:', data);

      if (!data.razorpay_payment_id || !data.razorpay_order_id || !data.razorpay_signature) {
        throw new Error('Incomplete payment response from Razorpay');
      }

      console.log('Verifying payment...');
      try {
        const verification = await verifyPayment({
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
          subscription,
          inmateId: studentId,
          month: selectedDuration ? selectedDuration : ''
        });

        console.log('Payment verification result:', JSON.stringify(verification, null, 2));

        if (verification.success) {
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: subscription ? 'Subscription successful!' : 'Payment successful!',
            position: 'bottom',
            visibilityTime: 5000
          });
          return true;
        } else {
          throw new Error(verification.message || 'Payment verification failed');
        }
      } catch (verifyError: any) {
        console.log('Verification error:', {
          name: verifyError.name,
          message: verifyError.message,
          code: verifyError.code,
          response: verifyError.response?.data,
          stack: verifyError.stack
        });

        let errorMessage = verifyError.message || 'Payment verification failed';

        // Handle specific error cases
        if (verifyError.response?.status === 500) {
          errorMessage = 'Server error during payment verification. Please contact support.';
        } else if (verifyError.response?.data?.error) {
          errorMessage = verifyError.response.data.error;
        }

        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: errorMessage,
          position: 'bottom',
          visibilityTime: 5000
        });

        return false;
      }
    } catch (error: any) {
      console.log('Payment error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      let errorMessage = error.message || 'Payment failed. Please try again.';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
        position: 'bottom',
        visibilityTime: 5000
      });

      return false;
    }
  };

  return { startPayment };
};