import { request } from "@/utils/service"
import type {
  ApiResponse,
  LicenseModule,
  LicenseRequestItem,
  LicenseRequestPayload,
  LicenseRequestQuery,
  LicenseRequestStatus,
  ModuleCategory,
  PageData
} from "./types/license"

type StringMap = Record<string, string>
type Nullable<T> = T | null | undefined

const moduleCatalogCache = {
  categoryNameMap: new Map<string, string>(),
  moduleNameMap: new Map<string, string>()
}

const setCategoryCache = (categories: ModuleCategory[]) => {
  categories.forEach((item) => {
    moduleCatalogCache.categoryNameMap.set(item.categoryId, item.name)
  })
}

const setModuleCache = (modules: LicenseModule[]) => {
  modules.forEach((item) => {
    moduleCatalogCache.moduleNameMap.set(item.moduleId, item.name)
  })
}

const normalizeStatus = (status: Nullable<string>): LicenseRequestStatus => {
  const upperStatus = String(status ?? "")
    .trim()
    .toUpperCase()
  if (upperStatus === "VALID" || upperStatus === "APPROVED") return "VALID"
  if (upperStatus === "OVERDUE") return "OVERDUE"
  if (upperStatus === "REJECTED") return "REJECTED"
  return "PENDING"
}

const toDateString = (value: unknown): string => {
  if (typeof value !== "string") return ""
  const text = value.trim()
  if (!text) return ""
  if (text.length >= 10) return text.slice(0, 10)
  return text
}

const normalizeCategoryData = (rawData: unknown): ModuleCategory[] => {
  if (Array.isArray(rawData)) {
    return rawData
      .map((item) => {
        const categoryId = typeof item?.categoryId === "string" ? item.categoryId : ""
        const name = typeof item?.name === "string" ? item.name : ""
        if (!categoryId || !name) return null
        return {
          categoryId,
          name,
          description: typeof item?.description === "string" ? item.description : undefined
        }
      })
      .filter((item): item is ModuleCategory => item !== null)
  }

  if (rawData && typeof rawData === "object") {
    return Object.entries(rawData as StringMap).map(([categoryId, name]) => ({
      categoryId,
      name
    }))
  }

  return []
}

const normalizeModuleData = (categoryId: string, rawData: unknown): LicenseModule[] => {
  if (Array.isArray(rawData)) {
    return rawData
      .map((item) => {
        const moduleId = typeof item?.moduleId === "string" ? item.moduleId : ""
        const name = typeof item?.name === "string" ? item.name : ""
        if (!moduleId || !name) return null
        return {
          moduleId,
          moduleNo: typeof item?.moduleNo === "string" ? item.moduleNo : undefined,
          name,
          categoryId: typeof item?.categoryId === "string" ? item.categoryId : categoryId,
          description: typeof item?.description === "string" ? item.description : undefined
        }
      })
      .filter((item): item is LicenseModule => item !== null)
  }

  if (rawData && typeof rawData === "object") {
    return Object.entries(rawData as StringMap).map(([moduleId, name]) => ({
      moduleId,
      moduleNo: moduleId,
      name,
      categoryId
    }))
  }

  return []
}

const normalizeRequestItem = (item: Record<string, unknown>): LicenseRequestItem => {
  const categoryId = typeof item.categoryId === "string" ? item.categoryId : ""
  const moduleId = typeof item.moduleId === "string" ? item.moduleId : ""

  return {
    requestId: typeof item.requestId === "string" ? item.requestId : "",
    userName: typeof item.userName === "string" ? item.userName : "",
    customerName: typeof item.customerName === "string" ? item.customerName : "",
    macAddress: typeof item.macAddress === "string" ? item.macAddress : "",
    categoryId,
    moduleId,
    validFrom: toDateString(item.validFrom),
    validTo: toDateString(item.validTo),
    usageCount: Number(item.usageCount ?? 0),
    status: normalizeStatus(item.status as Nullable<string>),
    createdAt: toDateString(item.createdAt),
    licenseNo: typeof item.licenseNo === "string" ? item.licenseNo : undefined,
    categoryName:
      (typeof item.categoryName === "string" && item.categoryName) ||
      moduleCatalogCache.categoryNameMap.get(categoryId) ||
      categoryId,
    moduleName:
      (typeof item.moduleName === "string" && item.moduleName) ||
      moduleCatalogCache.moduleNameMap.get(moduleId) ||
      moduleId
  }
}

