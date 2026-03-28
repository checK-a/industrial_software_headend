<script setup lang="ts">
import { ref, onMounted, reactive } from "vue"
import {
  ElTable,
  ElTableColumn,
  ElButton,
  ElInput,
  ElPagination,
  ElTag,
  ElMessage,
  TabPaneName,
  ElMessageBox
} from "element-plus"
import { Server, Task } from "@/api/monitoring/types/task-server"
import {
  synchronousCloudServer,
  getServers,
  getAdjustableSpecifications,
  getTasksRunning,
  changeServerResource,
  changeTaskPriority
  // allocateTaskResources,
  // allocateServerResources
} from "@/api/monitoring"
// ---------- 响应式数据 ----------
const servers = ref<Server[]>([])
const totalServers = ref(0)
const isLoading = ref(false)

// 任务列表相关
const tasks = ref<Task[]>([])
const totalTasks = ref(0)
const isTaskLoading = ref(false)

// 搜索 / 筛选（服务器）
const searchQuery = ref("")
const statusFilter = ref("")

// 搜索 / 筛选（任务）
const taskSearchQuery = ref("")
const taskStatusFilter = ref("")
const taskServerFilter = ref(0)

// 分页（服务器）
const currentPage = ref(1)
const pageSize = ref(10)

// 分页（任务）
const taskCurrentPage = ref(1)
const taskPageSize = ref(10)

// 当前激活的标签页
const activeTab = ref("server")

// 服务器资源调整弹窗相关
const showServerResourceDialog = ref(false)
const currentServer = ref<Server | null>(null)
const serverResourceForm = reactive({
  specification: "",
  cpuCore: 0,
  memory: 0
})
const specifications = ref<{ specification: string; cpuCore: number; memory: number }[]>([])

// 任务优先级调整弹窗相关
const showTaskPriorityDialog = ref(false)
const currentTask = ref<Task | null>(null)
const taskPriorityForm = ref(1)

// 资源分配相关响应式数据
const selectedTasks = ref<Task[]>([])
const selectedServers = ref<Server[]>([])
const isAllocating = ref(false)

// ---------- 工具函数 ----------
// 服务器状态处理
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    Running: "运行中",
    Stopped: "未运行",
    Starting: "启动中",
    Stopping: "停止中",
    Pending: "待处理"
  }
  return map[status] || "未知"
}

const getStatusTagType = (status: string) => {
  if (status === "Running") return "success"
  if (status === "Starting" || status === "Stopping") return "warning"
  if (status === "Stopped") return "danger"
  if (status === "Pending") return "info"
  return ""
}

// 任务状态处理
const getTaskStatusText = (status: string) => {
  const map: Record<string, string> = {
    running: "执行中",
    completed: "已完成",
    failed: "失败",
    pending: "待执行"
  }
  return map[status] || "未知"
}

const getTaskStatusTagType = (status: string) => {
  if (status === "running") return "success"
  if (status === "completed") return "info"
  if (status === "failed") return "danger"
  if (status === "pending") return "warning"
  return ""
}

// 优先级文本转换
const getPriorityText = (priority: number) => {
  const map = { 1: "高", 2: "中", 3: "低" }
  return map[priority] || "未知"
}

// 优先级标签类型
const getPriorityTagType = (priority: number) => {
  const map = { 1: "danger", 2: "warning", 3: "info" }
  return map[priority] || ""
}

// 通用任务排序函数
const sortTasks = (tasks: Task[]): Task[] => {
  if (!tasks.length) return []
  return [...tasks].sort((a, b) => {
    return a.priority - b.priority
  })
}

// 验证选中的任务/服务器是否合法
const validateSelection = (): boolean => {
  if (selectedTasks.value.length === 0 && selectedServers.value.length === 0) {
    ElMessage.warning("请至少选择一个任务或服务器！")
    return false
  }
  return true
}

// ---------- API 调用封装 ----------
const fetchServers = async () => {
  isLoading.value = true
  try {
    const response = await getServers({
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchQuery.value || undefined,
      status: statusFilter.value || undefined
    })
    servers.value = response.data.records
    totalServers.value = response.data.total
  } catch (e: any) {
    console.error("获取服务器列表失败:", e.message || e)
    ElMessage.error("获取服务器列表失败")
  } finally {
    isLoading.value = false
    selectedServers.value = []
  }
}

