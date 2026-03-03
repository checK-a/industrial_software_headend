<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { ElMessage } from "element-plus"
import type { LicenseRequestItem } from "@/api/license/types/license"
import {
  downloadLicenseFileApi,
  downloadLicenseFileMock,
  fillRequestDisplayNames,
  getLicenseRequestsApi,
  getLicenseRequestsMock,
  getModuleCategoriesApi,
  getModuleCategoriesMock,
  getModulesByCategoryApi,
  getModulesByCategoryMock
} from "@/api/license"
import { LICENSE_REQUEST_STATUS_OPTIONS } from "@/constants/license"
import { useUserStoreHook } from "@/store/modules/user"

const userStore = useUserStoreHook()

const loading = ref(false)
const errorMessage = ref("")
const requests = ref<LicenseRequestItem[]>([])
const total = ref(0)
const query = ref({
  pageNum: 1,
  pageSize: 10
})

const statusLabelMap = computed(() =>
  LICENSE_REQUEST_STATUS_OPTIONS.reduce<Record<string, string>>((acc, item) => {
    acc[item.value] = item.label
    return acc
  }, {})
)

const statusTypeMap: Record<LicenseRequestItem["status"], "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger"
}

const currentUser = computed(() => userStore.username || "")

const loadCatalog = async () => {
  let categories: { categoryId: string }[] = []
  try {
    const response = await getModuleCategoriesApi()
    categories = response.data
  } catch (error) {
    const mockResponse = await getModuleCategoriesMock()
    categories = mockResponse.data
  }

  await Promise.all(
    categories.map(async (item) => {
      try {
        await getModulesByCategoryApi(item.categoryId)
      } catch {
        await getModulesByCategoryMock(item.categoryId)
      }
    })
  )
}

const applyUserFilterAndPage = (rows: LicenseRequestItem[]) => {
  const filteredRows = currentUser.value ? rows.filter((item) => item.userName === currentUser.value) : rows
  total.value = filteredRows.length

  const start = (query.value.pageNum - 1) * query.value.pageSize
  const end = start + query.value.pageSize
  requests.value = filteredRows.slice(start, end)
}

const fetchRequests = async () => {
  loading.value = true
  errorMessage.value = ""
  try {
    const response = await getLicenseRequestsApi({
      status: "APPROVED",
      page: 1,
      size: 1000
    })
    applyUserFilterAndPage(fillRequestDisplayNames(response.data.records))
  } catch (error) {
    errorMessage.value = "加载许可证列表失败，已切换到本地模拟数据。"
    const mockResponse = await getLicenseRequestsMock({
      status: "APPROVED",
      page: 1,
      size: 1000
    })
    applyUserFilterAndPage(fillRequestDisplayNames(mockResponse.data.records))
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  query.value.pageNum = page
  fetchRequests()
}

const handleDownload = async (row: LicenseRequestItem) => {
  const label = row.licenseNo ?? row.requestId
  const filename = `license-${label}.lic`
  try {
    const blob = await downloadLicenseFileApi(row.requestId)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success(`已开始下载许可证：${label}`)
  } catch (error) {
    try {
      const blob = await downloadLicenseFileMock(row.requestId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
      ElMessage.success(`已开始下载许可证：${label}`)
    } catch {
      ElMessage.error("下载失败")
    }
  }
}

onMounted(async () => {
  await loadCatalog()
  await fetchRequests()
})
</script>

<template>
  <div class="license-download-page">
    <div class="page-header">
      <div>
        <h2 class="title">许可证下载</h2>
        <p class="subtitle">查看当前用户已分配的许可证，并下载证书文件。</p>
      </div>
    </div>

    <el-alert v-if="errorMessage" :title="errorMessage" type="warning" show-icon class="error-alert" />

    <el-table :data="requests" style="width: 100%" v-loading="loading" row-key="requestId">
      <el-table-column prop="requestId" label="申请编号" min-width="140" />
      <el-table-column prop="categoryName" label="模块类别" min-width="120" />
      <el-table-column prop="moduleName" label="模块名称" min-width="140" />
      <el-table-column label="使用期限" min-width="180">
        <template #default="{ row }">{{ row.validFrom }} ~ {{ row.validTo }}</template>
      </el-table-column>
      <el-table-column prop="usageCount" label="使用次数" min-width="100" />
      <el-table-column label="状态" min-width="110">
        <template #default="{ row }">
          <el-tag :type="statusTypeMap[row.status]">
            {{ statusLabelMap[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="licenseNo" label="许可证编号" min-width="160">
        <template #default="{ row }">{{ row.licenseNo || "-" }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="申请时间" min-width="120" />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button v-if="row.status === 'APPROVED'" size="small" type="primary" @click="handleDownload(row)">
            下载
          </el-button>
          <span v-else class="muted">--</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      background
      layout="total, prev, pager, next, jumper"
      :total="total"
      :current-page="query.pageNum"
      :page-size="query.pageSize"
      @current-change="handlePageChange"
      class="pagination"
      :disabled="loading"
    />
  </div>
</template>

<style scoped lang="scss">
.license-download-page {
  padding: 20px;
  background-color: #fff;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.title {
  margin: 0;
  font-size: 20px;
}

.subtitle {
  margin: 6px 0 0;
  color: #6b7280;
}

.error-alert {
  margin-bottom: 16px;
}

.pagination {
  margin-top: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.muted {
  color: #9ca3af;
}
</style>
