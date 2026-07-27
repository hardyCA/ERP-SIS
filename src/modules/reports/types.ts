export interface DashboardStats {
  totalProducts: number
  salesToday: number
  salesTodayAmount: number
  activeCredits: number
  activeCreditsAmount: number
  cashBalance: number
  lowStockCount: number
}

export interface SalesReportItem {
  id: string
  number: number
  total: number
  discount: number
  payment_type: string
  customer_name: string | null
  created_at: string
  created_by_name: string | null
  branches: { name: string } | null
}

export interface InventoryReportItem {
  product_id: string
  product_name: string
  brand_name: string
  category_name: string
  cost: number
  sale_price: number
  quantity: number
  image_url: string | null
}

export interface CashReportItem {
  id: string
  number: number
  type: string
  amount: number
  description: string | null
  reference_type: string | null
  created_at: string
}

export interface CreditReportItem {
  id: string
  sale_id: string
  sale_number: number
  total: number
  balance: number
  customer_name: string | null
  created_at: string
  payment_count: number
  days: number
}

export interface ProfitReportItem {
  id: string
  number: number
  total: number
  cost_total: number
  profit: number
  margin: number
  payment_type: string
  customer_name: string | null
  created_at: string
  branches: { name: string } | null
}

export type ActionResponse<T = unknown> = {
  success: boolean
  message: string
  data?: T
}
