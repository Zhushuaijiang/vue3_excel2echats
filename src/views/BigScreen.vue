<template>
  <div class="bigscreen-container">
    <div class="bigscreen-toolbar">
      <div class="toolbar-left">
        <el-button type="primary" @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏显示' }}
        </el-button>
        <el-button @click="showConfigDialog = true">配置大屏</el-button>
        <el-button @click="showAIGenerateDialog = true">AI生成</el-button>
        <el-button @click="saveLayout" type="success">保存布局</el-button>
      </div>
      <div class="toolbar-right">
        <el-radio-group v-model="refreshInterval" @change="updateRefresh">
          <el-radio-button label="30">30秒</el-radio-button>
          <el-radio-button label="60">1分钟</el-radio-button>
          <el-radio-button label="300">5分钟</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    
    <div class="bigscreen-content" ref="bigscreenRef">
      <div
        v-for="widget in widgets"
        :key="widget.id"
        class="bigscreen-widget"
        :style="{
          left: widget.x + '%',
          top: widget.y + '%',
          width: widget.w + '%',
          height: widget.h + '%'
        }"
      >
        <div class="widget-header" @mousedown="startDrag(widget, $event)">
          <span>{{ widget.title }}</span>
          <div>
            <el-button
              text
              size="small"
              @click="editWidgetSize(widget)"
            >
              <el-icon><FullScreen /></el-icon>
            </el-button>
            <el-button
              text
              size="small"
              @click="removeWidget(widget.id)"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </div>
        <div class="widget-content">
          <div class="widget-info" v-if="widget.dataSource">
            <span class="info-tag">来源: {{ widget.dataSource }}</span>
            <span class="info-tag" v-if="widget.dimension">维度: {{ widget.dimension }}</span>
          </div>
          <v-chart :option="widget.option" style="height: 100%" />
        </div>
      </div>
    </div>

    <!-- 大屏配置对话框 -->
    <el-dialog v-model="showConfigDialog" title="大屏配置" width="800px">
      <div class="widget-list">
        <div
          v-for="widget in availableWidgets"
          :key="widget.id"
          class="widget-item"
          draggable="true"
          @dragstart="handleDragStart($event, widget)"
        >
          <el-icon><component :is="widget.icon" /></el-icon>
          <span>{{ widget.title }}</span>
        </div>
      </div>
      <div class="drop-zone" @drop="handleDrop" @dragover.prevent>
        拖拽组件到这里配置大屏
      </div>
    </el-dialog>

    <!-- 编辑组件大小对话框 -->
    <el-dialog v-model="editSizeDialogVisible" title="调整组件大小" width="400px">
      <el-form :model="{ width: widgetWidth, height: widgetHeight }" label-width="100px">
        <el-form-item label="宽度 (%)">
          <el-input-number 
            v-model="widgetWidth" 
            :min="10" 
            :max="100" 
            style="width: 100%"
          />
          <div style="color: #999; font-size: 12px; margin-top: 5px">
            当前组件位置: X={{ editingWidget?.x || 0 }}%, 最大可用宽度: {{ Math.max(0, 100 - (editingWidget?.x || 0)) }}%
          </div>
        </el-form-item>
        <el-form-item label="高度 (%)">
          <el-input-number 
            v-model="widgetHeight" 
            :min="10" 
            :max="100" 
            style="width: 100%"
          />
          <div style="color: #999; font-size: 12px; margin-top: 5px">
            当前组件位置: Y={{ editingWidget?.y || 0 }}%, 最大可用高度: {{ Math.max(0, 100 - (editingWidget?.y || 0)) }}%
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editSizeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSizeChange">确认</el-button>
      </template>
    </el-dialog>
    
    <!-- AI生成对话框 -->
    <el-dialog v-model="showAIGenerateDialog" title="AI生成大屏" width="600px">
      <el-form :model="aiForm" label-width="100px">
        <el-form-item label="AI模板">
          <el-select v-model="aiForm.templateIds" multiple style="width: 100%" placeholder="选择一个或多个模板">
            <el-option v-for="template in aiTemplates" :key="template.id" :label="template.name" :value="template.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述需求">
          <el-input
            v-model="aiForm.prompt"
            type="textarea"
            :rows="6"
            placeholder="详细描述您想要的大屏展示内容..."
          />
        </el-form-item>
        <el-form-item label="每模板数量" v-if="aiForm.templateIds && aiForm.templateIds.length">
          <div style="width: 100%">
            <div v-for="tid in aiForm.templateIds" :key="tid" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px">
              <span>{{ getTemplateName(tid) }}</span>
              <div>
                <el-input-number v-model="aiForm.countsByTemplateId[tid]" :min="1" :max="6" />
                <span style="margin-left: 8px; color: #999">个图表组件</span>
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="SQL预览与调试" v-if="generatedSQLs.length > 0">
          <el-collapse>
            <el-collapse-item v-for="(sqlInfo, idx) in generatedSQLs" :key="idx" :name="idx">
              <template #title>
                <div style="display: flex; align-items: center; gap: 10px; width: 100%">
                  <span style="font-weight: bold">{{ sqlInfo.title }} ({{ sqlInfo.type }})</span>
                  <el-tag v-if="sqlInfo.debug?.sqlValidation" :type="sqlInfo.debug.sqlValidation.valid ? 'success' : 'danger'">
                    {{ sqlInfo.debug.sqlValidation.valid ? `✓ 可运行 (${sqlInfo.debug.sqlValidation.rowCount}行)` : '✗ 执行失败' }}
                  </el-tag>
                </div>
              </template>
              <div style="padding: 10px;">
                <!-- 1. 给AI的提示词 -->
                <div style="margin-bottom: 15px;">
                  <div style="font-weight: bold; margin-bottom: 5px; color: #409eff;">1. 给AI的提示词</div>
                  <div style="padding: 10px; background: #f0f9ff; border-radius: 4px; border: 1px solid #b3d8ff;">
                    <pre style="margin: 0; white-space: pre-wrap; word-break: break-all; font-size: 11px; max-height: 200px; overflow-y: auto;">{{ sqlInfo.debug?.prompt || '（无提示词信息）' }}</pre>
                  </div>
                </div>
                
                <!-- 2. 原始SQL -->
                <div style="margin-bottom: 15px;">
                  <div style="font-weight: bold; margin-bottom: 5px; color: #67c23a;">
                    2. {{ sqlInfo.debug?.isDefaultSql ? '自动生成的默认SQL' : 'AI生成的原始SQL' }}
                    <el-tag v-if="sqlInfo.debug?.isDefaultSql" size="small" type="warning" style="margin-left: 8px">默认生成</el-tag>
                  </div>
                  <div style="padding: 10px; background: #f5f5f5; border-radius: 4px; border: 1px solid #ddd;">
                    <pre style="margin: 0; white-space: pre-wrap; word-break: break-all; font-size: 12px;">{{ sqlInfo.debug?.originalSql || sqlInfo.sql || '（使用默认数据聚合，无SQL）' }}</pre>
                  </div>
                </div>
                
                <!-- 3. 验证后的SQL（enforced） -->
                <div style="margin-bottom: 15px;">
                  <div style="font-weight: bold; margin-bottom: 5px; color: #e6a23c;">3. 验证后的SQL（已应用configId过滤）</div>
                  <div style="padding: 10px; background: #fdf6ec; border-radius: 4px; border: 1px solid #f5dab1;">
                    <pre style="margin: 0; white-space: pre-wrap; word-break: break-all; font-size: 12px;">{{ sqlInfo.debug?.enforcedSql || sqlInfo.sql || '（无SQL）' }}</pre>
                  </div>
                </div>
                
                <!-- 4. SQL验证结果 -->
                <div v-if="sqlInfo.debug?.sqlValidation">
                  <div style="font-weight: bold; margin-bottom: 5px; color: #909399;">4. SQL验证结果</div>
                  <div style="padding: 10px; background: #f9f9f9; border-radius: 4px; border: 1px solid #ddd;">
                    <div style="margin-bottom: 5px;">
                      <strong>状态：</strong>
                      <el-tag :type="sqlInfo.debug.sqlValidation.valid ? 'success' : 'danger'" size="small">
                        {{ sqlInfo.debug.sqlValidation.valid ? '验证通过' : '验证失败' }}
                      </el-tag>
                    </div>
                    <div style="margin-bottom: 5px;" v-if="sqlInfo.debug.sqlValidation.rowCount !== undefined">
                      <strong>返回行数：</strong>{{ sqlInfo.debug.sqlValidation.rowCount }}
                    </div>
                    <div v-if="sqlInfo.debug.sqlValidation.error">
                      <strong>错误信息：</strong>
                      <div style="color: #f56c6c; margin-top: 5px;">{{ sqlInfo.debug.sqlValidation.error }}</div>
                    </div>
                    <div v-if="sqlInfo.debug.configId" style="margin-top: 5px; color: #909399; font-size: 12px;">
                      <strong>关联表单ID：</strong>{{ sqlInfo.debug.configId }}
                    </div>
                  </div>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-form-item>
      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
          <el-button @click="showAIGenerateDialog = false">取消</el-button>
          <div>
            <el-button @click="previewSQL" :loading="generating" :disabled="!aiForm.templateIds || aiForm.templateIds.length === 0">预览SQL</el-button>
            <el-button type="primary" @click="generateWithAI" :loading="generating" style="margin-left: 10px">生成</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, FullScreen } from '@element-plus/icons-vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useBigScreenStore } from '@/stores/bigScreen'
