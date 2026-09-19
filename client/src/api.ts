const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface Requester {
  id: number;
  name: string;
}

export type PriorityType = "LOW" | "MEDIUM" | "HIGH";
export type TicketStatusType =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "WAITING_FOR_REQUESTER"
  | "REOPENED"
  | "CANCELLED";

export type RoleType = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: RoleType;
  active: boolean;
  mustChangePassword: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

let cachedCsrfToken: string | null = null;

export function setCachedCsrfToken(token: string | null) {
  cachedCsrfToken = token;
}

export function getCachedCsrfToken(): string | null {
  return cachedCsrfToken;
}

export async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${API_URL}/api/auth/csrf`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Unable to fetch CSRF token");
  }
  const data = await res.json();
  cachedCsrfToken = data.csrfToken;
  return data.csrfToken;
}

export async function loginApi(credentials: LoginCredentials): Promise<{ user: SafeUser }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Invalid email or password") as Error & {
      code?: string;
      status?: number;
      retryAfter?: number;
    };
    error.code = data.error;
    error.status = res.status;
    const retryHeader = res.headers.get("Retry-After");
    if (retryHeader) {
      error.retryAfter = parseInt(retryHeader, 10);
    }
    throw error;
  }
  return data;
}

export async function getCurrentUserApi(): Promise<SafeUser | null> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    credentials: "include",
  });
  if (res.status === 401) {
    return null;
  }
  if (!res.ok) {
    throw new Error("Unable to load current user");
  }
  const data = await res.json();
  return data.user;
}

export async function logoutApi(): Promise<void> {
  let token = cachedCsrfToken;
  if (!token) {
    try {
      token = await fetchCsrfToken();
    } catch {
      // proceed if token cannot be fetched
    }
  }

  const res = await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(token ? { "X-CSRF-Token": token } : {}),
    },
  });

  cachedCsrfToken = null;
  if (!res.ok && res.status !== 401) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Logout failed");
  }
}

export async function changePasswordApi(input: ChangePasswordInput): Promise<{ user: SafeUser }> {
  let token = cachedCsrfToken;
  if (!token) {
    token = await fetchCsrfToken();
  }

  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-CSRF-Token": token } : {}),
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Password change failed") as Error & {
      code?: string;
      status?: number;
      fields?: Record<string, string>;
    };
    error.code = data.error;
    error.status = res.status;
    error.fields = data.fields;
    throw error;
  }

  // After password change, session and CSRF token rotate
  await fetchCsrfToken().catch(() => {});

  return data;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface TicketInput {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: PriorityType;
}

export interface TicketItem {
  id: number;
  ticketNumber: string;
  summary: string;
  description?: string;
  category: { id: number; name: string };
  categoryId: number;
  relatedSystem: { id: number; name: string };
  relatedSystemId: number;
  requestedPriority: PriorityType;
  currentStatus: TicketStatusType;
  createdAt: string;
  updatedAt: string;
}

export async function checkSystem(): Promise<SystemStatus> {
  let healthRes: Response;
  try {
    healthRes = await fetch(`${API_URL}/api/health`, { credentials: "include" });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (!healthRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  let categoriesRes: Response;
  try {
    categoriesRes = await fetch(`${API_URL}/api/categories`, { credentials: "include" });
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (!categoriesRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const categories: Category[] = await categoriesRes.json();
  return { online: true, categories };
}

export async function fetchRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/requesters`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Unable to load requesters");
  }
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Unable to load related systems");
  }
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Unable to load categories");
  }
  return res.json();
}

export async function createTicket(input: TicketInput): Promise<TicketItem> {
  let token = cachedCsrfToken;
  if (!token) {
    try {
      token = await fetchCsrfToken();
    } catch {}
  }

  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-CSRF-Token": token } : {}),
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.message || "Unable to save your ticket. Please try again.";
    const err = new Error(errorMsg) as Error & { fields?: Record<string, string>; code?: string };
    err.fields = data.fields;
    err.code = data.error;
    throw err;
  }
  return data;
}

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  category: string;
  requestedPriority: PriorityType;
  currentStatus: TicketStatusType;
  createdAt: string;
  updatedAt: string;
}

export interface TicketListResponse {
  data: TicketListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unfilteredTotal: number;
}

