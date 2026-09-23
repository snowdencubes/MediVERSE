export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  active_doctors_count: number;
  wait_time_minutes: number;
}

export interface Doctor {
  id: string;
  name: string;
  department_id: string;
  specialty: string;
  room_number: string;
  is_available: boolean;
  estimated_wait_minutes: number;
  consultation_fee: number;
  rating: number;
  experience_years: number;
  shift_schedule?: string;
}

export interface HealthComboPackage {
  id: string;
  title: string;
  category: string;
  description: string;
  included_tests: string[];
  price: number;
  priority_bump: number;
}

export interface VitalsInput {
  systolic_bp: number;
  diastolic_bp: number;
  heart_rate: number;
  temperature_c: number;
  pain_score: number;
  symptoms: string[];
}

export interface PatientRegistration {
  national_id: string;
  full_name: string;
  phone: string;
  age: number;
  gender: string;
  insurance_member: boolean;
  insurance_id?: string;
}

export interface TicketCreateRequest {
  department_id: string;
  doctor_id?: string;
  combo_package_ids: string[];
  vitals?: VitalsInput;
  patient: PatientRegistration;
  payment_method: string;
}

export interface QueueTicket {
  ticket_id: string;
  token_number: string;
  department_id: string;
  department_name: string;
  doctor_id?: string;
  doctor_name: string;
  room_number: string;
  patient_name: string;
  patient_phone?: string;
  status: 'WAITING' | 'NOW_CALLING' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED';
  priority_level: 'EMERGENCY' | 'URGENT' | 'STANDARD';
  triage_score: number;
  combos_selected: string[];
  total_fee: number;
  created_at: string;
  estimated_call_time: string;
  receipt_pdf_url?: string;
}

export interface QueueBoardResponse {
  now_calling: QueueTicket | null;
  recently_called: QueueTicket[];
  waiting_queue: QueueTicket[];
  completed_today: number;
  average_wait_minutes: number;
}