import { useAITemplateStore } from '@/stores/aiTemplate'
import { useFormConfigStore } from '@/stores/formConfig'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const bigScreenStore = useBigScreenStore()
const aiTemplateStore = useAITemplateStore()
const formConfigStore = useFormConfigStore()

const bigscreenRef = ref<HTMLElement>()
const isFullscreen = ref(false)
const showConfigDialog = ref(false)
const showAIGenerateDialog = ref(false)
const refreshInterval = ref('60')
const generating = ref(false)
const widgets = ref<any[]>([])
const aiTemplates = ref<any[]>([])
const formConfigs = ref<any[]>([])
const editSizeDialogVisible = ref(false)
const editingWidget = ref<any>(null)
const widgetWidth = ref(40)
const widgetHeight = ref(30)
let refreshTimer: ReturnType<typeof setInterval> | null = null

// 拖拽相关
let draggingWidget: any = null
let dragStartX = 0
let dragStartY = 0
let isDragging = false

const availableWidgets = [
  { id: 'line', title: '折线图', icon: 'LineChart' },
  { id: 'bar', title: '柱状图', icon: 'PieChart' },
  { id: 'pie', title: '饼图', icon: 'BarChart' }
]

const aiForm = ref({
  templateIds: [] as Array<number>,
  countsByTemplateId: {} as Record<number, number>,
  prompt: ''
})

