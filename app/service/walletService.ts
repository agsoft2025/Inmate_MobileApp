import apiClient from "../api/client";

export const depositWallet = async (username: string, amount: number) => {
  try {
    const response = await apiClient.post(`payment/create`, {
      inmateId:username,
      amount
    });
    console.log('Deposit response:', response.data);
    return response.data;
  } catch (error) {
    console.log('Error depositing wallet:', error);
    throw error;
  }
};