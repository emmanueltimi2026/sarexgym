export type UserRole = 'super_admin' | 'staff' | 'trainer' | 'member';

export type MembershipStatus = 'active' | 'pending' | 'scheduled' | 'expired' | 'suspended' | 'frozen' | 'Active' | 'Pending' | 'Scheduled' | 'Expiring' | 'Expired' | 'Inactive' | 'Frozen';

export type PaymentMethod = 'Paystack' | 'Cash' | 'Bank Transfer';

export type PaymentStatus = 'Successful' | 'Pending' | 'Failed';

export type AttendanceMethod = 'Manual' | 'Staff Manual' | 'Reception QR';

export type AttendanceStatus = 'Checked In' | 'Granted' | 'Denied';

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  activeMembers?: number;
  status?: 'active' | 'inactive';
  isActive?: boolean;
  features: string[];
  trainerAccess?: boolean;
  workoutPlanAccess?: boolean;
  registrationFee?: number;
}

export interface Member {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  address?: string;
  photo: string;
  emergencyContactName?: string;
  relationship?: string;
  emergencyContactPhone?: string;
  membershipPlanId: string;
  membershipPlanName: string;
  membershipStartDate: string;
  membershipExpiryDate: string;
  status: MembershipStatus;
  membershipStatus?: 'Active' | 'Pending' | 'Scheduled' | 'Expiring' | 'Expired' | 'Inactive' | 'Frozen';
  assignedTrainerId?: string;
  assignedTrainerName?: string;
  memberSince?: string;
  lastCheckIn?: string;
  fitnessGoal: string;
  fitnessGoalNotes?: string;
  amountPaid?: number;
  workoutPlanEnabled?: boolean;
  trainerAccess?: boolean;
  freezeActive?: boolean;
  registrationFeePaid?: boolean;
  nextSubscriptionId?: string;
  nextPlanId?: string;
  nextPlanName?: string;
  nextPlanStartDate?: string;
  nextPlanExpiryDate?: string;
  nextSubscriptionStatus?: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail?: string;
  memberPhone?: string;
  memberPhoto?: string;
  membershipPlan?: string;
  checkInTime?: string;
  checkOutTime?: string;
  duration?: string;
  method: AttendanceMethod | string;
  status: AttendanceStatus | string;
  date: string;
  time?: string;
  denialReason?: string;
}

export interface PaymentRecord {
  id: string;
  receiptNumber?: string;
  reference?: string;
  transactionReference?: string;
  memberId: string;
  memberName: string;
  planId: string;
  planName: string;
  kind?: 'Membership' | 'Event' | string;
  amount: number;
  currency?: string;
  method?: PaymentMethod;
  paymentMethod?: PaymentMethod;
  date: string;
  status: PaymentStatus;
  recordedBy?: string;
  notes?: string;
}

  export interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  bio: string;
    photo: string;
    password?: string;
  status?: 'active' | 'inactive';
  isActive?: boolean;
  dateJoined?: string;
  assignedMembersCount: number;
}

export interface StaffMember {
  id: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status?: 'active' | 'inactive';
  isActive?: boolean;
  dateJoined?: string;
  lastLogin?: string;
  photo: string;
  role?: 'Staff';
  roleTitle?: string;
  shift?: string;
}

export type StaffUser = StaffMember;

export interface ExerciseItem {
  id?: string;
  name: string;
  sets: number;
  reps: string;
  instructions?: string;
  restSeconds?: number;
  notes?: string;
}

export interface WorkoutDayRoutine {
  id?: string;
  dayName: string;
  focus: string;
  exercises: Array<{
    id?: string;
    name: string;
    sets: number;
    reps: string;
    restSeconds?: number;
    notes?: string;
  }>;
}

export interface WorkoutPlan {
  id: string;
  memberId?: string;
  memberIds?: string[];
  memberName?: string;
  title?: string;
  workoutName?: string;
  description: string;
  trainerId: string;
  trainerName: string;
  updatedDate?: string;
  status?: 'active' | 'completed';
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  daysPerWeek?: number;
  routine?: WorkoutDayRoutine[];
  exercises?: ExerciseItem[];
}

export interface MemberProgress {
  id: string;
  memberId: string;
  memberName: string;
  weightKg: number;
  bodyFatPercentage: number;
  trainerNotes: string;
  date: string;
  trainerId: string;
  trainerName: string;
}

export interface GymSettings {
  gymName: string;
  brandName: string;
  tagline?: string;
  address: string;
  phone: string;
  email: string;
  currency?: string;
  currencySymbol?: string;
  allowQrCheckIn?: boolean;
  allowManualCheckIn?: boolean;
  enableCheckOut?: boolean;
  duplicateCheckInPreventionMinutes?: number;
  adminName?: string;
  adminEmail?: string;
}