const generatedSQLs = ref<Array<{ title: string; type: string; sql: string | null; debug?: any }>>([])

const getTemplateName = (id: number) => {
  const t = aiTemplates.value.find((x: any) => x.id === id)
  return t ? t.name : `模板#${id}`
}

// 开始拖拽组件
const startDrag = (widget: any, event: MouseEvent) => {
  if (event.button !== 0) return // 只响应左键
  
  draggingWidget = widget
  isDragging = true
  dragStartX = event.clientX
  dragStartY = event.clientY
  
  event.preventDefault()
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
}

const handleDrag = (event: MouseEvent) => {
  if (!isDragging || !draggingWidget || !bigscreenRef.value) return
  
  const container = bigscreenRef.value
  const rect = container.getBoundingClientRect()
  
  const deltaX = event.clientX - dragStartX
  const deltaY = event.clientY - dragStartY
  
  const percentX = (deltaX / rect.width) * 100
  const percentY = (deltaY / rect.height) * 100
  
  // 更新位置，限制在容器内
  const newX = Math.max(0, Math.min(100 - draggingWidget.w, draggingWidget.x + percentX))
  const newY = Math.max(0, Math.min(100 - draggingWidget.h, draggingWidget.y + percentY))
  
  draggingWidget.x = newX
  draggingWidget.y = newY
  
  dragStartX = event.clientX
  dragStartY = event.clientY
}

