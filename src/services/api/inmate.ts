// app/api/inmate.ts
import { InmateResponse } from '@/types/inmate';
import apiClient from './client';

export const inmateApi = {
  getInmateById: async (inmateId: string): Promise<InmateResponse> => {
    const response = await apiClient.get(`/inmate/${inmateId}`);
    return response.data;
  },
};
