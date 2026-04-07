<script setup lang="ts">
import { ref, reactive, onMounted } from "vue"
import {
  ElTable,
  ElTableColumn,
  ElButton,
  ElInput,
  ElTag,
  ElPagination,
  ElMessage,
  ElMessageBox,
  ElDialog,
  ElForm,
  ElFormItem,
  ElTransfer,
  ElSelect,
  ElOption
} from "element-plus"
import { getUserPageApi, changePermissionApi, updateUserOrganizationApi } from "@/api/permission"
import {
  getOrganizationListApi,
  createOrganizationApi,
  getOrganizationMembersApi,
  addMembersToOrganizationApi,
  removeMemberFromOrganizationApi,
  getUnassignedMembersApi,
  updateUserTaskPermissionApi
} from "@/api/organizationManagement"
import type { PermissionUser } from "@/api/permission/types/userInfo"
import type { Organization, Member } from "@/api/organizationManagement/types/organization"

// 用户数据
const userData = ref<PermissionUser[]>([])
const totalUsers = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const searchQuery = ref("")
const isLoading = ref(false)
const paginationKey = ref(0)

// 组织数据
const organizations = ref<Organization[]>([])
const currentOrgId = ref<string | null>(null)
const orgMembers = ref<Member[]>([])
const unassignedMembers = ref<Member[]>([])
const selectedUnassignedMembers = ref<string[]>([])

// 对话框控制
const showOrgDialog = ref(false)
const showAddMemberDialog = ref(false)
const showCreateOrgDialog = ref(false)
const showEditOrgDialog = ref(false)
const loadingMembers = ref(false)
const loadingUnassigned = ref(false)

// 当前操作的用户
const currentUser = ref<PermissionUser | null>(null)

// 表单数据
const newOrgForm = reactive({
  orgName: "",
  description: ""
})

// 获取分页数据
const fetchUserData = async () => {
  if (isLoading.value) return

  isLoading.value = true
  try {
    const response = await getUserPageApi({
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchQuery.value.trim()
    })

    if (response.code === 200) {
      userData.value = response.data.records
      totalUsers.value = response.data.total
      paginationKey.value++
    } else {
      ElMessage.error(response.message || "获取用户信息失败")
    }
  } catch (error) {
    console.error("获取用户信息失败:", error)
    ElMessage.error("获取用户信息失败")
  } finally {
    isLoading.value = false
  }
}

// 获取组织列表
const fetchOrganizations = async () => {
  try {
    const response = await getOrganizationListApi({
      pageNum: 1,
      pageSize: 100,
      keyword: ""
    })

    if (response.code === 200) {
      organizations.value = response.data.records
    } else {
      ElMessage.error(response.message || "获取组织列表失败")
    }
  } catch (error) {
    console.error("获取组织列表失败:", error)
    ElMessage.error("获取组织列表失败")
  }
}

// 获取组织成员
const fetchOrgMembers = async (orgId: string) => {
  loadingMembers.value = true
  try {
    const response = await getOrganizationMembersApi(orgId, {
      pageNum: 1,
      pageSize: 100
    })

    if (response.code === 200) {
      orgMembers.value = response.data.records
      currentOrgId.value = orgId
    } else {
      ElMessage.error(response.message || "获取组织成员失败")
    }
  } catch (error) {
    console.error("获取组织成员失败:", error)
    ElMessage.error("获取组织成员失败")
  } finally {
    loadingMembers.value = false
  }
}

// 获取未分配成员
const fetchUnassignedMembers = async () => {
  loadingUnassigned.value = true
  try {
    const response = await getUnassignedMembersApi({
      pageNum: 1,
      pageSize: 100
    })

    if (response.code === 200) {
      unassignedMembers.value = response.data.records
    } else {
      ElMessage.error(response.message || "获取未分配成员失败")
    }
  } catch (error) {
    console.error("获取未分配成员失败:", error)
    ElMessage.error("获取未分配成员失败")
  } finally {
    loadingUnassigned.value = false
  }
}

// 创建组织
const createOrganization = async () => {
  try {
    const response = await createOrganizationApi(newOrgForm)

    if (response.code === 200) {
      ElMessage.success("组织创建成功")
      showCreateOrgDialog.value = false
      newOrgForm.orgName = ""
      newOrgForm.description = ""
      fetchOrganizations()
    } else {
      ElMessage.error(response.message || "组织创建失败")
    }
  } catch (error) {
    console.error("组织创建失败:", error)
    ElMessage.error("组织创建失败")
  }
}

// 添加成员到组织
const addMembersToOrganization = async () => {
  if (!currentOrgId.value) return

  try {
    const dto = {
      userIds: selectedUnassignedMembers.value
    }

    const response = await addMembersToOrganizationApi(currentOrgId.value, dto)

    if (response.code === 200) {
      ElMessage.success("成员添加成功")
      showAddMemberDialog.value = false
      selectedUnassignedMembers.value = []
      fetchOrgMembers(currentOrgId.value)
      fetchUnassignedMembers()
      fetchUserData()
    } else {
      ElMessage.error(response.message || "成员添加失败")
    }
  } catch (error) {
    console.error("成员添加失败:", error)
    ElMessage.error("成员添加失败")
  }
}