const stopDrag = () => {
  isDragging = false
  draggingWidget = null
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 编辑组件大小
const editWidgetSize = (widget: any) => {
  editingWidget.value = widget
  widgetWidth.value = widget.w
  widgetHeight.value = widget.h
  editSizeDialogVisible.value = true
}

// 确认调整大小
const confirmSizeChange = () => {
  if (!editingWidget.value) return
  
  const w = widgetWidth.value
  const h = widgetHeight.value
  
  if (w <= 0 || w > 100 || h <= 0 || h > 100) {
    ElMessage.error('宽度和高度必须在1-100之间')
    return
  }
  
  if (editingWidget.value.x + w > 100) {
    ElMessage.error('组件宽度超出范围，无法放置')
    return
  }
  
  if (editingWidget.value.y + h > 100) {
    ElMessage.error('组件高度超出范围，无法放置')
    return
  }
  
  editingWidget.value.w = w
  editingWidget.value.h = h
  editSizeDialogVisible.value = false
  ElMessage.success('调整成功')
  saveLayout()
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    bigscreenRef.value?.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

const updateRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  refreshTimer = setInterval(async () => {
    await refreshWidgetData()
  }, parseInt(refreshInterval.value) * 1000)
}

const refreshWidgetData = async () => {
  for (const widget of widgets.value) {
    // 如果widget有保存的SQL，使用SQL刷新数据
    if (widget.sql) {
      try {
        const rows = await window.electronAPI.dbQuery(widget.sql, [])
        const baseOption: any = {
          tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.8)', textStyle: { color: '#fff' } },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          textStyle: { color: '#fff' }
        }
        
        if (!rows || rows.length === 0) {
          // 如果没有数据，保持原有option或使用默认
          continue
        }
        
        const cols = Object.keys(rows[0])
        if (cols.length < 2) {
          continue
        }
        
        const xCol = cols[0]
        const yCol = cols[1]
        
        if (widget.type === 'pie') {
          widget.option = {
            ...baseOption,
            title: { text: widget.title || '数据展示', left: 'center', textStyle: { color: '#fff' } },
            series: [{
              type: 'pie',
              radius: '60%',
              data: rows.map((r: any) => ({ name: String(r[xCol]), value: Number(r[yCol]) || 0 })),
              label: { color: '#fff' }
            }]
          }
        } else {
          widget.option = {
            ...baseOption,
            title: { text: widget.title || '数据展示', left: 'center', textStyle: { color: '#fff' } },
            xAxis: {
              type: 'category',
              data: rows.map((r: any) => String(r[xCol])),
              axisLabel: { color: '#fff', rotate: widget.type === 'bar' ? -45 : 0 },
              axisLine: { lineStyle: { color: '#fff' } }
            },
            yAxis: {
              type: 'value',
              axisLabel: { color: '#fff' },
              axisLine: { lineStyle: { color: '#fff' } }
            },
            series: [{
              type: widget.type === 'line' ? 'line' : 'bar',
              data: rows.map((r: any) => Number(r[yCol]) || 0),
              smooth: widget.type === 'line',
              itemStyle: { color: widget.type === 'bar' ? '#67c23a' : undefined },
              lineStyle: { color: '#409eff' },
              areaStyle: widget.type === 'line' ? { color: 'rgba(64, 158, 255, 0.2)' } : undefined
            }]
          }
        }
      } catch (error: any) {
        console.error('SQL刷新失败，使用旧逻辑:', error)
        // SQL失败，回退到旧逻辑
        const result = await generateWidgetOption(widget.type, widget)
        widget.option = result.option || result
        if (result.dataSource) widget.dataSource = result.dataSource
        if (result.dimension) widget.dimension = result.dimension
      }
    } else {
      // 没有SQL，使用旧的生成逻辑
      const result = await generateWidgetOption(widget.type, widget)
      widget.option = result.option || result
      if (result.dataSource) widget.dataSource = result.dataSource
      if (result.dimension) widget.dimension = result.dimension
    }
  }
}

