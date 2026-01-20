import router from "@/router"
import { useUserStoreHook } from "@/store/modules/user"
import { usePermissionStoreHook } from "@/store/modules/permission"
import { ElMessage } from "element-plus"
import { setRouteChange } from "@/hooks/useRouteListener"
import { useTitle } from "@/hooks/useTitle"
import { getToken } from "@/utils/cache/cookies"
import { fixBlankPage } from "@/utils/fix-blank-page"
import routeSettings from "@/config/route"
import isWhiteList from "@/config/white-list"
import NProgress from "nprogress"
import "nprogress/nprogress.css"
import { ref } from "vue"

/** 路由守卫，不建议改*/

const { setTitle } = useTitle()
NProgress.configure({ showSpinner: false })

const hasAddedDynamicRoutes = ref(false)

router.beforeEach(async (to, _from, next) => {
  fixBlankPage()
  NProgress.start()
  const userStore = useUserStoreHook()
  const permissionStore = usePermissionStoreHook()
  const token = getToken()
  console.log("当前路由：", to.path, "token：", token)

  //登出
  //userStore.logout()

  // 判断该用户是否已经登录
  if (!token) {
    // 如果在免登录的白名单中，则直接进入
    if (isWhiteList(to)) {
      next()
    } else {
      // 其他没有访问权限的页面将被重定向到登录页面
      NProgress.done()
      next("/login")
    }
    return
  }

  // 如果已经登录，并准备进入 Login 页面，则重定向到主页
  if (to.path === "/login") {
    NProgress.done()
    return next({ path: "/" })
  }

  // 如果用户已经获得其权限角色
  if (userStore.roles.length > 0 && hasAddedDynamicRoutes.value) {
    next()
    return
  }

  // 如果没有角色，设置默认角色并生成路由
  try {
    const roles = userStore.roles // 已经在 login 函数中设置了角色

    if (roles.length === 0) {
      // 如果没有角色，可以设置默认角色或者跳转到错误页面
      ElMessage.error("用户角色获取失败")
      userStore.resetToken()
      hasAddedDynamicRoutes.value = false
      NProgress.done()
      next("/login")
      return
    }

    // 如果开启动态路由
    if (routeSettings.async) {
      // 根据角色生成可访问的 Routes（可访问路由 = 常驻路由 + 有访问权限的动态路由）
      permissionStore.setRoutes(roles)
    } else {
      // 没有开启动态路由功能，则启用默认角色
      userStore.setRoles(routeSettings.defaultRoles)
      permissionStore.setRoutes(routeSettings.defaultRoles)
    }

    // 将'有访问权限的动态路由' 添加到 Router 中
    // 批量添加动态路由（仅执行一次）
    permissionStore.dynamicRoutes.forEach((route) => {
      if (!router.hasRoute(route.name!)) {
        // 避免重复添加报错
        router.addRoute(route)
      }
    })
    hasAddedDynamicRoutes.value = true
    // 确保添加路由已完成
    // 设置 replace: true, 因此导航将不会留下历史记录
    next({ ...to, replace: true })
  } catch (err: any) {
    // 过程中发生任何错误，都直接重置 Token，并重定向到登录页面
    userStore.resetToken()
    hasAddedDynamicRoutes.value = false
    ElMessage.error(err.message || "路由守卫过程发生错误")
    NProgress.done()
    next("/login")
  }
})

router.afterEach((to) => {
  setRouteChange(to)
  setTitle(to.meta.title)
  NProgress.done()
})
