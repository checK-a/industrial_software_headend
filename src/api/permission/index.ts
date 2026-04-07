import { request } from "@/utils/service"
import type { ApiResponse, PageData } from "@/api/permission/types/userInfo"

interface PermissionUser {
  userId: number
  username: string
  phone: string
  permission: number
  taskPermission: number
  organization: string
  orgId: string
}

export function getUserPageApi(params: { pageNum: number; pageSize: number; keyword?: string }) {
  return request<ApiResponse<PageData<PermissionUser>>>({
    url: "/admin/users/page",
    method: "post",
    data: params
  })
}

export function changePermissionApi(userId: number, permission: number) {
  return request<ApiResponse<void>>({
    url: `/admin/users/${userId}/changePermission`,
    method: "post",
    params: { permission }
  })
}

/**
 * 更新用户所属组织
 * @param userId 用户ID
 * @param orgId 组织ID (传空字符串表示移出组织)
 */
export function updateUserOrganizationApi(userId: number, orgId: string) {
  return request<ApiResponse<{ newOrganization: string }>>({
    url: "/user/organization",
    method: "POST",
    data: {
      userId,
      orgId
    }
  })
}
