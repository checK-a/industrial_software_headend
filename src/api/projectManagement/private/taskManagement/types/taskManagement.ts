export interface task {
  // 任务ID
  taskId: number
  // 任务名称
  task_name: string
  // 任务创建者
  creator: string
  // 任务创建时间
  creation_time: string
  // 任务仿真阶段：前处理、后处理、求解器
  simulationStage: string
  // 任务类型：
  /* 前处理：多体、结构、冲击
     后处理：通用后处理、多体
     求解器：多体、结构、冲击GPU、冲击CPU */
  type: string
  // 状态：未启动、仿真中、暂停中
  status: string
  // 新增：计算资源类型（仅对求解器冲击任务有效）
  computeResource?: string
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
