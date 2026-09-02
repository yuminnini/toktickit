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