const normalizeRequestPage = (rawData: unknown): PageData<LicenseRequestItem> => {
  if (!rawData || typeof rawData !== "object") {
    return {
      records: [],
      total: 0,
      size: 10,
      current: 1
    }
  }

  const source = rawData as Record<string, unknown>
  const rawRecords = Array.isArray(source.records) ? source.records : []
  const records = rawRecords
    .map((item) => (item && typeof item === "object" ? normalizeRequestItem(item as Record<string, unknown>) : null))
    .filter((item): item is LicenseRequestItem => item !== null)

  return {
    records,
    total: Number(source.total ?? records.length),
    size: Number(source.size ?? records.length),
    current: Number(source.current ?? 1)
  }
}

const mockCategories: ModuleCategory[] = [
  { categoryId: "pre", name: "前处理" },
  { categoryId: "solver", name: "求解器" },
  { categoryId: "post", name: "后处理" }
]

const mockModules: LicenseModule[] = [
  { moduleId: "pre-impact", moduleNo: "PRE-IMP-001", name: "冲击前处理", categoryId: "pre" },
  { moduleId: "pre-struct", moduleNo: "PRE-STR-002", name: "结构前处理", categoryId: "pre" },
  { moduleId: "solver-impact-cpu", moduleNo: "SOL-IMP-CPU", name: "冲击求解器CPU版", categoryId: "solver" },
  { moduleId: "solver-impact-gpu", moduleNo: "SOL-IMP-GPU", name: "冲击求解器GPU版", categoryId: "solver" },
  { moduleId: "post-impact", moduleNo: "POST-IMP-001", name: "冲击后处理", categoryId: "post" }
]

let mockLicenseRequests: LicenseRequestItem[] = [
  {
    requestId: "req-2024-001",
    userName: "张三",
    customerName: "华北工业集团",
    macAddress: "3C:52:82:1A:9F:01",
    status: "VALID",
    categoryId: "solver",
    moduleId: "solver-impact-cpu",
    validFrom: "2024-07-01",
    validTo: "2026-07-01",
    usageCount: 120,
    createdAt: "2024-06-10",
    licenseNo: "LIC-2024-010"
  },
  {
    requestId: "req-2024-002",
    userName: "张三",
    customerName: "江南动力科技",
    macAddress: "8C:7B:9D:2F:11:0A",
    status: "PENDING",
    categoryId: "pre",
    moduleId: "pre-struct",
    validFrom: "2024-08-01",
    validTo: "2025-08-01",
    usageCount: 80,
    createdAt: "2024-06-16"
  },
  {
    requestId: "req-2024-003",
    userName: "李四",
    customerName: "东启精工",
    macAddress: "A4:5E:60:7B:31:9C",
    status: "OVERDUE",
    categoryId: "post",
    moduleId: "post-impact",
    validFrom: "2024-05-01",
    validTo: "2024-11-01",
    usageCount: 40,
    createdAt: "2024-05-20",
    licenseNo: "LIC-2024-003"
  },
  {
    requestId: "req-2024-004",
    userName: "鐜嬩簲",
    customerName: "鍗庡崡璁惧",
    macAddress: "B7:4D:60:7B:31:9C",
    status: "REJECTED",
    categoryId: "post",
    moduleId: "post-impact",
    validFrom: "2024-06-01",
    validTo: "2024-12-01",
    usageCount: 20,
    createdAt: "2024-05-26"
  }
]

setCategoryCache(mockCategories)
setModuleCache(mockModules)

