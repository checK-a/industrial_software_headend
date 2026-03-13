import type { LicenseRequestStatus } from "@/api/license/types/license"

export const LICENSE_REQUEST_STATUS_OPTIONS: Array<{ label: string; value: LicenseRequestStatus }> = [
  { label: "待分配", value: "PENDING" },
  { label: "已分配未过期", value: "VALID" },
  { label: "已分配已过期", value: "OVERDUE" },
  { label: "已拒绝", value: "REJECTED" }
]

export const LICENSE_ALLOCATED_STATUS_OPTIONS: Array<{ label: string; value: LicenseRequestStatus }> = [
  { label: "已分配未过期", value: "VALID" },
  { label: "已分配已过期", value: "OVERDUE" }
]

export const LICENSE_REQUEST_STATUS_LABELS: Record<LicenseRequestStatus, string> = {
  PENDING: "待分配",
  VALID: "已分配未过期",
  OVERDUE: "已分配已过期",
  REJECTED: "已拒绝"
}

export const LICENSE_REQUEST_STATUS_TYPES: Record<
  LicenseRequestStatus,
  "success" | "warning" | "danger" | "info"
> = {
  PENDING: "warning",
  VALID: "success",
  OVERDUE: "info",
  REJECTED: "danger"
}

export const isAllocatedLicenseStatus = (status: LicenseRequestStatus): status is "VALID" | "OVERDUE" =>
  status === "VALID" || status === "OVERDUE"