export interface AttachmentItem {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  removedAt: string | null;
  removalReason: string | null;
}

export interface TicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requestedPriority: PriorityType;
  currentStatus: TicketStatusType;
  createdAt: string;
  attachments: AttachmentItem[];
  appearsResolvedAt?: string | null;
  appearsResolvedById?: number | null;
  version?: number;
}

export interface GetTicketsParams {
  requesterId: number;
  search?: string;
  categoryId?: number | string;
  requestedPriority?: PriorityType | "";
  status?: TicketStatusType | "";
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function fetchTickets(
  params: GetTicketsParams,
  signal?: AbortSignal
): Promise<TicketListResponse> {
  const query = new URLSearchParams();
  query.set("requesterId", String(params.requesterId));
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", String(params.categoryId));
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.status) query.set("status", params.status);
  if (params.sort) query.set("sort", params.sort);
  if (params.order) query.set("order", params.order);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
    signal,
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Unable to load tickets");
  }
  return res.json();
}

export async function fetchTicketDetail(
  id: number,
  requesterId: number,
  signal?: AbortSignal
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/api/tickets/${id}?requesterId=${requesterId}`, {
    signal,
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.message || "Unable to load ticket detail") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function uploadAttachment(
  ticketId: number,
  requesterId: number,
  file: File
): Promise<AttachmentItem> {
  let token = cachedCsrfToken;
  if (!token) {
    try {
      token = await fetchCsrfToken();
    } catch {}
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${API_URL}/api/tickets/${ticketId}/attachments?requesterId=${requesterId}`,
    {
      method: "POST",
      headers: {
        ...(token ? { "X-CSRF-Token": token } : {}),
      },
      credentials: "include",
      body: formData,
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Failed to upload attachment") as Error & {
      code?: string;
      status?: number;
    };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function removeAttachment(
  attachmentId: number,
  requesterId: number,
  reason: string
): Promise<AttachmentItem> {
  let token = cachedCsrfToken;
  if (!token) {
    try {
      token = await fetchCsrfToken();
    } catch {}
  }

  const res = await fetch(
    `${API_URL}/api/attachments/${attachmentId}?requesterId=${requesterId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-CSRF-Token": token } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ reason }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Failed to remove attachment") as Error & {
      code?: string;
      status?: number;
    };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  return data;
}

export function getAttachmentDownloadUrl(attachmentId: number, requesterId?: number): string {
  return `${API_URL}/api/attachments/${attachmentId}/download${requesterId ? `?requesterId=${requesterId}` : ""}`;
}

// ---------------------------------------------------------------------------
// P08, P09, P10: Staff Queue, Operations & Communications Interfaces & Methods
// ---------------------------------------------------------------------------

export interface StaffTicketItem {
  id: number;
  ticketNumber: string;
  summary: string;
  category: { id: number; name: string };
  requestedPriority: PriorityType;
  itPriority: PriorityType;
  currentStatus: TicketStatusType;
  ticketOwner: { id: number; name: string; email: string } | null;
  updatedAt: string;
}

export interface StaffQueueParams {
  search?: string;
  categoryId?: number;
  requestedPriority?: PriorityType;
  itPriority?: PriorityType;
  status?: TicketStatusType;
  owner?: "all" | "unassigned" | "mine";
  ticketOwnerId?: number;
  sort?: "ticketNumber" | "updatedAt" | "requestedPriority" | "itPriority" | "currentStatus";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface StaffQueueResponse {
  data: StaffTicketItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StaffTicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requestedPriority: PriorityType;
  itPriority: PriorityType;
  currentStatus: TicketStatusType;
  requester: { id: number; name: string; email: string };
  ticketOwner: { id: number; name: string; email: string } | null;
  version: number;
  appearsResolvedAt: string | null;
  appearsResolvedById: number | null;
  createdAt: string;
  updatedAt: string;
  attachments: AttachmentItem[];
}

export interface EligibleOwner {
  id: number;
  name: string;
  email: string;
  role: RoleType;
}

export interface CommunicationEntry {
  id: number;
  ticketId: number;
  content: string;
  author: { id: number; name: string; role: RoleType };
  createdAt: string;
}

async function getOrFetchCsrf(): Promise<string> {
  if (!cachedCsrfToken) {
    try {
      await fetchCsrfToken();
    } catch {}
  }
  return cachedCsrfToken || "";
}

export async function fetchStaffTickets(
  params: StaffQueueParams,
  signal?: AbortSignal
): Promise<StaffQueueResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", String(params.categoryId));
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.itPriority) query.set("itPriority", params.itPriority);
  if (params.status) query.set("status", params.status);
  if (params.owner) query.set("owner", params.owner);
  if (params.ticketOwnerId) query.set("ticketOwnerId", String(params.ticketOwnerId));
  if (params.sort) query.set("sort", params.sort);
  if (params.order) query.set("order", params.order);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const res = await fetch(`${API_URL}/api/staff/tickets?${query.toString()}`, {
    signal,
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.message || "Failed to load staff tickets") as Error & {
      code?: string;
      status?: number;
    };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function fetchStaffTicketDetail(
  id: number,
  signal?: AbortSignal
): Promise<StaffTicketDetail> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${id}`, {
    signal,
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.message || "Failed to load staff ticket detail") as Error & {
      code?: string;
      status?: number;
    };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function fetchEligibleOwners(): Promise<EligibleOwner[]> {
  const res = await fetch(`${API_URL}/api/staff/eligible-owners`, {
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to load eligible owners");
  }
  const result = await res.json();
  return result.data;
}

export async function claimTicket(
  id: number,
  expectedVersion: number
): Promise<StaffTicketDetail> {
  const csrf = await getOrFetchCsrf();
  const res = await fetch(`${API_URL}/api/staff/tickets/${id}/claim`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ expectedVersion }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Failed to claim ticket") as Error & {
      code?: string;
      status?: number;
    };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function assignTicketOwner(
  id: number,
  ownerId: number,
  expectedVersion: number
): Promise<StaffTicketDetail> {
  const csrf = await getOrFetchCsrf();
  const res = await fetch(`${API_URL}/api/staff/tickets/${id}/owner`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ ownerId, expectedVersion }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Failed to assign ticket owner") as Error & {
      code?: string;
      status?: number;
    };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function updateItPriority(
  id: number,
  itPriority: PriorityType,
  expectedVersion: number
): Promise<StaffTicketDetail> {
  const csrf = await getOrFetchCsrf();
  const res = await fetch(`${API_URL}/api/staff/tickets/${id}/priority`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ itPriority, expectedVersion }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Failed to update IT priority") as Error & {
      code?: string;
      status?: number;
    };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function updateTicketStatus(
  id: number,
  currentStatus: TicketStatusType,
  expectedVersion: number
): Promise<StaffTicketDetail> {
  const csrf = await getOrFetchCsrf();
  const res = await fetch(`${API_URL}/api/staff/tickets/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ currentStatus, expectedVersion }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Failed to update ticket status") as Error & {
      code?: string;
      status?: number;
    };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function fetchTicketComments(
  ticketId: number,
  signal?: AbortSignal
): Promise<CommunicationEntry[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    signal,
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.message || "Failed to load comments") as Error & {
      code?: string;
      status?: number;
    };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.data;
}

export async function createTicketComment(
  ticketId: number,
  content: string
): Promise<CommunicationEntry> {
  const csrf = await getOrFetchCsrf();
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ content }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Failed to add comment") as Error & {
      code?: string;
      status?: number;
    };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function fetchTicketNotes(
  ticketId: number,
  signal?: AbortSignal
): Promise<CommunicationEntry[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/internal-notes`, {
    signal,
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.message || "Failed to load internal notes") as Error & {
      code?: string;
      status?: number;
    };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.data;
}

export async function createTicketNote(
  ticketId: number,
  content: string
): Promise<CommunicationEntry> {
  const csrf = await getOrFetchCsrf();
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/internal-notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ content }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Failed to add internal note") as Error & {
      code?: string;
      status?: number;
    };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function indicateAppearsResolved(
  ticketId: number
): Promise<{
  id: number;
  appearsResolvedAt: string;
  appearsResolvedById: number;
  currentStatus: TicketStatusType;
  version: number;
}> {
  const csrf = await getOrFetchCsrf();
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/appears-resolved`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    credentials: "include",
    body: JSON.stringify({}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Failed to record resolution indication") as Error & {
      code?: string;
      status?: number;
    };
    error.code = data.error;
    error.status = res.status;
    throw error;
  }
  return data;
}