const successResponse = <T>(data: T): ApiResponse<T> => ({
  code: 200,
  message: "ok",
  data
})

const updateRequestItem = (requestId: string, patch: Partial<LicenseRequestItem>): LicenseRequestItem | null => {
  const target = mockLicenseRequests.find((item) => item.requestId === requestId)
  if (!target) return null
  const next = { ...target, ...patch }
  mockLicenseRequests = mockLicenseRequests.map((item) => (item.requestId === requestId ? next : item))
  return next
}

const normalizeMockRows = (rows: LicenseRequestItem[]) =>
  rows.map((item) =>
    normalizeRequestItem({
      ...item,
      categoryName: item.categoryName,
      moduleName: item.moduleName
    })
  )

export const fillRequestDisplayNames = (items: LicenseRequestItem[]): LicenseRequestItem[] =>
  items.map((item) =>
    normalizeRequestItem({
      ...item,
      categoryName: item.categoryName,
      moduleName: item.moduleName
    })
  )

export const getModuleCategoriesMock = async (): Promise<ApiResponse<ModuleCategory[]>> => {
  setCategoryCache(mockCategories)
  return successResponse(mockCategories)
}

export const getModulesByCategoryMock = async (categoryId: string): Promise<ApiResponse<LicenseModule[]>> => {
  const modules = mockModules.filter((item) => item.categoryId === categoryId)
  setModuleCache(modules)
  return successResponse(modules)
}

export const getLicenseRequestsMock = async (
  params: LicenseRequestQuery = {}
): Promise<ApiResponse<PageData<LicenseRequestItem>>> => {
  const { moduleKeyword = "", status = "", page = 1, size = 10 } = params
  const keyword = moduleKeyword.trim().toLowerCase()

  const filtered = mockLicenseRequests.filter((item) => {
    const matchKeyword = keyword
      ? item.moduleId.toLowerCase().includes(keyword) ||
        (item.moduleName ?? "").toLowerCase().includes(keyword) ||
        (item.categoryName ?? "").toLowerCase().includes(keyword)
      : true
    const matchStatus = status ? item.status === status : true
    return matchKeyword && matchStatus
  })

  const start = (page - 1) * size
  const records = normalizeMockRows(filtered.slice(start, start + size))

  return successResponse({
    records,
    total: filtered.length,
    size,
    current: page
  })
}

export const approveLicenseRequestMock = async (requestId: string): Promise<ApiResponse<LicenseRequestItem>> => {
  const updated = updateRequestItem(requestId, { status: "VALID" })
  if (!updated) return Promise.reject(new Error("license request not found"))
  return successResponse(normalizeRequestItem(updated as unknown as Record<string, unknown>))
}

export const rejectLicenseRequestMock = async (requestId: string): Promise<ApiResponse<LicenseRequestItem>> => {
  const updated = updateRequestItem(requestId, { status: "REJECTED" })
  if (!updated) return Promise.reject(new Error("license request not found"))
  return successResponse(normalizeRequestItem(updated as unknown as Record<string, unknown>))
}

export const uploadLicenseFileMock = async (
  requestId: string,
  data?: FormData
): Promise<ApiResponse<LicenseRequestItem>> => {
  const licenseNoValue = data?.get("licenseNo")
  const licenseNo =
    typeof licenseNoValue === "string" && licenseNoValue.trim() ? licenseNoValue.trim() : `LIC-UP-${Date.now()}`
  const updated = updateRequestItem(requestId, { status: "VALID", licenseNo })
  if (!updated) return Promise.reject(new Error("license request not found"))
  return successResponse(normalizeRequestItem(updated as unknown as Record<string, unknown>))
}

export const downloadLicenseFileMock = async (requestId: string): Promise<Blob> => {
  const target = mockLicenseRequests.find((item) => item.requestId === requestId)
  const label = target?.licenseNo ?? requestId
  const content = `Mock license file for ${label}`
  return new Blob([content], { type: "text/plain" })
}