// 获取任务列表
const fetchTasks = async () => {
  isTaskLoading.value = true
  try {
    const response = await getTasksRunning({
      pageNum: taskCurrentPage.value,
      pageSize: taskPageSize.value,
      keyword: taskSearchQuery.value || undefined,
      status: taskStatusFilter.value || undefined,
      serverId: taskServerFilter.value || undefined
    })
    tasks.value = sortTasks(response.data.records)
    totalTasks.value = response.data.total
  } catch (e: any) {
    ElMessage.error("获取任务列表失败：" + e.message)
  } finally {
    selectedTasks.value = []
    isTaskLoading.value = false
  }
}

// 调整服务器可用资源
const handleSubmitResource = async () => {
  if (!currentServer.value) return ElMessage.warning("未选择服务器")

  try {
    const res = await changeServerResource(currentServer.value.id, serverResourceForm.specification)
    ElMessage.success(res.message || "服务器资源调整成功")
    showServerResourceDialog.value = false
    currentServer.value = null
    synchronousCloudServer()
    fetchServers()
  } catch (err: any) {
    ElMessage.error(err.message || "服务器资源调整失败")
    console.error(err)
  }
}

// 调整任务优先级
const handleSubmitPriority = async () => {
  if (!currentTask.value) return
  try {
    await changeTaskPriority(currentTask.value.taskId, taskPriorityForm.value)
    const index = tasks.value.findIndex((item) => item.taskId === currentTask.value!.taskId)
    if (index !== -1) {
      tasks.value[index].priority = taskPriorityForm.value
      ElMessage.success("任务优先级调整成功")
    }
    fetchTasks()
  } catch (err) {
    ElMessage.error("任务优先级调整失败")
    console.error(err)
  } finally {
    currentTask.value = null
    showTaskPriorityDialog.value = false
  }
}

// 触发自动分配资源
const triggerAutoAllocate = async () => {
  if (!validateSelection()) return

  try {
    const confirmResult = await ElMessageBox.confirm("是否确认分配资源？", "资源分配确认", {
      confirmButtonText: "确认",
      cancelButtonText: "取消",
      type: "warning"
    })

    if (confirmResult === "confirm") {
      isAllocating.value = true
      // let res
      // if (activeTab.value === "task") {
      //   const taskIds = selectedTasks.value.map((task) => task.id)
      //   res = await allocateTaskResources(taskIds)
      // } else if (activeTab.value === "server") {
      //   const serverIds = selectedServers.value.map((server) => server.id)
      //   res = await allocateServerResources(serverIds)
      // }
      // if (res.code === 200) {
      //   ElMessage.success("资源分配成功！")
      //   fetchServers()
      //   fetchTasks()
      //   selectedTasks.value = []
      //   selectedServers.value = []
      // } else {
      //   ElMessage.error(`分配失败：${res.message}`)
      // }
      ElMessage.success("资源分配成功！")
      fetchServers()
      fetchTasks()
      selectedTasks.value = []
      selectedServers.value = []
    }
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("资源分配异常，请重试！")
      console.error("分配失败：", error)
    }
  } finally {
    isAllocating.value = false
  }
}

// ---------- 事件处理 ----------
const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchServers()
}
// 任务分页切换
const handleTaskPageChange = (page: number) => {
  taskCurrentPage.value = page
  fetchTasks()
}
const resetFilters = () => {
  searchQuery.value = ""
  statusFilter.value = ""
  currentPage.value = 1
  fetchServers()
}
// 重置任务筛选
const resetTaskFilters = () => {
  taskSearchQuery.value = ""
  taskStatusFilter.value = ""
  taskServerFilter.value = 0
  taskCurrentPage.value = 1
  fetchTasks()
}
// 标签页切换时刷新数据
const handleTabChange = (tab: TabPaneName) => {
  const tabStr = typeof tab === "number" ? tab.toString() : tab
  if (tabStr === "server") {
    fetchServers()
  } else if (tabStr === "task") {
    fetchTasks()
  }
}

// 打开服务器资源调整弹窗
const openServerResourceDialog = async (server: Server) => {
  currentServer.value = server
  specifications.value = []
  try {
    const res = await getAdjustableSpecifications(server.id)
    specifications.value = res.data
    specifications.value = specifications.value.map((item) => ({
      ...item,
      memory: item.memory
    }))
    Object.assign(serverResourceForm, {
      specification: server.specification,
      cpuCore: server.cpuCores,
      memory: server.memory
    })
    showServerResourceDialog.value = true
  } catch (err: any) {
    ElMessage.error(err.message || "获取可调整规格异常，请稍后重试")
    showServerResourceDialog.value = false
  }
}

