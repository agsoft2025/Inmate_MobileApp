// app/types/inmate.ts
export interface Inmate {
  _id: string;
  inmateId: string;
  firstName: string;
  lastName: string;
  custodyType: string;
  cellNumber: string;
  balance: number;
  dateOfBirth: string;
  admissionDate: string;
  crimeType: string;
  status: string;
  is_blocked: string;
  location_id: string;
  user_id: string;
  phonenumber: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface InmateResponse {
  success: boolean;
  data: Inmate[];
  message: string;
}