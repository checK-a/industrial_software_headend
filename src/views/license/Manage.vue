<script setup lang="ts">
import { onMounted, ref } from "vue"
import { ElMessage, ElMessageBox } from "element-plus"
import type { UploadRequestOptions } from "element-plus"
import LicenseSearchForm from "./components/LicenseSearchForm.vue"
import LicenseTable from "./components/LicenseTable.vue"
import type {
  ApiResponse,
  LicenseRequestItem,
  LicenseRequestQuery,
  LicenseRequestSearchQuery,
  ModuleCategory,
  PageData
} from "@/api/license/types/license"
import {
  approveLicenseRequestApi,
  approveLicenseRequestMock,
  fillRequestDisplayNames,
  getLicenseRequestsApi,
  getLicenseRequestsMock,
  getModuleCategoriesApi,
  getModuleCategoriesMock,
  getModulesByCategoryApi,
  getModulesByCategoryMock,
  rejectLicenseRequestApi,
  rejectLicenseRequestMock,
  uploadLicenseFileApi,
  uploadLicenseFileMock
} from "@/api/license"
import {
  LICENSE_ALLOCATED_STATUS_OPTIONS,
  LICENSE_REQUEST_STATUS_LABELS,
  LICENSE_REQUEST_STATUS_OPTIONS,
  LICENSE_REQUEST_STATUS_TYPES,
  isAllocatedLicenseStatus
} from "@/constants/license"

const CATEGORY_FILTER_FETCH_SIZE = 1000

type RequestFetcher = (params: LicenseRequestQuery) => Promise<ApiResponse<PageData<LicenseRequestItem>>>

const categories = ref<ModuleCategory[]>([])

const requestQuery = ref<LicenseRequestSearchQuery>({
  pageNum: 1,
  pageSize: 10,
  moduleKeyword: "",
  categoryId: "",
  status: ""
})

const allocatedQuery = ref<LicenseRequestSearchQuery>({
  pageNum: 1,
  pageSize: 10,
  moduleKeyword: "",
  categoryId: "",
  status: ""
})

const requestRows = ref<LicenseRequestItem[]>([])
const allocatedRows = ref<LicenseRequestItem[]>([])
const requestTotal = ref(0)
const allocatedTotal = ref(0)

const requestLoading = ref(false)
const allocatedLoading = ref(false)
const requestErrorMessage = ref("")
const allocatedErrorMessage = ref("")

const uploadingRequestMap = ref<Record<string, boolean>>({})
const detailVisible = ref(false)
const selectedLicense = ref<LicenseRequestItem | null>(null)

const getRequestStatusLabel = (row: LicenseRequestItem) => {
  if (isAllocatedLicenseStatus(row.status) && !row.licenseNo) return "待上传"
  return LICENSE_REQUEST_STATUS_LABELS[row.status] || row.status
}

const getRequestStatusType = (row: LicenseRequestItem) => {
  if (isAllocatedLicenseStatus(row.status) && !row.licenseNo) return "warning"
  return LICENSE_REQUEST_STATUS_TYPES[row.status]
}

const loadCatalog = async () => {
  try {
    const response = await getModuleCategoriesApi()
    categories.value = response.data
  } catch {
    const mockResponse = await getModuleCategoriesMock()
    categories.value = mockResponse.data
  }

  await Promise.all(
    categories.value.map(async (category) => {
      try {
        await getModulesByCategoryApi(category.categoryId)
      } catch {
        await getModulesByCategoryMock(category.categoryId)
      }
    })
  )
}