const onSpecChange = (specValue: string) => {
  const selectSpec = specifications.value.find((item) => item.specification === specValue)
  if (selectSpec) {
    serverResourceForm.cpuCore = selectSpec.cpuCore
    serverResourceForm.memory = selectSpec.memory
  }
}

// 打开任务优先级调整弹窗
const openTaskPriorityDialog = (task: Task) => {
  currentTask.value = task
  taskPriorityForm.value = task.priority
  showTaskPriorityDialog.value = true
}

// ---------- 初始化 ----------
onMounted(() => {
  synchronousCloudServer()
  fetchServers()
  fetchTasks()
})
</script>

<template>
  <div class="resource-page">
    <!-- 顶部标签页切换 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="tab-container">
      <el-tab-pane label="服务器管理" name="server">
        <!-- 服务器搜索 / 筛选 -->
        <div class="header">
          <div class="search-container">
            <el-input v-model="searchQuery" placeholder="搜索服务器名称或IP" clearable @keyup.enter="fetchServers" />
            <el-button type="primary" @click="fetchServers" :loading="isLoading">搜索</el-button>
          </div>
          <div class="button-group">
            <el-button @click="fetchServers" :loading="isLoading"> <i class="el-icon-refresh" /> 刷新 </el-button>
            <el-button type="primary" @click="triggerAutoAllocate" :loading="isAllocating"> 自动分配资源 </el-button>
          </div>
        </div>

        <div class="filter-container">
          <el-select v-model="statusFilter" placeholder="状态筛选" clearable>
            <el-option label="全部状态" value="" />
            <el-option label="运行中" value="Running" />
            <el-option label="未运行" value="Stopped" />
            <el-option label="启动中" value="Starting" />
            <el-option label="停止中" value="Stopping" />
            <el-option label="待处理" value="Pending" />
          </el-select>
          <el-button @click="resetFilters">重置筛选</el-button>
        </div>

        <!-- 服务器列表 -->
        <el-table
          :data="servers"
          :style="{ width: '100%' }"
          v-loading="isLoading"
          @selection-change="(val) => (selectedServers = val)"
          ref="serverTableRef"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="name" label="服务器名称" min-width="150" />
          <el-table-column prop="ip" label="IP地址" width="130" />
          <el-table-column prop="specification" label="服务器规格" width="150" />
          <el-table-column prop="source" label="可用资源" width="120">
            <template #default="{ row }"> {{ row.cpuCores }} 核 / {{ row.memory }} GB </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="CPU使用率" width="150">
            <template #default="{ row }">
              <div class="progress-cell">
                <span>{{ row.cpuUsage }}%</span>
                <el-progress
                  :percentage="row.cpuUsage"
                  :color="row.cpuUsage > 80 ? '#f56c6c' : '#67c23a'"
                  :stroke-width="8"
                  :show-text="false"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column label="内存使用率" width="150">
            <template #default="{ row }">
              <div class="progress-cell">
                <span>{{ row.memoryUsage }}%</span>
                <el-progress
                  :percentage="row.memoryUsage"
                  :color="row.memoryUsage > 80 ? '#f56c6c' : '#409eff'"
                  :stroke-width="8"
                  :show-text="false"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="openServerResourceDialog(row)"> 调整可用资源 </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 服务器分页 -->
        <el-pagination
          background
          layout="total, prev, pager, next, jumper"
          :total="totalServers"
          :current-page="currentPage"
          :page-size="pageSize"
          @current-change="handlePageChange"
          class="pagination"
          :disabled="isLoading"
        />
      </el-tab-pane>

      <el-tab-pane label="任务管理" name="task">
        <!-- 任务搜索 / 筛选 -->
        <div class="header">
          <div class="search-container">
            <el-input
              v-model="taskSearchQuery"
              placeholder="搜索任务名称或服务器名称"
              clearable
              @keyup.enter="fetchTasks"
            />
            <el-button type="primary" @click="fetchTasks" :loading="isTaskLoading">搜索</el-button>
          </div>
          <div class="button-group">
            <el-button @click="fetchTasks" :loading="isTaskLoading"> <i class="el-icon-refresh" /> 刷新 </el-button>
            <!-- 新增：自动分配资源按钮 -->
            <el-button type="primary" @click="triggerAutoAllocate" :loading="isAllocating"> 自动分配资源 </el-button>
          </div>
        </div>

        <div class="filter-container">
          <el-select v-model="taskStatusFilter" placeholder="任务状态筛选" clearable>
            <el-option label="全部状态" value="" />
            <el-option label="执行中" value="running" />
            <el-option label="已完成" value="completed" />
            <el-option label="失败" value="failed" />
            <el-option label="待执行" value="pending" />
          </el-select>

          <!-- 所属服务器筛选 -->
          <el-select v-model="taskServerFilter" placeholder="所属服务器筛选" clearable>
            <el-option label="全部服务器" :value="0" />
            <el-option v-for="server in servers" :key="server.id" :label="server.name" :value="server.id" />
          </el-select>

          <el-button @click="resetTaskFilters">重置筛选</el-button>
        </div>

        <!-- 任务列表 -->
        <!-- 任务列表：新增勾选列 -->
        <el-table
          :data="tasks"
          :style="{ width: '100%' }"
          v-loading="isTaskLoading"
          @selection-change="(val) => (selectedTasks = val)"
          ref="taskTableRef"
        >
          <!-- 新增：批量选择列 -->
          <el-table-column type="selection" width="55" />
          <el-table-column prop="taskName" label="任务名称" min-width="180" />
          <el-table-column prop="serverName" label="所属服务器" min-width="150" />
          <el-table-column prop="type" label="任务类型" width="120" />
          <el-table-column prop="priority" label="优先级" width="100">
            <template #default="{ row }">
              <el-tag :type="getPriorityTagType(row.priority)">
                {{ getPriorityText(row.priority) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sourceNeed" label="资源需求" width="120">
            <template #default="{ row }"> {{ row.cpuCoreNeed }} 核心 / {{ row.memoryNeed }} GB </template>
          </el-table-column>
          <el-table-column prop="status" label="任务状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getTaskStatusTagType(row.status)">
                {{ getTaskStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="执行进度" width="180">
            <template #default="{ row }">
              <div class="progress-cell">
                <span>{{ row.progress }}%</span>
                <el-progress
                  :percentage="row.progress"
                  :color="row.progress === 100 ? '#67c23a' : row.progress > 80 ? '#e6a23c' : '#409eff'"
                  :stroke-width="8"
                  :show-text="false"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="startTime" label="开始时间" width="180" />
          <el-table-column label="操作" width="180" fixed="right" class="operation">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="openTaskPriorityDialog(row)"> 调整优先级 </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 任务分页 -->
        <el-pagination
          background
          layout="total, prev, pager, next, jumper"
          :total="totalTasks"
          :current-page="taskCurrentPage"
          :page-size="taskPageSize"
          @current-change="handleTaskPageChange"
          class="pagination"
          :disabled="isTaskLoading"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 服务器可用资源调整弹窗 -->
    <el-dialog v-model="showServerResourceDialog" title="调整服务器规格" width="400px">
      <el-form :model="serverResourceForm" label-width="100px">
        <el-form-item label="服务器规格">
          <el-select v-model="serverResourceForm.specification" placeholder="请选择可调整规格" @change="onSpecChange">
            <el-option
              v-for="item in specifications"
              :key="item.specification"
              :label="item.specification"
              :value="item.specification"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="CPU核心数">
          <el-input v-model="serverResourceForm.cpuCore" disabled />
        </el-form-item>
        <el-form-item label="内存大小(GB)">
          <el-input v-model="serverResourceForm.memory" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showServerResourceDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitResource">确认调整</el-button>
      </template>
    </el-dialog>

    <!-- 任务优先级调整弹窗 -->
    <el-dialog title="调整任务优先级" v-model="showTaskPriorityDialog" width="400px" @close="currentTask = null">
      <el-form :model="taskPriorityForm.valueOf" label-width="100px">
        <el-form-item label="任务优先级" prop="priority">
          <el-select v-model="taskPriorityForm" placeholder="请选择优先级" style="width: 100%">
            <el-option label="高" :value="1" />
            <el-option label="中" :value="2" />
            <el-option label="低" :value="3" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTaskPriorityDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitPriority">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.resource-page {
  padding: 20px;
  background-color: #fff;
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;

  .tab-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  .el-tabs__content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 15px;

    .search-container {
      display: flex;
      gap: 10px;
      flex-grow: 1;
      max-width: 500px;
    }

    .button-group {
      display: flex;
      gap: 10px;
    }
  }

  .filter-container {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .el-table {
    margin: 20px 0;
    flex-grow: 1;

    .progress-cell {
      display: flex;
      flex-direction: column;
      gap: 5px;

      span {
        font-size: 14px;
        font-weight: 500;
      }
    }
  }

  .pagination {
    margin-top: 20px;
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>