const removeWidget = (id: string) => {
  widgets.value = widgets.value.filter((w: any) => w.id !== id)
  saveLayout()
}

const handleDragStart = (event: DragEvent, widget: any) => {
  event.dataTransfer!.setData('widget', JSON.stringify(widget))
}

const handleDrop = async (event: DragEvent) => {
  const widgetData = JSON.parse(event.dataTransfer!.getData('widget'))
  
  // 计算在容器中的位置
  if (!bigscreenRef.value) return
  const rect = bigscreenRef.value.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100
  
  const result = await generateWidgetOption(widgetData.id)
  const newWidget = {
    id: Date.now().toString(),
    type: widgetData.id,
    title: widgetData.title,
    x: Math.max(0, Math.min(80, x - 10)),
    y: Math.max(0, Math.min(80, y - 10)),
    w: 40,
    h: 30,
    option: result.option || result,
    dataSource: result.dataSource,
    dimension: result.dimension
  }
  widgets.value.push(newWidget)
  ElMessage.success('添加成功')
}

const saveLayout = async () => {
  try {
    await bigScreenStore.saveDashboardConfig(widgets.value)
    ElMessage.success('布局已保存')
  } catch (error) {
    ElMessage.error('保存失败')
    console.error(error)
  }
}

// 处理表单配置变化
// 已移除表单配置选择，统一基于全部数据统计

// 获取字段值（根据表单配置智能匹配）
const getFieldValue = (data: any, possibleKeys: string[]) => {
  for (const key of possibleKeys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      return data[key]
    }
  }
  return null
}