export const createLicenseRequestMock = async (
  payload: LicenseRequestPayload,
  userName = "current_user"
): Promise<ApiResponse<LicenseRequestItem>> => {
  const requestItem: LicenseRequestItem = normalizeRequestItem({
    requestId: `req-${Date.now()}`,
    userName,
    customerName: payload.customerName,
    macAddress: payload.macAddress,
    categoryId: payload.categoryId,
    moduleId: payload.moduleId,
    validFrom: payload.validFrom,
    validTo: payload.validTo,
    usageCount: payload.usageCount,
    status: "PENDING",
    createdAt: new Date().toISOString().slice(0, 10)
  })
  mockLicenseRequests = [requestItem, ...mockLicenseRequests]
  return successResponse(requestItem)
}

export const getModuleCategoriesApi = async () => {
  const response = await request<ApiResponse<ModuleCategory[] | StringMap>>({
    url: "/license/categories",
    method: "get"
  })
  const categories = normalizeCategoryData(response.data)
  setCategoryCache(categories)
  return {
    ...response,
    data: categories
  }
}

export const getModulesByCategoryApi = async (categoryId: string) => {
  const response = await request<ApiResponse<LicenseModule[] | StringMap>>({
    url: "/license/modules",
    method: "get",
    params: { categoryId }
  })
  const modules = normalizeModuleData(categoryId, response.data)
  setModuleCache(modules)
  return {
    ...response,
    data: modules
  }
}

export const getLicenseRequestsApi = async (params: LicenseRequestQuery = {}) => {
  const queryParams: LicenseRequestQuery = {
    page: params.page ?? 1,
    size: params.size ?? 10
  }

  if (params.moduleKeyword && params.moduleKeyword.trim()) {
    queryParams.moduleKeyword = params.moduleKeyword.trim()
  }
  if (params.status) {
    queryParams.status = params.status
  }

  const response = await request<ApiResponse<PageData<Record<string, unknown>>>>({
    url: "/license/requests",
    method: "get",
    params: queryParams
  })

  return {
    ...response,
    data: normalizeRequestPage(response.data)
  }
}

export const getLicenseRequestsByUserIdApi = async (userId: number, params: LicenseRequestQuery = {}) => {
  const queryParams: LicenseRequestQuery = {
    page: params.page ?? 1,
    size: params.size ?? 10
  }

  if (params.moduleKeyword && params.moduleKeyword.trim()) {
    queryParams.moduleKeyword = params.moduleKeyword.trim()
  }
  if (params.status) {
    queryParams.status = params.status
  }

  const response = await request<ApiResponse<PageData<Record<string, unknown>>>>({
    url: `/license/requests/user/${userId}`,
    method: "get",
    params: queryParams
  })

  return {
    ...response,
    data: normalizeRequestPage(response.data)
  }
}

export const createLicenseRequestApi = (payload: LicenseRequestPayload) =>
  request<ApiResponse<LicenseRequestItem>>({
    url: "/license/requests",
    method: "post",
    data: payload
  })

export const approveLicenseRequestApi = (requestId: string) =>
  request<ApiResponse<LicenseRequestItem>>({
    url: `/license/requests/${requestId}/approve`,
    method: "post"
  })

export const rejectLicenseRequestApi = (requestId: string) =>
  request<ApiResponse<LicenseRequestItem>>({
    url: `/license/requests/${requestId}/reject`,
    method: "post"
  })

export const uploadLicenseFileApi = (requestId: string, data: FormData) =>
  request<ApiResponse<LicenseRequestItem>>({
    url: `/license/requests/${requestId}/upload`,
    method: "post",
    headers: {
      "Content-Type": "multipart/form-data"
    },
    data,
    timeout: 0
  })

export const downloadLicenseFileApi = (requestId: string) =>
  request<Blob>({
    url: `/license/requests/${requestId}/download`,
    method: "get",
    responseType: "blob",
    timeout: 0
  })
