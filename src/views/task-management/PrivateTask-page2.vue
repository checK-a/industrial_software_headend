<template>
  <div class="task-page">
    <!-- 导航 -->
    <div class="breadcrumb">
      <router-link to="/task-management/private">/私有项目</router-link>
      <span>/任务</span>
    </div>
    <!-- 搜索框、搜索按钮和新建任务按钮 -->
    <div class="header">
      <div class="search-container">
        <el-input v-model="searchQuery" placeholder="请输入任务名称" class="search-input" @keyup.enter="handleSearch" />
        <el-button type="primary" @click="handleSearch" :loading="isLoading">搜索</el-button>
      </div>
      <el-button type="primary" @click="createTaskDialogVisible = true">新建任务</el-button>
    </div>
    <!-- 任务列表表格 -->
    <el-table :data="taskData" :style="{ width: '100%' }" v-loading="isLoading">
      <el-table-column prop="task_name" label="任务名称" min-width="150" />
      <el-table-column prop="creator" label="创建者" width="100" />
      <el-table-column prop="simulationStage" label="仿真阶段" width="100" />
      <el-table-column prop="type" label="类型" width="100" />
      <!-- 缩短计算资源列宽度 -->
      <el-table-column v-if="showComputeResourceColumn" label="计算资源" width="100">
        <template #default="{ row }">
          <span>{{ row.computerResource || "-" }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="creation_time" label="创建时间" width="150" />
      <el-table-column prop="status" label="当前状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <!-- 增加操作列宽度 -->
      <el-table-column label="操作" width="280">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button
              size="small"
              @click="startTask(row)"
              :loading="row.startLoading"
              :disabled="row.status !== '未启动'"
            >
              开始
            </el-button>
            <!-- <el-button
              size="small"
              type="danger"
              @click="stopTask(row)"
              :loading="row.stopLoading"
              :disabled="row.status === '未启动'"
            >
              结束
            </el-button> -->
            <el-button size="small" type="danger" @click="deleteTask(row)" :loading="row.deleteLoading">
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <!-- 分页 -->
    <el-pagination
      :key="paginationKey"
      background
      layout="total, prev, pager, next, jumper"
      :total="totalTasks"
      :current-page="currentPage"
      :page-size="pageSize"
      @current-change="handlePageChange"
      class="pagination"
      :disabled="isLoading"
    />

    <!-- 新建任务对话框 -->
    <el-dialog title="新建任务" v-model="createTaskDialogVisible" width="500px">
      <el-form ref="taskFormRef" :model="taskForm" :rules="taskRules" label-width="auto">
        <el-form-item label="任务名称" prop="task_name">
          <el-input v-model="taskForm.task_name" />
        </el-form-item>
        <el-form-item label="仿真阶段" prop="simulationStage">
          <el-select v-model="taskForm.simulationStage" placeholder="请选择仿真阶段">
            <el-option label="前处理" value="前处理" />
            <el-option label="后处理" value="后处理" />
            <el-option label="求解器" value="求解器" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="taskForm.type" placeholder="请选择类型">
            <template v-if="taskForm.simulationStage === '前处理'">
              <el-option label="多体" value="多体" />
              <el-option label="结构" value="结构" />
              <el-option label="冲击" value="冲击" />
            </template>
            <template v-else-if="taskForm.simulationStage === '后处理'">
              <el-option label="通用后处理" value="通用后处理" />
              <el-option label="多体" value="多体" />
            </template>
            <template v-else-if="taskForm.simulationStage === '求解器'">
              <el-option label="多体" value="多体" />
              <el-option label="结构" value="结构" />
              <el-option label="冲击GPU" value="冲击GPU" />
              <el-option label="冲击CPU" value="冲击CPU" />
            </template>
          </el-select>
        </el-form-item>
        <el-form-item label="创建者">
          <el-input v-model="taskForm.creator" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createTaskDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreateTask">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import {
  ElTable,
  ElTableColumn,
  ElButton,
  ElInput,
  ElPagination,
  ElTag,
  ElDialog,
  ElForm,
  ElFormItem,
  ElSelect,
  ElOption,
  ElMessage,
  ElMessageBox
} from "element-plus"
import { getUserInfoApi } from "@/api/userInfo"
import {
  getTasksByProjectIdApi,
  createTaskApi,
  deleteTaskApi,
  startTaskApi
  // stopTaskApi
} from "@/api/projectManagement/private/taskManagement"
import type { task } from "@/api/projectManagement/private/taskManagement/types/taskManagement"

const route = useRoute()
const router = useRouter()

const projectId = ref(route.params.projectId as string)

// 任务数据
const taskData = ref<task[]>([])
const isLoading = ref(false)
const paginationKey = ref(0)

// 计算属性：是否显示计算资源列
const showComputeResourceColumn = computed(() => {
  return taskData.value.some((task) => task.simulationStage === "求解器" && task.type === "冲击")
})

// 分页配置
const totalTasks = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索框的绑定值
const searchQuery = ref("")

// 新建任务对话框
const createTaskDialogVisible = ref(false)
const taskFormRef = ref()
const taskForm = ref({
  task_name: "",
  simulationStage: "",
  type: "",
  creator: ""
})
const taskRules = ref({
  task_name: [{ required: true, message: "任务名称不能为空", trigger: "blur" }],
  simulationStage: [{ required: true, message: "请选择仿真阶段", trigger: "change" }],
  type: [{ required: true, message: "请选择类型", trigger: "change" }]
})

