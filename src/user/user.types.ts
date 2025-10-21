export interface User {
  id: number;
  email: string;
  username: string;
  password?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
  googleId?: string | null;
  avatar?: string | null;
  provider?: string;
  createdAt: Date;
  updatedAt: Date;
}
