// ─── API Envelope ────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

// ─── Products ─────────────────────────────────────────────────────────────────
export interface Product {
  id: string; // UUID
  name: string;
  description: string | null;
  price: number; // decimal
  stock: number; // int
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  price: number;
  stock: number;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  isActive?: boolean;
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  notes: string | null;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderItem {
  productId: string;
  quantity: number;
}

export interface CreateOrderPayload {
  notes?: string;
  items: CreateOrderItem[];
}

export interface UpdateOrderPayload {
  status: OrderStatus;
}

// ─── Cart (client-side only) ──────────────────────────────────────────────────
export interface CartItem {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  maxStock: number;
}
