<script lang="ts" setup>
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { storeToRefs } from "pinia"
import { useAppStore } from "@/store/modules/app"
import { useSettingsStore } from "@/store/modules/settings"
import { useUserStore } from "@/store/modules/user"
import { UserFilled } from "@element-plus/icons-vue"
import Hamburger from "../Hamburger/index.vue"
import Breadcrumb from "../Breadcrumb/index.vue"
import Sidebar from "../Sidebar/index.vue"
import Notify from "@/components/Notify/index.vue"
import ThemeSwitch from "@/components/ThemeSwitch/index.vue"
import Screenfull from "@/components/Screenfull/index.vue"
import SearchMenu from "@/components/SearchMenu/index.vue"
import { DeviceEnum } from "@/constants/app-key"
import { Member } from "@/api/organizationManagement/types/organization"
import { ElMessage, ElMessageBox } from "element-plus"
import {
  addMembersToOrganizationApi,
  getOrganizationMembersApi,
  getUnassignedMembersApi,
  removeMemberFromOrganizationApi,
  updateUserTaskPermissionApi
} from "@/api/organizationManagement"
import { PermissionUser } from "@/api/permission/types/userInfo"
import { getUserOrganizationApi } from "@/api/projectManagement/shared/projectManagement"

const router = useRouter()
const appStore = useAppStore()
const settingsStore = useSettingsStore()
const userStore = useUserStore()

const { sidebar, device } = storeToRefs(appStore)
const { layoutMode, showNotify, showThemeSwitch, showScreenfull, showSearchMenu } = storeToRefs(settingsStore)

const isTop = computed(() => layoutMode.value === "top")
const isMobile = computed(() => device.value === DeviceEnum.Mobile)

/** 切换侧边栏 */
const toggleSidebar = () => {
  appStore.toggleSidebar(false)
}

/** 登出 */
const logout = () => {
  userStore.logout()
  router.push("/login")
}
/** 跳转到个人中心页面 */
const goToPersonalCenter = () => {
  router.push("/personal-center")
}

const showOrgDialog = ref(false)
const currentOrgId = ref<string>()
const orgMembers = ref<Member[]>([])
const unassignedMembers = ref<Member[]>([])
const selectedUnassignedMembers = ref<string[]>([])
const showAddMemberDialog = ref(false)
const loadingMembers = ref(false)
const loadingUnassigned = ref(false)

const goToOrganizationManagement = () => {
  if (!currentOrgId.value) return
  showOrgDialog.value = true
  fetchOrgMembers(currentOrgId.value)
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
  } catch (error) {
    if ((error as Error).message !== "cancel") {
      console.error("成员移除失败:", error)
      ElMessage.error("成员移除失败")
    }
  }
}

// 打开添加成员对话框
const openAddMemberDialog = (orgId: string) => {
  currentOrgId.value = orgId
  showAddMemberDialog.value = true
  fetchUnassignedMembers()
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
    await updateUserTaskPermissionApi(currentOrgId.value!, row.userId, newPermission)
    ElMessage.success("权限修改成功")
    fetchOrgMembers(currentOrgId.value!)
    fetchUnassignedMembers()
  } catch (error) {
    if (error !== "cancel") {
      console.error("权限修改失败:", error)
      ElMessage.error("权限修改失败")
    }
  }
}

onMounted(async () => {
  if (userStore.token && userStore.taskPermission === 1) {
    const orgId = (await getUserOrganizationApi()).data.orgId.toString()
    currentOrgId.value = orgId
  }
})
</script>

<template>
  <div class="navigation-bar">
    <Hamburger v-if="!isTop || isMobile" :is-active="sidebar.opened" class="hamburger" @toggle-click="toggleSidebar" />
    <Breadcrumb v-if="!isTop || isMobile" class="breadcrumb" />
    <Sidebar v-if="isTop && !isMobile" class="sidebar" />
    <div class="right-menu">
      <SearchMenu v-if="showSearchMenu" class="right-menu-item" />
      <Screenfull v-if="showScreenfull" class="right-menu-item" />
      <ThemeSwitch v-if="showThemeSwitch" class="right-menu-item" />
      <Notify v-if="showNotify" class="right-menu-item" />
      <el-dropdown class="right-menu-item">
        <div class="right-menu-avatar">
          <el-avatar :icon="UserFilled" :size="30" />
          <span>{{ userStore.username }}</span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="goToPersonalCenter">
              <span style="display: block">个人中心</span>
            </el-dropdown-item>
            <el-dropdown-item v-if="userStore.taskPermission === 1" @click="goToOrganizationManagement">
              <span style="display: block">组织管理</span>
            </el-dropdown-item>
            <el-dropdown-item divided @click="logout">
              <span style="display: block">退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <!-- 组织管理对话框 -->
    <el-dialog v-model="showOrgDialog" title="组织管理" width="50%" top="5vh" :key="currentOrgId">
      <div class="org-management">
        <div class="member-list" v-if="userStore.taskPermission === 1 && currentOrgId">
          <h3>组织成员</h3>
          <el-button type="primary" size="small" @click="openAddMemberDialog(currentOrgId)">添加成员</el-button>
          <el-table :data="orgMembers" :style="{ width: '100%' }" v-loading="loadingMembers">
            <el-table-column prop="userName" label="用户名" />
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  @click="toggleUserOrganizationPermission(row)"
                  :disabled="row.orgId === ''"
                >
                  {{ row.taskPermission === 1 ? "撤销组管理员" : "设为组管理员" }}
                </el-button>
                <el-button type="danger" size="small" @click="removeMemberFromOrganization(row.userId)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
    <!-- 添加成员对话框 -->
    <el-dialog v-model="showAddMemberDialog" title="添加成员">
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
  </div>
</template>

<style lang="scss" scoped>
.navigation-bar {
  height: var(--v3-navigationbar-height);
  overflow: hidden;
  background: var(--v3-header-bg-color);
  display: flex;
  justify-content: space-between;
  .hamburger {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 15px;
    cursor: pointer;
  }
  .breadcrumb {
    flex: 1;
    // 参考 Bootstrap 的响应式设计将宽度设置为 576
    @media screen and (max-width: 576px) {
      display: none;
    }
  }
  .sidebar {
    flex: 1;
    // 设置 min-width 是为了让 Sidebar 里的 el-menu 宽度自适应
    min-width: 0px;
    :deep(.el-menu) {
      background-color: transparent;
    }
    :deep(.el-sub-menu) {
      &.is-active {
        .el-sub-menu__title {
          color: var(--el-menu-active-color) !important;
        }
      }
    }
  }
  .right-menu {
    margin-right: 10px;
    height: 100%;
    display: flex;
    align-items: center;
    color: #606266;
    .right-menu-item {
      padding: 0 10px;
      cursor: pointer;
      .right-menu-avatar {
        display: flex;
        align-items: center;
        .el-avatar {
          margin-right: 10px;
        }
        span {
          font-size: 16px;
        }
      }
    }
  }
}
</style>