// 获取分页任务数据
const fetchTasks = async (forceUpdate = false) => {
  if (isLoading.value && !forceUpdate) return

  console.log("当前搜索关键词:", searchQuery.value)

  isLoading.value = true
  try {
    const response = await getTasksByProjectIdApi(Number(projectId.value), {
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchQuery.value
    })
    if (response.code === 200) {
      taskData.value = response.data.records.map((task) => ({
        ...task,
        computeResource: task.computeResource || "",
        // 添加按钮加载状态
        startLoading: false,
        stopLoading: false,
        deleteLoading: false
      }))
      totalTasks.value = response.data.total
      paginationKey.value++
    } else {
      ElMessage.error(response.message || "获取任务列表失败")
    }
  } catch (error) {
    console.error("获取任务列表失败:", error)
    ElMessage.error("获取任务列表失败")
  } finally {
    isLoading.value = false
  }
}

// 搜索功能
const handleSearch = () => {
  if (currentPage.value === 1) {
    fetchTasks(true)
  } else {
    currentPage.value = 1
  }
}

// 新建任务
const handleCreateTask = async () => {
  await taskFormRef.value?.validate(async (valid: any) => {
    if (!valid) {
      ElMessage.error("请填写完整信息")
      return
    }

    try {
      // 准备基础数据
      const baseData = {
        taskName: taskForm.value.task_name,
        simulationStage: taskForm.value.simulationStage,
        type: taskForm.value.type,
        creator: taskForm.value.creator
      }

      // 从类型中提取计算资源信息
      let computeResource = ""
      if (taskForm.value.type === "冲击GPU") {
        baseData.type = "冲击"
        computeResource = "GPU"
      } else if (taskForm.value.type === "冲击CPU") {
        baseData.type = "冲击"
        computeResource = "CPU"
      }

      // 准备请求数据
      const requestData = computeResource ? { ...baseData, computeResource } : baseData

      const response = await createTaskApi(Number(projectId.value), requestData)

      if (response.code === 200) {
        ElMessage.success("任务创建成功")
        await fetchTasks(true)
        createTaskDialogVisible.value = false

        // 重置表单
        taskFormRef.value?.resetFields()
      } else {
        ElMessage.error(response.message || "任务创建失败")
      }
    } catch (error) {
      console.error("新建任务失败:", error)
      ElMessage.error("新建任务失败")
    }
  })
}

// 删除任务
const deleteTask = async (row: any) => {
  try {
    await ElMessageBox.confirm("确定要删除该任务吗？", "警告", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning"
    })

    row.deleteLoading = true
    const response = await deleteTaskApi(row.taskId)
    if (response.code === 200) {
      ElMessage.success("任务删除成功")
      await fetchTasks(true)
    } else {
      ElMessage.error(response.message || "任务删除失败")
    }
  } catch (error) {
    if ((error as Error).message !== "cancel") {
      console.error("任务删除失败:", error)
      ElMessage.error("任务删除失败")
    }
  } finally {
    row.deleteLoading = false
  }
}

// 开始任务
const startTask = async (row: any) => {
  try {
    row.startLoading = true

    //调用开始任务API
    const response = await startTaskApi(row.taskId)
    if (response.code === 200) {
      ElMessage.success("任务已开始")

      // 检查是否需要计算资源
      const needsComputeResource = row.simulationStage === "求解器" && row.type === "冲击" && row.computeResource

      // 准备路由参数
      const routeParams = {
        query: {
          taskType: row.type,
          // 安全添加计算资源参数
          ...(needsComputeResource ? { computeResource: row.computeResource } : {})
        }
      }

      switch (row.simulationStage) {
        case "前处理":
          router.push({ path: "/simulation/pre-processing", ...routeParams })
          break
        case "后处理":
          router.push({ path: "/simulation/post-processing", ...routeParams })
          break
        case "求解器":
          router.push({ path: "/simulation/solver", ...routeParams })
          break
        default:
          ElMessage.warning("未知的仿真阶段类型")
      }
    } else {
      ElMessage.error(response.message || "开始任务失败")
    }
  } catch (error) {
    console.error("开始任务失败:", error)
    ElMessage.error("开始任务失败")
  } finally {
    row.startLoading = false
  }
}

// 结束任务
// const stopTask = async (row: any) => {
//   try {
//     row.stopLoading = true

//     // 实际API调用应在此处
//     const response = await stopTaskApi(row.taskId)
//     if (response.code === 200) {
//       row.status = "已结束"
//       ElMessage.success("任务已结束")
//     } else {
//       ElMessage.error(response.message || "结束任务失败")
//     }
//   } catch (error) {
//     console.error("结束任务失败:", error)
//     ElMessage.error("结束任务失败")
//   } finally {
//     row.stopLoading = false
//   }
// }

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  if (status === "未启动") {
    return "info"
  } else if (status === "仿真中") {
    return "success"
  } else if (status === "已结束") {
    return "danger"
  }
  return ""
}

// 处理分页变化
const handlePageChange = (page: number) => {
  if (currentPage.value === page) return
  currentPage.value = page
  fetchTasks()
}

// 初始化
onMounted(async () => {
  try {
    const userResponse = await getUserInfoApi()
    taskForm.value.creator = userResponse.data.username
  } catch (error) {
    console.error("获取用户信息失败:", error)
    ElMessage.error("获取用户信息失败")
  }
  await fetchTasks()
})
</script>

<style scoped lang="scss">
.task-page {
  padding: 20px;
  background-color: #fff;
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.search-container {
  display: flex;
  gap: 10px;
  width: 400px;
}

.pagination {
  margin-top: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.el-table {
  margin: 20px 0;
  flex-grow: 1;
}

.action-buttons {
  display: flex;
  flex-wrap: nowrap; /* 确保按钮不换行 */
  gap: 5px; /* 按钮间距 */
}
</style>