// 移除组织成员
const removeMemberFromOrganization = async (memberId: string) => {
  if (!currentOrgId.value) return

  try {
    await ElMessageBox.confirm("确定要移除该成员吗？", "移除确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    })

    await removeMemberFromOrganizationApi(currentOrgId.value, memberId)

    ElMessage.success("成员移除成功")
    fetchOrgMembers(currentOrgId.value)
    fetchUnassignedMembers()
    fetchUserData()
  } catch (error) {
    if ((error as Error).message !== "cancel") {
      console.error("成员移除失败:", error)
      ElMessage.error("成员移除失败")
    }
  }
}

// 修改权限
const toggleUserStatus = async (row: PermissionUser) => {
  try {
    await ElMessageBox.confirm(`确定要${row.permission === 1 ? "撤销" : "授予"}管理员权限吗？`, "权限修改确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    })

    const newPermission = row.permission === 1 ? 0 : 1
    await changePermissionApi(row.userId, newPermission)
    ElMessage.success("权限修改成功")
    fetchUserData()
  } catch (error) {
    if (error !== "cancel") {
      console.error("权限修改失败:", error)
      ElMessage.error("权限修改失败")
    }
  }
}

// 修改用户组织权限
const toggleUserOrganizationPermission = async (row: PermissionUser) => {
  try {
    await ElMessageBox.confirm(`确定要${row.taskPermission === 1 ? "撤销" : "授予"}组管理员权限吗？`, "权限修改确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    })

    const newPermission = row.taskPermission === 1 ? 0 : 1
    await updateUserTaskPermissionApi(row.orgId, row.userId, newPermission)
    ElMessage.success("权限修改成功")
    fetchUserData()
  } catch (error) {
    if (error !== "cancel") {
      console.error("权限修改失败:", error)
      ElMessage.error("权限修改失败")
    }
  }
}

// 分页处理
const handleCurrentChange = (newPage: number) => {
  if (currentPage.value === newPage) return
  currentPage.value = newPage
  fetchUserData()
}

// 搜索功能
const handleSearch = () => {
  if (currentPage.value === 1) {
    fetchUserData()
  } else {
    currentPage.value = 1
  }
}

// 打开组织管理对话框
const openOrgManagement = () => {
  showOrgDialog.value = true
  fetchOrganizations()
}

// 打开添加成员对话框
const openAddMemberDialog = (orgId: string) => {
  currentOrgId.value = orgId
  showAddMemberDialog.value = true
  fetchUnassignedMembers()
}

onMounted(() => {
  fetchUserData()
})

// 当前选中的组织ID
const selectedOrgId = ref<string>("")

// 打开修改组织对话框
const openEditOrgDialog = (user: PermissionUser) => {
  currentUser.value = user
  selectedOrgId.value = user.orgId || ""

  if (organizations.value.length === 0) {
    fetchOrganizations().then(() => {
      if (!selectedOrgId.value && organizations.value.length > 0) {
        selectedOrgId.value = organizations.value[0].orgId
      }
    })
  } else {
    if (!selectedOrgId.value && organizations.value.length > 0) {
      selectedOrgId.value = organizations.value[0].orgId
    }
  }

  showEditOrgDialog.value = true
}

// 修改组织
const updateUserOrganization = async (user: PermissionUser | null, newOrgId: string = "") => {
  if (!user) return

  try {
    await ElMessageBox.confirm(`确定要将用户分配到新组织吗？`, "组织修改确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    })

    const response = await updateUserOrganizationApi(user.userId, newOrgId)

    if (response.code === 200) {
      const newOrg = organizations.value.find((org) => org.orgId === newOrgId)
      if (newOrg) {
        user.organization = newOrg.orgName
        user.orgId = newOrgId
      }

      ElMessage.success("组织修改成功")
      fetchUserData()
      showEditOrgDialog.value = false

      if (showOrgDialog.value && currentOrgId.value) {
        fetchOrgMembers(currentOrgId.value)
        fetchUnassignedMembers()
      }
    } else {
      ElMessage.error(response.message || "组织修改失败")
    }
  } catch (error) {
    if ((error as Error).message !== "cancel") {
      console.error("组织修改失败:", error)
      ElMessage.error("组织修改失败")
    }
  }
}
</script>

<template>
  <div class="user-page">
    <div class="header">
      <div class="search-container">
        <el-input v-model="searchQuery" placeholder="请输入用户名" class="search-input" @keyup.enter="handleSearch" />
        <el-button type="primary" @click="handleSearch" :loading="isLoading">搜索</el-button>
        <el-button type="success" @click="openOrgManagement">组织管理</el-button>
      </div>
    </div>

    <el-table :data="userData" :style="{ width: '100%' }" v-loading="isLoading">
      <el-table-column prop="username" label="用户名" width="180" />
      <el-table-column prop="phone" label="手机号" width="200" />
      <el-table-column prop="permission" label="用户权限" width="150">
        <template #default="{ row }">
          <el-tag :type="row.permission === 1 ? 'success' : 'danger'">
            {{ row.permission === 1 ? "管理员" : row.taskPermission === 1 ? "组管理员" : "普通用户" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="organization" label="组织" width="200" />
      <el-table-column label="操作" width="300">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="toggleUserStatus(row)">
            {{ row.permission === 1 ? "撤销管理员" : "设为管理员" }}
          </el-button>
          <el-button
            type="primary"
            size="small"
            @click="toggleUserOrganizationPermission(row)"
            :disabled="row.orgId === ''"
          >
            {{ row.taskPermission === 1 ? "撤销组管理员" : "设为组管理员" }}
          </el-button>
          <el-button size="small" type="info" @click="openEditOrgDialog(row)">修改组织</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      :key="paginationKey"
      background
      layout="total, prev, pager, next, jumper"
      :total="totalUsers"
      :current-page="currentPage"
      :page-size="pageSize"
      @current-change="handleCurrentChange"
      class="pagination"
      :disabled="isLoading"
    />

    <!-- 组织管理对话框 -->
    <el-dialog v-model="showOrgDialog" title="组织管理" width="80%" top="5vh" :key="currentOrgId || ''">
      <div class="org-management">
        <div class="org-list">
          <div class="org-header">
            <h3>组织列表</h3>
            <el-button type="primary" size="small" @click="showCreateOrgDialog = true">新建组织</el-button>
          </div>
          <el-table :data="organizations" :style="{ width: '100%' }">
            <el-table-column prop="orgName" label="组织名称" />
            <el-table-column prop="creator" label="创建人" />
            <el-table-column prop="createTime" label="创建时间" />
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button size="small" @click="fetchOrgMembers(row.orgId)">查看成员</el-button>
                <el-button type="primary" size="small" @click="openAddMemberDialog(row.orgId)">添加成员</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="member-list" v-if="currentOrgId">
          <h3>组织成员</h3>
          <el-table :data="orgMembers" :style="{ width: '100%' }" v-loading="loadingMembers">
            <el-table-column prop="userName" label="用户名" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="danger" size="small" @click="removeMemberFromOrganization(row.userId)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>

    <!-- 修改组织对话框 -->
    <el-dialog v-model="showEditOrgDialog" title="修改用户组织" width="500px">
      <div v-if="currentUser">
        <p>用户名: {{ currentUser.username }}</p>
        <p>当前组织: {{ currentUser.organization || "无" }}</p>

        <el-select v-model="selectedOrgId" placeholder="请选择新组织" style="width: 100%; margin-top: 15px" clearable>
          <el-option v-for="org in organizations" :key="org.orgId" :label="org.orgName" :value="org.orgId" />
        </el-select>
      </div>

      <template #footer>
        <el-button @click="showEditOrgDialog = false">取消</el-button>
        <el-button type="primary" @click="updateUserOrganization(currentUser, selectedOrgId)"> 确定 </el-button>
      </template>
    </el-dialog>

    <!-- 添加成员对话框 -->
    <el-dialog v-model="showAddMemberDialog" title="添加成员" width="600px">
      <el-transfer
        v-model="selectedUnassignedMembers"
        :data="unassignedMembers.map((m) => ({ key: m.userId, label: m.userName }))"
        :titles="['未分配成员', '已选择']"
        v-loading="loadingUnassigned"
      />
      <template #footer>
        <el-button @click="showAddMemberDialog = false">取消</el-button>
        <el-button type="primary" @click="addMembersToOrganization">确定</el-button>
      </template>
    </el-dialog>

    <!-- 创建组织对话框 -->
    <el-dialog v-model="showCreateOrgDialog" title="新建组织" width="500px">
      <el-form :model="newOrgForm" label-width="80px">
        <el-form-item label="组织名称">
          <el-input v-model="newOrgForm.orgName" placeholder="请输入组织名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="newOrgForm.description" type="textarea" placeholder="请输入组织描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateOrgDialog = false">取消</el-button>
        <el-button type="primary" @click="createOrganization">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.user-page {
  padding: 20px;
  background-color: #fff;
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
}

.header {
  margin-bottom: 20px;
}

.search-container {
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 800px;
}

.el-table {
  margin: 20px 0;
  flex-grow: 1;
}

.pagination {
  margin-top: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.org-management {
  display: flex;
  gap: 20px;

  .org-list {
    flex: 1;
  }

  .member-list {
    flex: 1;
  }
}

.org-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
</style>
