export interface User {
  id: number;
  email: string;
  password?: string | null;
  fullName?: string | null;
  residentPlace?: string | null;
  isActive: boolean;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
  googleId?: string | null;
  avatar?: string | null;
  provider?: string;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
}