const queryRequestList = async (
  query: LicenseRequestSearchQuery,
  fetcher: RequestFetcher,
  options: {
    recordFilter?: (item: LicenseRequestItem) => boolean
  } = {}
): Promise<{ records: LicenseRequestItem[]; total: number }> => {
  const shouldPaginateLocally = Boolean(query.categoryId) || Boolean(options.recordFilter)

  const response = await fetcher({
    moduleKeyword: query.moduleKeyword,
    status: query.status || undefined,
    page: shouldPaginateLocally ? 1 : query.pageNum,
    size: shouldPaginateLocally ? CATEGORY_FILTER_FETCH_SIZE : query.pageSize
  })

  let records = fillRequestDisplayNames(response.data.records)

  if (query.categoryId) {
    records = records.filter((item) => item.categoryId === query.categoryId)
  }

  if (options.recordFilter) {
    records = records.filter(options.recordFilter)
  }

  if (shouldPaginateLocally) {
    const start = (query.pageNum - 1) * query.pageSize
    const end = start + query.pageSize
    return {
      records: records.slice(start, end),
      total: records.length
    }
  }

  return {
    records,
    total: response.data.total
  }
}

const fetchRequests = async () => {
  requestLoading.value = true
  requestErrorMessage.value = ""
  try {
    const { records, total } = await queryRequestList(requestQuery.value, getLicenseRequestsApi)
    requestRows.value = records
    requestTotal.value = total
  } catch {
    requestErrorMessage.value = "加载申请记录失败，已切换到本地模拟数据。"
    const { records, total } = await queryRequestList(requestQuery.value, getLicenseRequestsMock)
    requestRows.value = records
    requestTotal.value = total
  } finally {
    requestLoading.value = false
  }
}

const fetchAllocatedRequests = async () => {
  allocatedLoading.value = true
  allocatedErrorMessage.value = ""

  const queryOptions = allocatedQuery.value.status
    ? undefined
    : {
        recordFilter: (item: LicenseRequestItem) => isAllocatedLicenseStatus(item.status)
      }

  try {
    const { records, total } = await queryRequestList(allocatedQuery.value, getLicenseRequestsApi, queryOptions)
    allocatedRows.value = records
    allocatedTotal.value = total
  } catch {
    allocatedErrorMessage.value = "加载已分配许可证失败，已切换到本地模拟数据。"
    const { records, total } = await queryRequestList(allocatedQuery.value, getLicenseRequestsMock, queryOptions)
    allocatedRows.value = records
    allocatedTotal.value = total
  } finally {
    allocatedLoading.value = false
  }
}

const handleRequestSearch = () => {
  requestQuery.value.pageNum = 1
  fetchRequests()
}

const handleRequestReset = () => {
  requestQuery.value = {
    pageNum: 1,
    pageSize: 10,
    moduleKeyword: "",
    categoryId: "",
    status: ""
  }
  fetchRequests()
}

const handleAllocatedSearch = () => {
  allocatedQuery.value.pageNum = 1
  fetchAllocatedRequests()
}

const handleAllocatedReset = () => {
  allocatedQuery.value = {
    pageNum: 1,
    pageSize: 10,
    moduleKeyword: "",
    categoryId: "",
    status: ""
  }
  fetchAllocatedRequests()
}

const handleRequestPageChange = (page: number) => {
  requestQuery.value.pageNum = page
  fetchRequests()
}

const handleAllocatedPageChange = (page: number) => {
  allocatedQuery.value.pageNum = page
  fetchAllocatedRequests()
}

const handleView = (requestId: string) => {
  selectedLicense.value = allocatedRows.value.find((item) => item.requestId === requestId) ?? null
  detailVisible.value = true
}

const mergeRow = (target: LicenseRequestItem, source: LicenseRequestItem) => {
  const [patched] = fillRequestDisplayNames([source])
  Object.assign(target, patched)
}

const handleApprove = async (row: LicenseRequestItem) => {
  try {
    await ElMessageBox.confirm("确认同意该申请？", "审批确认", {
      confirmButtonText: "同意",
      cancelButtonText: "取消",
      type: "warning"
    })
  } catch {
    return
  }

  try {
    const response = await approveLicenseRequestApi(row.requestId)
    if (response.code !== 200) {
      ElMessage.error(response.message || "审批失败")
      return
    }
    mergeRow(row, response.data)
    ElMessage.success("已同意申请，请上传许可证文件。")
    await fetchAllocatedRequests()
  } catch {
    try {
      const mockResponse = await approveLicenseRequestMock(row.requestId)
      mergeRow(row, mockResponse.data)
      ElMessage.success("已同意申请，请上传许可证文件。")
      await fetchAllocatedRequests()
    } catch {
      ElMessage.error("审批失败")
    }
  }
}