// 加载真实数据并生成图表
const generateWidgetOption = async (type: string, widget?: any) => {
  const baseOption: any = {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.8)', textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    textStyle: { color: '#fff' }
  }

  try {
    // 根据选择的表单配置加载数据
    const sql = 'SELECT cr.data, cr.created_at, cr.config_id FROM cargo_records cr ORDER BY cr.created_at DESC LIMIT 500'
    const params: any[] = []
    const records = await window.electronAPI.dbQuery(sql, params)
    
    if (type === 'line') {
      // 折线图：最近30天货运趋势
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const dailyData: any = {}
      records.forEach((record: any) => {
        const recordDate = new Date(record.created_at)
        if (recordDate >= thirtyDaysAgo) {
          const dateKey = record.created_at.split('T')[0]
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { weights: [], count: 0 }
          }
          dailyData[dateKey].count++
          const data = JSON.parse(record.data)
          const weightValue = getFieldValue(data, ['货物重量(kg)', '提货重量(kg)', '转运货物量(kg)', '配送重量(kg)', '入库数量', '重量', '数量'])
          const weight = parseFloat(String(weightValue || '0'))
          if (weight > 0) {
            dailyData[dateKey].weights.push(weight)
          }
        }
      })
      
      const days = Object.keys(dailyData).sort().slice(-15) // 最近15天
      const trendData = days.map(day => {
        const data = dailyData[day]
        const avgWeight = data.weights.length > 0
          ? data.weights.reduce((sum: number, w: number) => sum + w, 0) / data.weights.length
          : 0
        return Math.round(avgWeight * data.count)
      })
      
      const option = {
        ...baseOption,
        title: { 
          text: '货运趋势图',
          left: 'center', 
          textStyle: { color: '#fff' } 
        },
        xAxis: {
          type: 'category',
          data: days.map(d => d.substring(5)),
          axisLabel: { color: '#fff' },
          axisLine: { lineStyle: { color: '#fff' } }
        },
        yAxis: {
          type: 'value',
          name: '货运量',
          axisLabel: { color: '#fff' },
          axisLine: { lineStyle: { color: '#fff' } }
        },
        series: [{
          type: 'line',
          data: trendData,
          smooth: true,
          lineStyle: { color: '#409eff' },
          areaStyle: { color: 'rgba(64, 158, 255, 0.2)' }
        }]
      }
      
      return { option, dataSource: '全部数据', dimension: '时间趋势（最近30天）' }
    } else if (type === 'bar') {
      // 柱状图：各城市货运量或其他分类
      const categoryData: any = {}
      records.forEach((record: any) => {
        const data = JSON.parse(record.data)
        // 尝试获取分类字段（城市、航线、货物类型等）
        const category = getFieldValue(data, ['出发城市', '出发机场', '目的城市', '目的地机场', '航线', '货物名称', '货物类型', '仓库编号']) || '未知'
        if (!categoryData[category]) {
          categoryData[category] = 0
        }
        const weightValue = getFieldValue(data, ['货物重量(kg)', '提货重量(kg)', '转运货物量(kg)', '配送重量(kg)', '入库数量', '重量', '数量'])
        const weight = parseFloat(String(weightValue || '1'))
        categoryData[category] += weight
      })
      
      const sortedCategories = Object.entries(categoryData)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 6)
        .map((item: any) => ({ name: item[0], value: item[1] }))
      
      const option = {
        ...baseOption,
        title: { 
          text: '分类统计图',
          left: 'center', 
          textStyle: { color: '#fff' } 
        },
        xAxis: {
          type: 'category',
          data: sortedCategories.map(item => item.name),
          axisLabel: { color: '#fff', rotate: -45, interval: 0 },
          axisLine: { lineStyle: { color: '#fff' } }
        },
        yAxis: {
          type: 'value',
          name: '数量',
          axisLabel: { color: '#fff' },
          axisLine: { lineStyle: { color: '#fff' } }
        },
        series: [{
          type: 'bar',
          data: sortedCategories.map(item => Math.round(item.value)),
          itemStyle: { color: '#67c23a' }
        }]
      }
      
      return { option, dataSource: '全部数据', dimension: '分类对比' }
    } else {
      // 饼图：分类分布
      const distributionData: any = {}
      records.forEach((record: any) => {
        const data = JSON.parse(record.data)
        // 尝试获取分类字段
        const category = getFieldValue(data, ['货物类型', '货物名称', '货物状态', '仓库编号', '仓库管理员', '航线']) || '其他'
        if (!distributionData[category]) {
          distributionData[category] = 0
        }
        const weightValue = getFieldValue(data, ['货物重量(kg)', '提货重量(kg)', '转运货物量(kg)', '配送重量(kg)', '入库数量', '重量', '数量'])
        const weight = parseFloat(String(weightValue || '1'))
        distributionData[category] += weight
      })
      
      const pieData = Object.entries(distributionData)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map((item: any) => ({
          name: item[0],
          value: Math.round(item[1])
        }))
      
      const option = {
        ...baseOption,
        title: { 
          text: '分布统计图',
          left: 'center', 
          textStyle: { color: '#fff' } 
        },
        series: [{
          type: 'pie',
          radius: '60%',
          data: pieData,
          label: {
            color: '#fff'
          }
        }]
      }
      
      return { option, dataSource: '全部数据', dimension: '分布占比' }
    }
  } catch (error) {
    console.error('加载数据失败，使用默认数据:', error)
    // 返回默认数据
    if (type === 'line') {
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: ['1月', '2月', '3月', '4月', '5月', '6月'],
          axisLabel: { color: '#fff' },
          axisLine: { lineStyle: { color: '#fff' } }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#fff' },
          axisLine: { lineStyle: { color: '#fff' } }
        },
        series: [{
          type: 'line',
          data: [120, 200, 150, 280, 220, 250],
          smooth: true,
          lineStyle: { color: '#409eff' },
          areaStyle: { color: 'rgba(64, 158, 255, 0.2)' }
        }]
      }
    } else if (type === 'bar') {
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: ['北京', '上海', '广州', '深圳', '成都'],
          axisLabel: { color: '#fff' },
          axisLine: { lineStyle: { color: '#fff' } }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#fff' },
          axisLine: { lineStyle: { color: '#fff' } }
        },
        series: [{
          type: 'bar',
          data: [100, 200, 150, 280, 220],
          itemStyle: { color: '#67c23a' }
        }]
      }
    } else {
      return {
        ...baseOption,
        series: [{
          type: 'pie',
          radius: '60%',
          data: [
            { value: 1048, name: '电子产品' },
            { value: 735, name: '服装' },
            { value: 580, name: '食品' }
          ]
        }]
      }
    }
  }
}

