export type Role = "crew" | "leader" | "supervisor";
export type Gender = "male" | "female";

export interface Outlet {
  id: string;
  name: string;
}

export interface Crew {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  outlet_id: string;
  role: Role;
  gender: Gender;
  is_active: boolean;
  bank_name: string | null;
  bank_account_number: string | null;
  address: string | null;
  date_of_birth: string | null;
  skck_url: string | null;
  auth_user_id?: string | null;
  join_date: string | null;      
  resign_date: string | null;    
  resign_reason: string | null; 
  outlets?: Outlet | null; 
  work_duration?: string;
}