const handleReject = async (row: LicenseRequestItem) => {
  try {
    await ElMessageBox.confirm("确认拒绝该申请？", "审批确认", {
      confirmButtonText: "拒绝",
      cancelButtonText: "取消",
      type: "warning"
    })
  } catch {
    return
  }

  try {
    const response = await rejectLicenseRequestApi(row.requestId)
    if (response.code !== 200) {
      ElMessage.error(response.message || "拒绝失败")
      return
    }
    mergeRow(row, response.data)
    ElMessage.success("已拒绝该申请。")
    await fetchAllocatedRequests()
  } catch {
    try {
      const mockResponse = await rejectLicenseRequestMock(row.requestId)
      mergeRow(row, mockResponse.data)
      ElMessage.success("已拒绝该申请。")
      await fetchAllocatedRequests()
    } catch {
      ElMessage.error("拒绝失败")
    }
  }
}

const handleUploadRequest = async (row: LicenseRequestItem, options: UploadRequestOptions) => {
  uploadingRequestMap.value[row.requestId] = true
  try {
    const formData = new FormData()
    formData.append("file", options.file)

    const response = await uploadLicenseFileApi(row.requestId, formData)
    if (response.code !== 200) {
      ElMessage.error(response.message || "上传失败")
      options.onError?.(new Error(response.message || "upload failed"))
      return
    }

    mergeRow(row, response.data)
    ElMessage.success("许可证文件已上传。")
    options.onSuccess?.(response.data, options.file)
    await fetchAllocatedRequests()
  } catch (error) {
    try {
      const mockResponse = await uploadLicenseFileMock(row.requestId)
      mergeRow(row, mockResponse.data)
      ElMessage.success("许可证文件已上传。")
      options.onSuccess?.(mockResponse.data, options.file)
      await fetchAllocatedRequests()
    } catch (mockError) {
      ElMessage.error("上传失败")
      options.onError?.((mockError || error) as Error)
    }
  } finally {
    uploadingRequestMap.value[row.requestId] = false
  }
}

onMounted(async () => {
  await loadCatalog()
  await fetchRequests()
  await fetchAllocatedRequests()
})
</script>

