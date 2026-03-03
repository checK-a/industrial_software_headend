export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PageData<T> {
  records: T[]
  total: number
  size: number
  current: number
}

export type LicenseRequestStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface ModuleCategory {
  categoryId: string
  name: string
  description?: string
}

export interface LicenseModule {
  moduleId: string
  moduleNo?: string
  name: string
  description?: string
  categoryId: string
}

export interface LicenseRequestPayload {
  customerName: string
  macAddress: string
  categoryId: string
  moduleId: string
  validFrom: string
  validTo: string
  usageCount: number
}

export interface LicenseRequestItem extends LicenseRequestPayload {
  requestId: string
  userName: string
  status: LicenseRequestStatus
  createdAt: string
  licenseNo?: string
  categoryName?: string
  moduleName?: string
}

export interface LicenseRequestQuery {
  moduleKeyword?: string
  status?: LicenseRequestStatus | ""
  page?: number
  size?: number
}

export interface LicenseRequestSearchQuery {
  pageNum: number
  pageSize: number
  moduleKeyword?: string
  categoryId?: string
  status?: LicenseRequestStatus | ""
}
