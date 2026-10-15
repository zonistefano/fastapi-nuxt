import type { CustomUserRead } from "~/api/generated"
export const user: CustomUserRead = {
  id: "user-1",
  email: "a@example.com",
  email_validated: true,
  is_active: true,
  is_superuser: false,
  full_name: "Ada",
  hashed_password: true,
  totp: false,
  created: "2026-01-01T00:00:00Z",
  modified: "2026-01-01T00:00:00Z",
  language: "en",
  role: "user",
}