const generateWithAI = async () => {
  if (!aiForm.value.templateIds || aiForm.value.templateIds.length === 0) {
    ElMessage.warning('请选择至少一个AI模板')
    return
  }
  if (!aiForm.value.prompt.trim()) {
    ElMessage.warning('请输入您的需求描述')
    return
  }
  
  generating.value = true
  try {
    generatedSQLs.value = []
    let combined: any[] = []
    for (const tid of aiForm.value.templateIds) {
      const template = aiTemplates.value.find((t: any) => t.id === tid)
      if (!template) continue
      const count = aiForm.value.countsByTemplateId[tid] || 3
      const fullPrompt = template.prompt.replace('{user_input}', aiForm.value.prompt || '')
      const result = await window.electronAPI.generateDashboard({
        prompt: fullPrompt,
        count,
        configId: template.config_id || null
      } as any)
      if (result.success && Array.isArray(result.widgets)) {
        combined = combined.concat(result.widgets)
        // 收集SQL预览和调试信息
        result.widgets.forEach((w: any, idx: number) => {
          generatedSQLs.value.push({
            title: w.title || `图表 ${idx + 1}`,
            type: w.type || '-',
            sql: w.sql ?? null,
            debug: w.debug || null
          })
        })
      }
    }
    if (combined.length > 0) {
      widgets.value = combined
      await saveLayout()
      ElMessage.success('AI生成成功！')
      showAIGenerateDialog.value = false
    } else {
      ElMessage.error('生成失败，未返回有效组件')
    }
  } catch (error: any) {
    console.error('AI生成错误:', error)
    ElMessage.error('生成失败，请检查网络或配置: ' + (error.message || ''))
  } finally {
    generating.value = false
  }
}

// 仅预览SQL，不落盘、不替换当前widgets
const previewSQL = async () => {
  if (!aiForm.value.templateIds || aiForm.value.templateIds.length === 0) return
  generating.value = true
  try {
    const previews: Array<{ title: string; type: string; sql: string | null; debug: any }> = []
    for (const tid of aiForm.value.templateIds) {
      const template = aiTemplates.value.find((t: any) => t.id === tid)
      if (!template) continue
      const count = aiForm.value.countsByTemplateId[tid] || 3
      const fullPrompt = template.prompt.replace('{user_input}', aiForm.value.prompt || '')
      const result = await window.electronAPI.generateDashboard({ 
        prompt: fullPrompt, 
        count,
        configId: template.config_id || null
      } as any)
      if (result.success && Array.isArray(result.widgets)) {
        result.widgets.forEach((w: any, idx: number) => {
          previews.push({ 
            title: w.title || `图表 ${idx + 1}`, 
            type: w.type || '-', 
            sql: w.sql ?? null,
            debug: w.debug || null
          })
        })
      }
    }
    generatedSQLs.value = previews
    if (previews.length === 0) {
      ElMessage.warning('未获取到可预览的SQL')
    } else {
      ElMessage.success('SQL预览已生成，包含调试信息')
    }
  } catch (e) {
    ElMessage.error('预览失败: ' + (e as Error).message)
  } finally {
    generating.value = false
  }
}

