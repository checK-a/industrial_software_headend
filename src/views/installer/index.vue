<template>
  <div class="component-page">
    <div class="batch-operation mb-4">
      <el-button type="primary" size="small" @click="handleBatchInstall" :disabled="selectedComponents.length === 0">
        批量下载选中组件
      </el-button>
      <el-button type="default" size="small" @click="clearSelection" :disabled="selectedComponents.length === 0">
        清空选中
      </el-button>
    </div>
    <el-table
      ref="componentTableRef"
      :data="components"
      style="width: 100%"
      v-loading="loading"
      element-loading-text="正在加载组件列表..."
      @selection-change="handleSelectionChange"
      row-key="id"
    >
      <!-- 新增勾选列 -->
      <el-table-column type="selection" width="55" :reserve-selection="true" />
      <el-table-column prop="name" label="组件名称" min-width="200">
        <template #default="scope">
          <div class="name-with-tooltip">
            <span>{{ scope.row.name }}</span>
            <el-tooltip
              class="ml-1"
              effect="dark"
              :content="scope.row.description"
              placement="top"
              popper-class="component-desc-tooltip"
            >
              <el-icon size="14" class="question-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="version" label="版本" width="100" />
      <el-table-column prop="size" label="安装包大小" width="120" />
      <el-table-column label="操作" :fixed="'right'">
        <template #default="scope">
          <el-button type="primary" size="small" @click="handleInstallComponent(scope.row)"> 下载 </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import { QuestionFilled } from "@element-plus/icons-vue"
import type { Component } from "@/api/installer/types"
import { getComponents } from "@/api/installer"
import { getLicenseRequestsByUserIdApi } from "@/api/license"
import { useUserStore } from "@/store/modules/user"
import type { ElTable } from "element-plus"

const userStore = useUserStore()
// 响应式数据
const components = ref<Component[]>([])
// 加载状态
const loading = ref(false)
// 是否有对应许可证申请
const hasLicenseApplication = ref(false)
// 标记是否已弹出过许可证警告
const licenseWarned = ref(false)
// 选中的组件列表
const selectedComponents = ref<Component[]>([])
// 表格实例 ref
const componentTableRef = ref<InstanceType<typeof ElTable> | null>(null)
// 定时器实例集合，用于管理所有批量下载的延时器
const batchDownloadTimers = ref<NodeJS.Timeout[]>([])
// 清理所有批量下载定时器
const clearBatchTimers = () => {
  batchDownloadTimers.value.forEach((timer) => clearTimeout(timer))
  batchDownloadTimers.value = []
}

const getLicenseStatus = async () => {
  try {
    const res = await getLicenseRequestsByUserIdApi(userStore.userId!, { status: "APPROVED" })
    hasLicenseApplication.value = res.data.total > 0
  } catch (err) {
    ElMessage.error("获取许可证状态失败")
    console.error("获取许可证状态失败：", err)
    hasLicenseApplication.value = false
  }
}
// 接口请求
const getComponentList = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const res = await getComponents()
    if (res.code === 200) {
      components.value = res.data || []
      console.log("获取组件列表成功：", res.data)
    } else {
      ElMessage.warning(res.message || "获取组件列表无数据")
    }
  } catch (err) {
    ElMessage.error("获取组件列表失败，请刷新重试")
    console.error("获取组件列表失败：", err)
  } finally {
    loading.value = false
  }
}

// 安装组件
const handleInstallComponent = async (row: Component) => {
  if (!hasLicenseApplication.value) {
    ElMessage.warning("您目前没有对应有效的许可证申请，请前往许可证管理页面查看，申请联系xx邮箱")
    return
  }
  if (row.address && row.address.trim()) {
    window.open(row.address, "_blank")
  } else {
    ElMessage.warning(`组件【${row.name}】暂无下载地址`)
  }
}

const handleSelectionChange = (val: Component[]) => {
  console.log("选中组件：", val)
  selectedComponents.value = val
}

// 批量下载组件
const handleBatchInstall = async () => {
  // 先清理旧的定时器，避免残留
  clearBatchTimers()

  if (!hasLicenseApplication.value) {
    ElMessage.warning("您目前没有对应有效的许可证申请，请前往许可证管理页面查看，申请联系xx邮箱")
    return
  }

  // 过滤有下载地址的组件
  const validComponents = selectedComponents.value.filter((item) => item.address && item.address.trim())
  console.log("有效下载地址组件：", validComponents)
  const invalidComponents = selectedComponents.value.filter((item) => !item.address || !item.address.trim())

  // 批量打开下载地址
  if (validComponents.length > 0) {
    ElMessageBox.confirm(`即将为您打开【${validComponents.length}】个组件的下载地址，是否继续？`, "批量下载确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "info"
    }).then(() => {
      validComponents.forEach((item, index) => {
        // 存储定时器实例
        const timer = setTimeout(() => {
          window.open(item.address, "_blank")
        }, 300 * index)
        batchDownloadTimers.value.push(timer)
      })
      // 提示无下载地址的组件
      if (invalidComponents.length > 0) {
        const invalidNames = invalidComponents.map((item) => item.name).join("、")
        ElMessage.warning(`以下组件暂无下载地址：${invalidNames}`)
      }
    })
  } else {
    ElMessage.warning("选中的组件均无有效下载地址")
  }
  clearSelection()
}

// 清空选中
const clearSelection = () => {
  clearBatchTimers()

  if (componentTableRef.value) {
    componentTableRef.value.clearSelection()
  }
  selectedComponents.value = []
}

// 页面加载时获取组件列表
onMounted(async () => {
  await getComponentList()
  await getLicenseStatus()
  if (!hasLicenseApplication.value && !licenseWarned.value) {
    ElMessage.warning("您目前没有对应有效的许可证申请，请前往许可证管理页面查看，申请联系xx邮箱")
    licenseWarned.value = true
  }
})

onUnmounted(() => {
  clearBatchTimers()
})
</script>

<style scoped lang="scss">
.component-page {
  width: 100%;
  margin: 20px auto;
  padding: 0 20px;
}
.el-table {
  margin: 20px 0;
  flex-grow: 1;
}
</style>
