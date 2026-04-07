// 路径：src/api/organizationManagement/index.ts
import { request } from "@/utils/service"
import type { ApiResponse, Organization, Member } from "@/api/organizationManagement/types/organization"

interface PageData<T> {
  records: T[]
  total: number
  size: number
  current: number
}

// 获取组织分页列表
export function getOrganizationListApi(params: {
  pageNum: number
  pageSize: number
  keyword?: string
}): Promise<ApiResponse<PageData<Organization>>> {
  return request<ApiResponse<PageData<Organization>>>({
    url: "/organizations",
    method: "get",
    params
  })
}

// 创建新组织
export function createOrganizationApi(data: {
  orgName: string
  description?: string
}): Promise<ApiResponse<Organization>> {
  return request<ApiResponse<Organization>>({
    url: "/organizations",
    method: "post",
    data
  })
}

// 获取组织成员列表
export function getOrganizationMembersApi(
  orgId: string,
  params: {
    pageNum: number
    pageSize: number
  }
): Promise<ApiResponse<PageData<Member>>> {
  return request<ApiResponse<PageData<Member>>>({
    url: `/organizations/${orgId}/members`,
    method: "get",
    params
  })
}

// 添加成员到组织
export function addMembersToOrganizationApi(
  orgId: string,
  data: {
    userIds: string[]
  }
): Promise<ApiResponse<void>> {
  return request<ApiResponse<void>>({
    url: `/organizations/${orgId}/members`,
    method: "post",
    data
  })
}

// 从组织中移除成员
export function removeMemberFromOrganizationApi(orgId: string, memberId: string): Promise<ApiResponse<void>> {
  return request<ApiResponse<void>>({
    url: `/organizations/${orgId}/members/${memberId}`,
    method: "delete"
  })
}

// 获取未分配成员列表
export function getUnassignedMembersApi(params: {
  pageNum: number
  pageSize: number
}): Promise<ApiResponse<PageData<Member>>> {
  return request<ApiResponse<PageData<Member>>>({
    url: "/organizations/unassigned-members",
    method: "get",
    params
  })
}

/**
 * 更新用户组织权限(组管理员权限)
 * @param userId 用户ID
 * @param taskPermission 任务权限值 (0: 个人权限, 1: 组织权限)
 */
export function updateUserTaskPermissionApi(orgId: string, memberId: number, taskPermission: number) {
  return request<ApiResponse<void>>({
    url: `/organizations/${orgId}/members/${memberId}/group-admin`,
    method: "PUT",
    data: { taskPermission }
  })
}