const loadDashboard = async () => {
  const savedWidgets = await bigScreenStore.getDashboardConfig()
  
  // 为每个widget刷新数据
  for (const widget of savedWidgets) {
    // 如果widget有保存的SQL，使用SQL加载数据
    if (widget.sql) {
      try {
        const rows = await window.electronAPI.dbQuery(widget.sql, [])
        const baseOption: any = {
          tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.8)', textStyle: { color: '#fff' } },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          textStyle: { color: '#fff' }
        }
        
        if (rows && rows.length > 0) {
          const cols = Object.keys(rows[0])
          if (cols.length >= 2) {
            const xCol = cols[0]
            const yCol = cols[1]
            
            if (widget.type === 'pie') {
              widget.option = {
                ...baseOption,
                title: { text: widget.title || '数据展示', left: 'center', textStyle: { color: '#fff' } },
                series: [{
                  type: 'pie',
                  radius: '60%',
                  data: rows.map((r: any) => ({ name: String(r[xCol]), value: Number(r[yCol]) || 0 })),
                  label: { color: '#fff' }
                }]
              }
            } else {
              widget.option = {
                ...baseOption,
                title: { text: widget.title || '数据展示', left: 'center', textStyle: { color: '#fff' } },
                xAxis: {
                  type: 'category',
                  data: rows.map((r: any) => String(r[xCol])),
                  axisLabel: { color: '#fff', rotate: widget.type === 'bar' ? -45 : 0 },
                  axisLine: { lineStyle: { color: '#fff' } }
                },
                yAxis: {
                  type: 'value',
                  axisLabel: { color: '#fff' },
                  axisLine: { lineStyle: { color: '#fff' } }
                },
                series: [{
                  type: widget.type === 'line' ? 'line' : 'bar',
                  data: rows.map((r: any) => Number(r[yCol]) || 0),
                  smooth: widget.type === 'line',
                  itemStyle: { color: widget.type === 'bar' ? '#67c23a' : undefined },
                  lineStyle: { color: '#409eff' },
                  areaStyle: widget.type === 'line' ? { color: 'rgba(64, 158, 255, 0.2)' } : undefined
                }]
              }
            }
          }
        }
        // 如果没有数据或SQL失败，保持原有option（如果有）
        if (!widget.option) {
          const result = await generateWidgetOption(widget.type, widget)
          widget.option = result.option || result
          if (result.dataSource) widget.dataSource = result.dataSource
          if (result.dimension) widget.dimension = result.dimension
        }
      } catch (error: any) {
        console.error('SQL加载失败，使用旧逻辑:', error)
        // SQL失败，回退到旧逻辑
        const result = await generateWidgetOption(widget.type, widget)
        widget.option = result.option || result
        if (result.dataSource) widget.dataSource = result.dataSource
        if (result.dimension) widget.dimension = result.dimension
      }
    } else {
      // 没有SQL，使用旧的生成逻辑
      const result = await generateWidgetOption(widget.type, widget)
      widget.option = result.option || result
      if (result.dataSource) widget.dataSource = result.dataSource
      if (result.dimension) widget.dimension = result.dimension
    }
  }
  
  widgets.value = savedWidgets
}

onMounted(async () => {
  // 加载表单配置列表
  formConfigs.value = await formConfigStore.getConfigs()
  await loadDashboard()
  aiTemplates.value = await aiTemplateStore.getTemplates()
  updateRefresh()
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.bigscreen-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.bigscreen-toolbar {
  padding: 10px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.bigscreen-content {
  flex: 1;
  position: relative;
  background: #0a0e27;
  overflow: hidden;
}

.bigscreen-widget {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 10px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  transition: box-shadow 0.3s;
}

.bigscreen-widget:hover {
  box-shadow: 0 0 20px rgba(64, 158, 255, 0.3);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  margin-bottom: 10px;
  cursor: move;
  user-select: none;
}

.widget-header:hover {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.widget-content {
  height: calc(100% - 50px);
}

.widget-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.widget-item {
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  text-align: center;
  cursor: move;
  transition: all 0.3s;
}

.widget-item:hover {
  border-color: #409eff;
  background: #f0f8ff;
}

.drop-zone {
  min-height: 200px;
  border: 2px dashed #ccc;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  background: #fafafa;
}
</style>
