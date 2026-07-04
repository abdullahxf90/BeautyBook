export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiRequestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, ...init } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiRequestError(res.status, (data as { error?: string }).error || "Request failed");
  }
  return data as T;
}

/** Server-side fetch that returns null instead of throwing (for graceful fallbacks). */
export async function apiTry<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---- Shared types (mirror the API responses) ----
export interface SalonSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  premium: boolean;
  featured: boolean;
  trending: boolean;
  verified: boolean;
  homeService: boolean;
  tag: string | null;
  area: { name: string; city: { name: string } };
  images?: { url: string; alt: string }[];
}

export interface ServiceInfo {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMin: number;
  category: { name: string; slug: string };
}

export interface EmployeeInfo {
  id: string;
  name: string;
  title: string;
}

export interface SalonDetail extends SalonSummary {
  address: string;
  phone: string;
  email: string | null;
  services: ServiceInfo[];
  employees: EmployeeInfo[];
  workingHours: { dayOfWeek: number; openMin: number; closeMin: number; closed: boolean }[];
  images: { url: string; alt: string }[];
}

export interface ReviewInfo {
  id: string;
  rating: number;
  text: string;
  ownerReply: string | null;
  helpful: number;
  createdAt: string;
  user: { name: string };
}

export interface BookingInfo {
  id: string;
  code: string;
  startAt: string;
  durationMin: number;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  salon: { name: string; slug: string; address: string; phone: string; area: { name: string; city: { name: string } } };
  employee: { name: string; title: string } | null;
  items: { name: string; price: number; durationMin: number }[];
  review: { id: string } | null;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  avatarUrl: string | null;
  loyaltyPoints: number;
  emailVerified: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
}

export const rupees = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;
