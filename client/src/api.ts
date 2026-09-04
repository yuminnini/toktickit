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
export type TicketStatusType = "NEW" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

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
    healthRes = await fetch(`${API_URL}/api/health`);
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }
  if (!healthRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  let categoriesRes: Response;
  try {
    categoriesRes = await fetch(`${API_URL}/api/categories`);
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
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) {
    throw new Error("Unable to load requesters");
  }
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) {
    throw new Error("Unable to load related systems");
  }
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error("Unable to load categories");
  }
  return res.json();
}

export async function createTicket(input: TicketInput): Promise<TicketItem> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, { signal });
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
  const res = await fetch(`${API_URL}/api/tickets/${id}?requesterId=${requesterId}`, { signal });
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
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${API_URL}/api/tickets/${ticketId}/attachments?requesterId=${requesterId}`,
    {
      method: "POST",
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
  const res = await fetch(
    `${API_URL}/api/attachments/${attachmentId}?requesterId=${requesterId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
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

export function getAttachmentDownloadUrl(attachmentId: number, requesterId: number): string {
  return `${API_URL}/api/attachments/${attachmentId}/download?requesterId=${requesterId}`;
}