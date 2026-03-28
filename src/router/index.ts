import { type RouteRecordRaw, createRouter, createWebHashHistory } from "vue-router"

const Layouts = () => import("@/layouts/index.vue")

/**
 * 常驻路由
 * 除了 redirect/403/404/login 等隐藏页面，其他页面建议设置 Name 属性
 */
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: "/login",
    component: () => import("@/views/login/index.vue"),
    meta: {
      hidden: true
    }
  },
  {
    path: "/register",
    component: () => import("@/views/register/index.vue"),
    meta: {
      hidden: true
    }
  },
  {
    path: "/",
    component: Layouts,
    redirect: "/task-management/shared",
    meta: { title: "用户功能", svgIcon: "dashboard" },
    children: [
      {
        path: "task-management",
        name: "TaskManagement",
        meta: { title: "项目管理", svgIcon: "task-management" },
        children: [
          {
            path: "shared",
            name: "SharedTaskPage1",
            component: () => import("@/views/task-management/SharedTask-page1.vue"),
            meta: { title: "共享项目" }
          },
          {
            path: "shared/:projectId",
            name: "SharedTaskPage2",
            component: () => import("@/views/task-management/SharedTask-page2.vue"),
            meta: {
              title: "任务",
              hidden: true
            }
          },
          {
            path: "private",
            name: "PrivateTaskPage1",
            component: () => import("@/views/task-management/PrivateTask-page1.vue"),
            meta: { title: "私有项目" }
          },
          {
            path: "private/:projectId",
            name: "PrivateTaskPage2",
            component: () => import("@/views/task-management/PrivateTask-page2.vue"),
            meta: {
              title: "任务",
              hidden: true
            }
          }
        ]
      },
      {
        path: "data-management",
        component: () => import("@/views/data-management/index.vue"),
        name: "DataManagement",
        meta: { title: "数据管理", svgIcon: "data-management" }
      },
      {
        path: "simulation",
        name: "Simulation",
        meta: { title: "仿真", svgIcon: "simulation" },
        children: [
          {
            path: "pre-processing",
            component: () => import("@/views/simulation/PreProcessing.vue"),
            name: "PreProcessing",
            meta: { title: "前处理模块" }
          },
          {
            path: "solver",
            component: () => import("@/views/simulation/Solver.vue"),
            name: "Solver",
            meta: { title: "求解器" }
          },
          {
            path: "post-processing",
            component: () => import("@/views/simulation/PostProcessing.vue"),
            name: "PostProcessing",
            meta: { title: "后处理模块" }
          }
        ]
      },
      {
        path: "monitoring",
        name: "Monitoring",
        component: () => import("@/views/monitoring/index.vue"),
        meta: {
          title: "监控",
          svgIcon: "monitoring"
        }
      },
      // {
      //   path: "resource-management",
      //   component: () => import("@/views/monitoring/ResourceManagement.vue"),
      //   name: "ResourceManagement",
      //   meta: {
      //     title: "计算资源管理",
      //     svgIcon: "resource",
      //     hidden: true
      //   }
      // },
      {
        path: "/installer",
        component: () => import("@/views/installer/index.vue"),
        name: "Installer",
        meta: { title: "组件安装包管理" }
      },
      {
        path: "personal-center",
        component: () => import("@/views/personal-center/index.vue"),
        name: "PersonalCenter",
        meta: { title: "个人中心", svgIcon: "personal-center", hidden: true }
      }
    ]
  },
  {
    path: "/redirect",
    component: Layouts,
    meta: {
      hidden: true
    }
  },
  {
    path: "/403",
    component: () => import("@/views/error-page/403.vue"),
    meta: {
      hidden: true
    }
  },
  {
    path: "/404",
    component: () => import("@/views/error-page/404.vue"),
    meta: {
      hidden: true
    },
    alias: "/:pathMatch(.*)*"
  }
]

/**
 * 动态路由
 * 用来放置有权限 Roles 属性的路由
 * 必须带有 Name 属性
 */
export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: "/license",
    component: Layouts,
    redirect: "/license/apply",
    name: "License",
    meta: { title: "许可证管理", svgIcon: "component" },
    children: [
      {
        path: "apply",
        component: () => import("@/views/license/Apply.vue"),
        name: "LicenseApply",
        meta: {
          title: "许可证申请",
          roles: ["admin", "user"]
        }
      },
      {
        path: "download",
        component: () => import("@/views/license/Download.vue"),
        name: "LicenseDownload",
        meta: {
          title: "许可证下载",
          roles: ["admin", "user"]
        }
      },
      {
        path: "manage",
        component: () => import("@/views/license/Manage.vue"),
        name: "LicenseManagement",
        meta: {
          title: "管理员许可证管理",
          roles: ["admin"]
        }
      }
    ]
  },
  {
    path: "/admin",
    component: Layouts,
    redirect: "permission-management",
    name: "Management",
    meta: { title: "管理员功能", svgIcon: "dashboard", affix: true, roles: ["admin"] },
    children: [
      {
        path: "permission-management",
        component: () => import("@/views/permission-management/index.vue"),
        name: "PermissionManagement",
        meta: {
          title: "权限管理",
          roles: ["admin"],
          svgIcon: "permission-management"
        }
      },
      {
        path: "user-management",
        component: () => import("@/views/user-management/index.vue"),
        name: "UserManagement",
        meta: {
          title: "用户信息管理",
          roles: ["admin"],
          svgIcon: "user-management"
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes: [...constantRoutes, ...asyncRoutes]
})

/** 重置路由 */
/* export function resetRouter() {
  // 注意：所有动态路由必须带有 Name 属性，否则可能不能完全重置干净
  try {
    router.getRoutes().forEach((route) => {
      const { name, meta } = route
      if (name && meta.roles?.length) {
        router.hasRoute(name) && router.removeRoute(name)
      }
    })
  } catch {
    window.location.reload()
  }
} */

const removeRouteTree = (routes: RouteRecordRaw[]) => {
  routes.forEach((route) => {
    if (route.children?.length) {
      removeRouteTree(route.children)
    }
    if (route.name && router.hasRoute(route.name)) {
      router.removeRoute(route.name)
    }
  })
}

export function resetRouter() {
  try {
    // 1. 递归移除整棵动态路由树，避免父路由残留导致重新登录后子路由无法恢复
    removeRouteTree(asyncRoutes)
    // 2. 重置路由配置为初始常驻路由
    const initialRoutes = constantRoutes
    router.options.routes = initialRoutes
    console.log("路由重置完成")
  } catch (err) {
    console.error("路由重置失败:", err)
    window.location.reload()
  }
}

export default router
