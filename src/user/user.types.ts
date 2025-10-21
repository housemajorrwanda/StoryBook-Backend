export interface User {
  id: number;
  email: string;
  username: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
