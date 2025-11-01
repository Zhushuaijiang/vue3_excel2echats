<template>
  <el-container class="main-layout">
    <el-aside width="200px" class="sidebar">
      <div class="logo">
        <h2>航空货运分析</h2>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <span>数据看板</span>
        </el-menu-item>
        <el-menu-item index="/config">
          <el-icon><Setting /></el-icon>
          <span>表单配置</span>
        </el-menu-item>
        <el-menu-item index="/data-entry">
          <el-icon><Edit /></el-icon>
          <span>数据录入</span>
        </el-menu-item>
        <el-menu-item index="/bigscreen">
          <el-icon><Monitor /></el-icon>
          <span>大屏展示</span>
        </el-menu-item>
        <el-menu-item index="/ai-templates">
          <el-icon><MagicStick /></el-icon>
          <span>AI模板</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-main class="main-content">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { HomeFilled, Setting, Edit, Monitor, MagicStick } from '@element-plus/icons-vue'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  overflow-y: auto;
}

.logo {
  padding: 20px;
  text-align: center;
  background-color: #2b3e50;
}

.logo h2 {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

.main-content {
  padding: 20px;
  background-color: #f5f5f5;
  overflow-y: auto;
}

:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
}

:deep(.el-menu-item.is-active) {
  background-color: #1890ff !important;
}
</style>

