export interface project {
  // 项目ID
  projectId: number
  // 项目名称
  project_name: string
  // 项目创建者:当前登录的用户
  // creator: string
  // 项目所属组织（和创建者所属的组织一致）
  // organization: string
  // 项目创建时间
  creation_time: string
  // 加密程度(1)：共享：0 私有：1
  // lock:1 上锁了该项目是私有的    lock:0 未上锁该项目共享给同组织的所有人
}

export interface ApiResponse<T = any> {
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

// 定义组织信息类型
export interface OrganizationInfo {
  orgId: number
  orgName: string
}