<template>
  <div class="license-manage-page">
    <div class="page-header">
      <div>
        <h2 class="title">管理员许可证管理</h2>
        <p class="subtitle">统一使用 `/license/requests` 查询许可证申请和已分配记录。</p>
      </div>
    </div>

    <section class="section-card">
      <div class="section-header">
        <div>
          <h3 class="section-title">许可证申请记录</h3>
          <p class="section-desc">支持按模块关键字、分类和状态筛选，并可直接审批或上传许可证文件。</p>
        </div>
      </div>

      <LicenseSearchForm
        v-model="requestQuery"
        :categories="categories"
        :loading="requestLoading"
        :status-options="[...LICENSE_REQUEST_STATUS_OPTIONS]"
        status-label="申请状态"
        @search="handleRequestSearch"
        @reset="handleRequestReset"
      />

      <el-alert v-if="requestErrorMessage" :title="requestErrorMessage" type="warning" show-icon class="error-alert" />

      <el-table
        :data="requestRows"
        style="width: 100%"
        v-loading="requestLoading"
        row-key="requestId"
        empty-text="暂无申请记录"
      >
        <el-table-column prop="customerName" label="客户名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="macAddress" label="电脑 MAC 地址" min-width="170" show-overflow-tooltip />
        <el-table-column prop="userName" label="申请人" min-width="120" />
        <el-table-column prop="categoryName" label="模块类别" min-width="120" />
        <el-table-column prop="moduleName" label="模块名称" min-width="140" />
        <el-table-column label="使用期限" min-width="180">
          <template #default="{ row }">{{ row.validFrom }} ~ {{ row.validTo }}</template>
        </el-table-column>
        <el-table-column prop="usageCount" label="使用次数" min-width="100" />
        <el-table-column label="状态" min-width="150">
          <template #default="{ row }">
            <el-tag :type="getRequestStatusType(row)">
              {{ getRequestStatusLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="许可证编号" min-width="160">
          <template #default="{ row }">{{ row.licenseNo || "-" }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" min-width="120" />
        <el-table-column label="操作" width="240">
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING'">
              <el-button size="small" type="primary" @click="handleApprove(row)">同意</el-button>
              <el-button size="small" type="danger" @click="handleReject(row)">拒绝</el-button>
            </template>
            <template v-else-if="isAllocatedLicenseStatus(row.status) && !row.licenseNo">
              <el-upload
                :http-request="(options) => handleUploadRequest(row, options)"
                :show-file-list="false"
                :disabled="uploadingRequestMap[row.requestId]"
              >
                <el-button size="small" type="primary" :loading="uploadingRequestMap[row.requestId]">
                  上传许可证
                </el-button>
              </el-upload>
            </template>
            <span v-else class="muted">--</span>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        background
        layout="total, prev, pager, next, jumper"
        :total="requestTotal"
        :current-page="requestQuery.pageNum"
        :page-size="requestQuery.pageSize"
        :disabled="requestLoading"
        class="pagination"
        @current-change="handleRequestPageChange"
      />
    </section>

    <section class="section-card">
      <div class="section-header">
        <div>
          <h3 class="section-title">已分配许可证</h3>
          <p class="section-desc">默认显示 `VALID` 和 `OVERDUE` 两类记录，可按状态进一步筛选。</p>
        </div>
      </div>

      <LicenseSearchForm
        v-model="allocatedQuery"
        :categories="categories"
        :loading="allocatedLoading"
        :status-options="allocatedStatusOptions"
        status-label="分配状态"
        @search="handleAllocatedSearch"
        @reset="handleAllocatedReset"
      />

      <el-alert
        v-if="allocatedErrorMessage"
        :title="allocatedErrorMessage"
        type="warning"
        show-icon
        class="error-alert"
      />

      <LicenseTable :items="allocatedRows" :loading="allocatedLoading" @view="handleView" />

      <el-pagination
        background
        layout="total, prev, pager, next, jumper"
        :total="allocatedTotal"
        :current-page="allocatedQuery.pageNum"
        :page-size="allocatedQuery.pageSize"
        :disabled="allocatedLoading"
        class="pagination"
        @current-change="handleAllocatedPageChange"
      />
    </section>

    <el-dialog v-model="detailVisible" title="许可证详情" width="640px">
      <el-descriptions v-if="selectedLicense" :column="2" border>
        <el-descriptions-item label="申请编号">{{ selectedLicense.requestId }}</el-descriptions-item>
        <el-descriptions-item label="许可证编号">{{ selectedLicense.licenseNo || "-" }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ selectedLicense.userName }}</el-descriptions-item>
        <el-descriptions-item label="客户名称">{{ selectedLicense.customerName }}</el-descriptions-item>
        <el-descriptions-item label="模块类别">{{ selectedLicense.categoryName }}</el-descriptions-item>
        <el-descriptions-item label="模块名称">{{ selectedLicense.moduleName }}</el-descriptions-item>
        <el-descriptions-item label="MAC 地址">{{ selectedLicense.macAddress }}</el-descriptions-item>
        <el-descriptions-item label="使用次数">{{ selectedLicense.usageCount }}</el-descriptions-item>
        <el-descriptions-item label="使用期限">
          {{ selectedLicense.validFrom }} ~ {{ selectedLicense.validTo }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">{{ getRequestStatusLabel(selectedLicense) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.license-manage-page {
  min-height: calc(100vh - 60px);
  padding: 20px;
  background-color: #fff;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
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

.section-card {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid #eef2f7;
  border-radius: 12px;
  background-color: #fff;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  color: #111827;
}

.section-desc {
  margin: 4px 0 0;
  font-size: 13px;
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
