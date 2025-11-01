<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>数据看板</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showAddChartDialog = true">新增图表</el-button>
        <el-radio-group v-model="refreshInterval" @change="updateRefresh">
          <el-radio-button label="30">30秒</el-radio-button>
          <el-radio-button label="60">1分钟</el-radio-button>
          <el-radio-button label="300">5分钟</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    
    <el-row :gutter="20">
      <el-col 
        v-for="chart in charts" 
        :key="chart.id"
        :span="chart.span || 12"
      >
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <div>
                <span>{{ chart.title }}</span>
                <div class="chart-meta" v-if="chart.dataSource || chart.xAxisField || chart.yAxisField">
                  <span class="meta-tag" v-if="chart.dataSource && chart.dataSource !== '全部数据'">
                    来源: {{ chart.dataSource }}
                  </span>
                  <template v-if="chart.type === 'pie'">
                    <span class="meta-tag" v-if="chart.xAxisField">
                      分类: {{ chart.xAxisField }}
                    </span>
                    <span class="meta-tag" v-if="chart.yAxisField">
                      统计: {{ chart.yAxisField }}
                    </span>
                    <span class="meta-tag" v-else>
                      统计: 记录数
                    </span>
          </template>
                  <template v-else>
                    <span class="meta-tag" v-if="chart.xAxisField && chart.xAxisField !== 'auto'">
                      X轴: {{ chart.xAxisField }}
                    </span>
                    <span class="meta-tag" v-if="chart.yAxisField">
                      Y轴: {{ chart.yAxisField }}
                    </span>
                  </template>
                </div>
              </div>
              <div class="card-actions">
                <el-button size="small" text @click="editChart(chart)">配置</el-button>
                <el-button size="small" text @click="removeChart(chart.id)">删除</el-button>
                <el-button size="small" @click="loadChartData(chart)">刷新</el-button>
            </div>
            </div>
          </template>
          <v-chart 
            v-if="chart.option && (chart.option.xAxis || (chart.type === 'pie' && chart.option.series && chart.option.series.length > 0))"
            :option="chart.option" 
            :style="{ height: chart.height || '300px', width: '100%', minHeight: '200px' }" 
            @click="(params: any) => onChartClick(params, chart)"
            :key="`chart-${chart.id}-${chart._updateKey || 0}-${chart.type === 'pie' ? (chart.option?.series?.[0]?.data?.length || 0) : (chart.option?.xAxis?.data?.length || 0)}`"
            autoresize
            :loading="loading"
          />
          <div v-else class="chart-loading" :style="{ height: chart.height || '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }">
            <span style="color: #999;">加载中...</span>
            </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 新增/编辑图表对话框 -->
    <el-dialog v-model="showAddChartDialog" :title="editingChart ? '编辑图表' : '新增图表'" width="600px">
      <el-form :model="chartForm" label-width="120px">
        <el-form-item label="图表类型">
          <el-select v-model="chartForm.type" style="width: 100%">
            <el-option label="折线图" value="line" />
            <el-option label="柱状图" value="bar" />
            <el-option label="饼图" value="pie" />
            <el-option label="K线图" value="kline" />
          </el-select>
        </el-form-item>
        <el-form-item label="图表标题">
          <el-input v-model="chartForm.title" placeholder="请输入图表标题" />
        </el-form-item>
        <el-form-item label="关联表单">
          <el-select 
            v-model="chartForm.formConfigId" 
            style="width: 100%" 
            placeholder="选择数据来源表单（用于获取字段）"
            clearable
            @change="handleChartFormChange"
          >
            <el-option label="全部表单" value="" />
            <el-option
              v-for="config in formConfigs"
              :key="config.id"
              :label="config.name"
              :value="String(config.id)"
            />
          </el-select>
          <div style="margin-top: 5px; color: #999; font-size: 12px;">
            选择数据来源表单后，可以选择该表单的字段进行配置
          </div>
        </el-form-item>
        <!-- 折线图、柱状图、K线图的X轴和Y轴配置 -->
        <template v-if="chartForm.type !== 'pie'">
          <el-form-item label="X轴字段">
            <el-select 
              v-model="chartForm.xAxisField" 
              style="width: 100%" 
              placeholder="选择X轴显示的字段"
              clearable
            >
              <el-option label="自动（按创建时间）" value="auto" />
              <el-option
                v-for="field in chartAvailableFields"
                :key="field.name"
                :label="`${field.name} (${field.type})`"
                :value="field.name"
              />
            </el-select>
            <div style="margin-top: 5px; color: #999; font-size: 12px;">
              选择用于X轴分类的字段。选择"自动"将按记录的创建时间分组
            </div>
          </el-form-item>
          <el-form-item label="Y轴字段">
            <el-select 
              v-model="chartForm.yAxisField" 
              style="width: 100%" 
              placeholder="选择Y轴统计的数值字段"
              clearable
              :disabled="!chartForm.formConfigId"
            >
              <el-option
                v-if="chartAvailableNumericFields.length === 0"
                label="请先选择关联表单" 
                value="" 
                disabled
              />
              <el-option
                v-for="field in chartAvailableNumericFields"
                :key="field.name"
                :label="`${field.name} (${field.type})`"
                :value="field.name"
              />
            </el-select>
            <div style="margin-top: 5px; color: #999; font-size: 12px;">
              选择用于Y轴统计的数值字段。系统会自动识别数字类型字段和包含"重量"、"数量"、"金额"等关键词的字段。必须选择关联表单后才能选择字段
            </div>
          </el-form-item>
        </template>
        
        <!-- 饼图的分类和统计字段配置 -->
        <template v-if="chartForm.type === 'pie'">
          <el-form-item label="分类字段">
            <el-select 
              v-model="chartForm.xAxisField" 
              style="width: 100%" 
              placeholder="选择用于饼图分类的字段"
              clearable
              :disabled="!chartForm.formConfigId"
            >
              <el-option
                v-if="chartAvailableFields.length === 0"
                label="请先选择关联表单" 
                value="" 
                disabled
              />
              <el-option
                v-for="field in chartAvailableFields"
                :key="field.name"
                :label="`${field.name} (${field.type})`"
                :value="field.name"
              />
            </el-select>
            <div style="margin-top: 5px; color: #999; font-size: 12px;">
              选择用于饼图分类的字段，如：货物类型、仓库编号、货物状态等。饼图将按此字段分组显示占比
            </div>
          </el-form-item>
          <el-form-item label="统计字段">
            <el-select 
              v-model="chartForm.yAxisField" 
              style="width: 100%" 
              placeholder="选择用于统计的数值字段"
              clearable
              :disabled="!chartForm.formConfigId"
            >
              <el-option
                v-if="chartAvailableNumericFields.length === 0"
                label="请先选择关联表单" 
                value="" 
                disabled
              />
              <el-option
                v-for="field in chartAvailableNumericFields"
                :key="field.name"
                :label="`${field.name} (${field.type})`"
                :value="field.name"
              />
            </el-select>
            <div style="margin-top: 5px; color: #999; font-size: 12px;">
              选择用于统计的数值字段，如：重量、数量、金额等。饼图将统计每个分类的数值总和并计算占比
            </div>
          </el-form-item>
        </template>
        <el-form-item label="时间范围">
          <el-select v-model="chartForm.timeRange" style="width: 100%">
            <el-option label="最近7天" value="7" />
            <el-option label="最近30天" value="30" />
            <el-option label="最近6个月" value="180" />
            <el-option label="全部" value="all" />
          </el-select>
        </el-form-item>
        <el-form-item label="图表宽度">
          <el-radio-group v-model="chartForm.span">
            <el-radio-button :label="24">全宽</el-radio-button>
            <el-radio-button :label="12">半宽</el-radio-button>
            <el-radio-button :label="8">1/3</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="图表高度">
          <el-input-number v-model="chartForm.height" :min="200" :max="600" style="width: 100%" />
          <span style="margin-left: 10px; color: #999">px</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddChartDialog = false">取消</el-button>
        <el-button type="primary" @click="saveChart">保存</el-button>
      </template>
    </el-dialog>
    
    <el-dialog v-model="historyVisible" :title="`历史数据详情${clickedChart ? ' - ' + clickedChart.title : ''}`" width="90%">
      <div v-if="historyTableColumns.length === 0" style="text-align: center; padding: 20px; color: #999;">
        暂无数据
      </div>
      <el-table :data="historyData" style="width: 100%" max-height="500" v-else>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column 
          v-for="column in historyTableColumns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :width="column.width || 120"
        >
          <template #default="{ row }">
            <span>{{ formatCellValue(row[column.prop], column.type) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { CandlestickChart, LineChart, BarChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useFormConfigStore } from '@/stores/formConfig'

use([
  CanvasRenderer,
  CandlestickChart,
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const formConfigStore = useFormConfigStore()
const historyVisible = ref(false)
const historyData = ref<any[]>([])
const historyTableColumns = ref<any[]>([])
const clickedChart = ref<any>(null)
const loading = ref(false)
const formConfigs = ref<any[]>([])
const selectedFormConfigId = ref<string | number>('')
const selectedFormConfig = ref<any>(null)
const showAddChartDialog = ref(false)
const editingChart = ref<any>(null)
const refreshInterval = ref('60')
let refreshTimer: ReturnType<typeof setInterval> | null = null

const chartForm = ref({
  type: 'line',
  title: '',
  timeRange: '30',
  formConfigId: '', // 图表关联的表单ID
  xAxisField: 'auto', // X轴字段
  yAxisField: '', // Y轴字段
  span: 12,
  height: 300
})

// 图表对话框中选择的表单配置
const chartSelectedFormConfig = ref<any>(null)

// 计算图表可用的所有字段
const chartAvailableFields = computed(() => {
  if (!chartSelectedFormConfig.value || !chartSelectedFormConfig.value.fields) {
    return []
  }
  
  let fields = chartSelectedFormConfig.value.fields
  if (typeof fields === 'string') {
    try {
      fields = JSON.parse(fields)
    } catch (e) {
      return []
    }
  }
  
  return Array.isArray(fields) ? fields : []
})

// 计算图表可用的数值字段
// 包括：1. type为'number'的字段  2. 字段名包含数值关键词的文本字段
const chartAvailableNumericFields = computed(() => {
  const numericKeywords = ['重量', '数量', '金额', '价格', '费用', '运费', '成本', '收入', '金额', '吨', 'kg', '元', '件', '个', '率', '%', '载货', '舱位']
  
  return chartAvailableFields.value.filter((f: any) => {
    // 类型为number的直接包含
    if (f.type === 'number') {
      return true
    }
    
    // 文本类型但字段名包含数值关键词的也包含
    if (f.type === 'text' && f.name) {
      const fieldName = String(f.name).toLowerCase()
      return numericKeywords.some(keyword => fieldName.includes(keyword.toLowerCase()))
    }
    
    return false
  })
})

// 处理图表表单配置变化
const handleChartFormChange = (configId: string | number | null) => {
  chartForm.value.formConfigId = configId ? String(configId) : ''
  if (configId) {
    chartSelectedFormConfig.value = formConfigs.value.find(c => c.id == configId)
    if (chartSelectedFormConfig.value) {
      try {
        if (typeof chartSelectedFormConfig.value.fields === 'string') {
          chartSelectedFormConfig.value.fields = JSON.parse(chartSelectedFormConfig.value.fields)
        }
      } catch (e) {
        console.error('解析图表表单字段失败:', e)
        chartSelectedFormConfig.value.fields = []
      }
    }
  } else {
    chartSelectedFormConfig.value = null
  }
}

// 从localStorage加载图表配置
const loadChartsFromStorage = () => {
  try {
    const saved = localStorage.getItem('dashboard_charts')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.error('加载图表配置失败:', e)
  }
  // 默认图表
  return [
    {
      id: '1',
      type: 'kline',
      title: '货运量K线图（近6个月）',
      span: 12,
      height: 300,
      dataSource: '全部数据',
      dimension: '月度统计',
      timeRange: '180',
      timeField: 'created_at',
      formConfigId: '',
      xAxisField: 'auto',
      yAxisField: '',
      option: {
        title: { text: '货运量K线图（近6个月）', left: 'center' },
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [{ type: 'candlestick', data: [] }]
      }
    },
    {
      id: '2',
      type: 'line',
      title: '货运趋势图（近30天）',
      span: 12,
      height: 300,
      dataSource: '全部数据',
      dimension: '时间趋势',
      timeRange: '30',
      timeField: 'created_at',
      formConfigId: '',
      xAxisField: 'auto',
      yAxisField: '',
      option: {
        title: { text: '货运趋势图（近30天）', left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value', name: '数值' },
        series: [{ type: 'line', data: [], smooth: true, areaStyle: {} }]
      }
    }
  ]
}

// 保存图表配置到localStorage
const saveChartsToStorage = () => {
  try {
    // 保存时移除option，只保存配置
    const chartsToSave = charts.value.map(chart => {
      const { option, ...config } = chart
      return config
    })
    localStorage.setItem('dashboard_charts', JSON.stringify(chartsToSave))
  } catch (e) {
    console.error('保存图表配置失败:', e)
  }
}

const charts = ref<any[]>(loadChartsFromStorage())


// 处理表单配置变化
const handleFormConfigChange = async (configId: string | number | null) => {
  selectedFormConfigId.value = configId || ''
  if (configId) {
    selectedFormConfig.value = formConfigs.value.find(c => c.id == configId)
    if (selectedFormConfig.value) {
      try {
        // 如果fields是字符串，才需要解析
        if (typeof selectedFormConfig.value.fields === 'string') {
          selectedFormConfig.value.fields = JSON.parse(selectedFormConfig.value.fields)
        }
      } catch (e) {
        console.error('解析表单字段失败:', e)
        // 如果解析失败，设置为空数组
        selectedFormConfig.value.fields = []
      }
    }
  } else {
    selectedFormConfig.value = null
  }
  // 刷新所有图表 - 等待一下确保 DOM 已更新
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 100))
  
  for (const chart of charts.value) {
    await loadChartData(chart)
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

// 自动刷新
const updateRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  refreshTimer = setInterval(async () => {
    for (const chart of charts.value) {
      await loadChartData(chart)
    }
  }, parseInt(refreshInterval.value) * 1000)
}

// 编辑图表
const editChart = (chart: any) => {
  editingChart.value = chart
  chartForm.value = {
    type: chart.type,
    title: chart.title,
    timeRange: chart.timeRange || '30',
    formConfigId: chart.formConfigId ? String(chart.formConfigId) : '',
    xAxisField: chart.type === 'pie' 
      ? (chart.xAxisField || '')  // 饼图不使用'auto'
      : (chart.xAxisField || 'auto'),
    yAxisField: chart.yAxisField || '',
    span: chart.span || 12,
    height: chart.height || 300
  }
  
  // 如果图表有关联的表单，加载对应的表单配置
  if (chart.formConfigId) {
    handleChartFormChange(chart.formConfigId)
  } else {
    chartSelectedFormConfig.value = null
  }
  
  showAddChartDialog.value = true
}

// 删除图表
const removeChart = (id: string) => {
  charts.value = charts.value.filter(c => c.id !== id)
  saveChartsToStorage() // 保存到localStorage
  ElMessage.success('删除成功')
}

// 保存图表
const saveChart = async () => {
  if (!chartForm.value.title) {
    ElMessage.warning('请输入图表标题')
    return
  }
  
  if (editingChart.value) {
    // 更新现有图表
    // 确保 formConfigId 类型一致（字符串）
    const formConfigIdStr = chartForm.value.formConfigId ? String(chartForm.value.formConfigId) : ''
    const formConfigName = formConfigIdStr
      ? (formConfigs.value.find(c => String(c.id) === formConfigIdStr)?.name || '全部表单')
      : '全部数据'
    
    Object.assign(editingChart.value, {
      type: chartForm.value.type,
      title: chartForm.value.title,
      timeRange: chartForm.value.timeRange,
      formConfigId: formConfigIdStr,
      xAxisField: chartForm.value.type === 'pie' 
        ? (chartForm.value.xAxisField || '')  // 饼图不使用'auto'
        : (chartForm.value.xAxisField || 'auto'),
      yAxisField: chartForm.value.yAxisField || '',
      span: chartForm.value.span,
      height: chartForm.value.height,
      dataSource: formConfigName
    })
    await loadChartData(editingChart.value)
    editingChart.value = null
  } else {
    // 新增图表
    const formConfigIdStr = chartForm.value.formConfigId ? String(chartForm.value.formConfigId) : ''
    const formConfigName = formConfigIdStr
      ? (formConfigs.value.find(c => String(c.id) === formConfigIdStr)?.name || '全部表单')
      : '全部数据'
    
    const newChart = {
      id: Date.now().toString(),
      type: chartForm.value.type,
      title: chartForm.value.title,
      timeRange: chartForm.value.timeRange,
      formConfigId: formConfigIdStr,
      xAxisField: chartForm.value.type === 'pie' 
        ? (chartForm.value.xAxisField || '')  // 饼图不使用'auto'
        : (chartForm.value.xAxisField || 'auto'),
      yAxisField: chartForm.value.yAxisField || '',
      span: chartForm.value.span,
      height: chartForm.value.height,
      dataSource: formConfigName,
      option: {}
    }
    charts.value.push(newChart)
    await loadChartData(newChart)
  }
  
  // 保存到localStorage
  saveChartsToStorage()
  
  showAddChartDialog.value = false
  chartForm.value = {
    type: 'line',
    title: '',
    timeRange: '30',
    formConfigId: '',
    xAxisField: 'auto', // 非饼图默认使用auto
    yAxisField: '',
    span: 12,
    height: 300
  }
  chartSelectedFormConfig.value = null
  ElMessage.success('保存成功')
}

// 获取字段值（支持传入表单配置）
const getFieldValue = (data: any, possibleKeys: string[], formConfig?: any) => {
  // 如果没有传入formConfig，使用全局的selectedFormConfig
  const config = formConfig || selectedFormConfig.value
  
  // 先直接匹配键
  for (const key of possibleKeys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      return data[key]
    }
  }
  
  // 如果有表单配置，尝试匹配字段名
  if (config && config.fields) {
    let fields = config.fields
    if (typeof fields === 'string') {
      try {
        fields = JSON.parse(fields)
      } catch (e) {
        console.error('解析fields失败:', e)
        fields = []
      }
    }
    
    if (Array.isArray(fields)) {
      for (const field of fields) {
        if (field && field.name && possibleKeys.some(k => k.includes(field.name) || field.name.includes(k.replace(/[()]/g, '')))) {
          return data[field.name]
        }
      }
    }
  }
  
  return null
}

// 从数据库加载数据（支持单个图表）
const loadChartData = async (chart: any) => {
  if (!chart) return
  
  loading.value = true
  try {
    // 根据图表关联的表单配置获取记录
    let sql = `
      SELECT 
        cr.id,
        cr.data,
        cr.created_at,
        fc.name as form_name,
        fc.id as form_config_id
      FROM cargo_records cr
      LEFT JOIN form_configs fc ON cr.config_id = fc.id
    `
    const params: any[] = []
    
    // 使用图表自己的formConfigId
    const chartFormConfigId = chart.formConfigId || selectedFormConfigId.value
    if (chartFormConfigId) {
      sql += ' WHERE cr.config_id = ?'
      params.push(typeof chartFormConfigId === 'string' ? parseInt(chartFormConfigId) : chartFormConfigId)
    }
    
    sql += ' ORDER BY cr.created_at DESC LIMIT 1000'
    
    const records = await window.electronAPI.dbQuery(sql, params)
    
    console.log(`图表 ${chart.id} 开始加载数据，原始记录数:`, records?.length || 0)
    
    // 获取图表关联的表单配置
    let chartFormConfig: any = null
    if (chart.formConfigId) {
      chartFormConfig = formConfigs.value.find(c => c.id == chart.formConfigId)
      if (chartFormConfig && typeof chartFormConfig.fields === 'string') {
        try {
          chartFormConfig.fields = JSON.parse(chartFormConfig.fields)
        } catch (e) {
          console.error('解析图表表单字段失败:', e)
          chartFormConfig.fields = []
        }
      }
    }
    
    // 获取配置的字段（移除timeField，统一使用created_at作为时间维度）
    const xAxisField = chart.xAxisField || 'auto'
    const yAxisField = chart.yAxisField || ''
    
    console.log(`图表 ${chart.id} 配置:`, {
      xAxisField,
      yAxisField,
      formConfigId: chart.formConfigId
    })
    
    // 辅助函数：从记录中提取时间值（总是使用created_at）
    const getTimeValue = (record: any): Date | null => {
      if (!record.created_at) return null
      const date = new Date(record.created_at)
      return isNaN(date.getTime()) ? null : date
    }
    
    // 根据图表类型和时间范围生成数据
    const timeRange = chart.timeRange === 'all' ? null : parseInt(chart.timeRange || '30')
    const filterDate = timeRange ? (() => {
      const d = new Date()
      d.setDate(d.getDate() - timeRange)
      d.setHours(0, 0, 0, 0) // 设置为当天0点
      return d
    })() : null
    
    let filteredRecords = records || []
    if (filterDate && records && records.length > 0) {
      filteredRecords = records.filter((r: any) => {
        const recordDate = getTimeValue(r)
        if (!recordDate) return false
        recordDate.setHours(0, 0, 0, 0)
        return recordDate >= filterDate
      })
      console.log(`图表 ${chart.id} 时间过滤后记录数:`, filteredRecords.length, `时间范围:`, timeRange, '天')
    }
    
    // 如果过滤后没有数据，使用全部数据（但不超过限制）
    if (!filteredRecords || filteredRecords.length === 0) {
      filteredRecords = (records || []).slice(0, 1000) // 最多使用1000条记录
      console.log(`图表 ${chart.id} 使用全部数据，记录数:`, filteredRecords.length)
    }
    
    console.log(`图表 ${chart.id} 最终使用的记录数:`, filteredRecords.length)
    
    if (chart.type === 'kline') {
      // K线图：月度数据
    const monthlyData: any = {}
      
      if (!filteredRecords || filteredRecords.length === 0) {
        chart.option = {
          title: { text: chart.title, left: 'center' },
          tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
          xAxis: { type: 'category', data: [] },
          yAxis: { type: 'value', name: yAxisField || '数值' },
          series: [{ type: 'candlestick', data: [] }],
          graphic: {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: '暂无数据',
              fontSize: 16,
              fill: '#999'
            }
          }
        }
      } else {
        filteredRecords.forEach((record: any) => {
          try {
            // 解析数据
            let data: any = {}
            try {
              data = typeof record.data === 'string' ? JSON.parse(record.data || '{}') : record.data
            } catch (e) {
              console.warn(`图表 ${chart.id} K线图 JSON解析失败:`, record.data)
              data = {}
            }
            
            // 获取时间值
            const timeValue = getTimeValue(record)
            if (!timeValue) {
              console.warn(`图表 ${chart.id} K线图: 记录缺少创建时间`)
              return
            }
            
            // 获取月份
            const year = timeValue.getFullYear()
            const month = String(timeValue.getMonth() + 1).padStart(2, '0')
            const monthKey = `${year}-${month}`
            
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = { weights: [], dates: [] }
            }
            
            const weightValue = getFieldValue(data, ['货物重量(kg)', '提货重量(kg)', '转运货物量(kg)', '配送重量(kg)', '入库数量', '重量', '数量'], chartFormConfig)
            const weight = parseFloat(String(weightValue || '0'))
        if (weight > 0) {
          monthlyData[monthKey].weights.push(weight)
            } else {
              monthlyData[monthKey].weights.push(1) // 默认值
            }
          } catch (e) {
            console.error(`图表 ${chart.id} K线图处理记录失败:`, e, record)
          }
        })
        
        const months = Object.keys(monthlyData).sort().slice(-6)
        
        console.log(`图表 ${chart.id} K线图数据处理:`, {
          monthlyDataKeys: Object.keys(monthlyData),
          monthsCount: months.length,
          sampleMonthData: monthlyData[months[0]]
        })
        
        // 如果没有数据，显示空图表提示
        if (months.length === 0) {
          chart.option = {
            title: { text: chart.title, left: 'center' },
            tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
            xAxis: { type: 'category', data: [] },
            yAxis: { type: 'value', name: yAxisField || '数值' },
            series: [{ type: 'candlestick', data: [] }],
            graphic: {
              type: 'text',
              left: 'center',
              top: 'middle',
              style: {
                text: '暂无数据',
                fontSize: 16,
                fill: '#999'
              }
            }
          }
        } else {
    const klineData = months.map(month => {
            const weights = monthlyData[month].weights.sort((a: number, b: number) => a - b)
            if (weights.length === 0) return [0, 0, 0, 0]
            return [weights[0], weights[weights.length - 1], Math.min(...weights), Math.max(...weights)]
          })
          
          console.log(`图表 ${chart.id} K线图最终数据:`, {
            months,
            klineData,
            dataLength: klineData.length
          })
          
          // 确保数据有效
          if (months.length === 0 || klineData.length === 0) {
            chart.option = {
              title: { text: chart.title, left: 'center' },
              tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
              xAxis: { type: 'category', data: [] },
              yAxis: { type: 'value', name: yAxisField || '数值' },
              series: [{ type: 'candlestick', data: [] }],
              graphic: {
                type: 'text',
                left: 'center',
                top: 'middle',
                style: { text: '暂无数据', fontSize: 16, fill: '#999' }
              }
            }
          } else {
            // 创建完整的 option 对象
            const newOption = {
  title: {
                text: chart.title, 
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'bold' }
  },
  tooltip: {
    trigger: 'axis',
                axisPointer: { type: 'cross' },
                formatter: (params: any) => {
                  if (Array.isArray(params)) {
                    const data = params[0].value
                    return `${params[0].name}<br/>最低: ${data[0]}<br/>最高: ${data[1]}<br/>开盘: ${data[2]}<br/>收盘: ${data[3]}`
                  }
                  return `${params.name}<br/>值: ${params.value}`
    }
  },
  xAxis: {
    type: 'category',
                data: months,
                boundaryGap: true,
                axisLabel: { rotate: 0 }
  },
  yAxis: {
                type: 'value', 
                name: yAxisField || '数值',
                splitLine: { show: true, lineStyle: { type: 'dashed' } }
  },
              series: [{ 
                name: yAxisField || '数值',
      type: 'candlestick',
                data: klineData,
                itemStyle: {
                  color: '#26a69a',
                  color0: '#ef5350',
                  borderColor: '#26a69a',
                  borderColor0: '#ef5350'
                },
                emphasis: {
                  itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.3)'
                  }
                }
              }],
              grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '15%',
                containLabel: true
              },
              animation: true,
              animationDuration: 1000
            }
            
            // 使用深拷贝并重新赋值以触发响应式更新
            const optionCopy = JSON.parse(JSON.stringify(newOption))
            chart.option = optionCopy
            console.log(`图表 ${chart.id} K线图 option 已更新，xAxis.data.length:`, chart.option.xAxis.data.length)
            
            // 强制触发 Vue 响应式更新
            const chartIndex = charts.value.findIndex((c: any) => c.id === chart.id)
            if (chartIndex >= 0) {
              charts.value[chartIndex] = {
                ...charts.value[chartIndex],
                option: optionCopy,
                _updateKey: Date.now()
              }
            }
            await nextTick()
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }
      }
    } else if (chart.type === 'line') {
      // 折线图：根据配置的字段生成数据
      const groupedData: any = {}
      
      // 计算Y轴名称
      const yAxisName = (() => {
        if (!yAxisField) return '数值'
        if (chartFormConfig && Array.isArray(chartFormConfig.fields)) {
          const field = chartFormConfig.fields.find((f: any) => f.name === yAxisField)
          return field?.label || yAxisField
        }
        return yAxisField
      })()
      
      if (!filteredRecords || filteredRecords.length === 0) {
        chart.option = {
          title: { text: chart.title, left: 'center' },
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: [] },
          yAxis: { type: 'value', name: yAxisName },
          series: [{ name: yAxisName, type: 'line', data: [], smooth: true, areaStyle: {} }],
          graphic: {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: '暂无数据',
              fontSize: 16,
              fill: '#999'
            }
          }
        }
      } else {
        console.log(`图表 ${chart.id} 开始处理折线图数据，记录数:`, filteredRecords.length)
        
        filteredRecords.forEach((record: any, index: number) => {
          try {
            let data: any = {}
            try {
              data = typeof record.data === 'string' ? JSON.parse(record.data || '{}') : record.data
            } catch (e) {
              console.warn(`图表 ${chart.id} JSON解析失败:`, record.data)
              data = {}
            }
            
            // 确定X轴的分组键
            let xAxisKey: string
            if (xAxisField === 'auto') {
              // 自动模式：按创建时间分组
              const timeValue = getTimeValue(record)
              if (!timeValue) {
                console.warn(`图表 ${chart.id} 折线图: 记录缺少创建时间`)
                return
              }
              const year = timeValue.getFullYear()
              const month = String(timeValue.getMonth() + 1).padStart(2, '0')
              const day = String(timeValue.getDate()).padStart(2, '0')
              xAxisKey = `${year}-${month}-${day}`
            } else {
              // 使用指定的X轴字段
              xAxisKey = String(data[xAxisField] || '未知')
            }
            
            if (!groupedData[xAxisKey]) {
              groupedData[xAxisKey] = { values: [], count: 0 }
            }
            groupedData[xAxisKey].count++
            
            // 获取Y轴数值
            let yValue: number
            if (yAxisField && data[yAxisField] !== undefined && data[yAxisField] !== null) {
              const rawValue = data[yAxisField]
              yValue = parseFloat(String(rawValue))
              // 如果转换失败，尝试清理字符串（移除非数字字符）
              if (isNaN(yValue)) {
                const cleaned = String(rawValue).replace(/[^\d.-]/g, '')
                yValue = parseFloat(cleaned) || 0
              }
            } else {
              // 如果没有配置Y轴字段，尝试自动查找数值字段
              const weightValue = getFieldValue(data, ['货物重量(kg)', '提货重量(kg)', '转运货物量(kg)', '配送重量(kg)', '入库数量', '重量', '数量'], chartFormConfig)
              yValue = parseFloat(String(weightValue || '0')) || 0
            }
            
            if (index < 3) {
              console.log(`图表 ${chart.id} 示例数据 ${index}:`, {
                xAxisKey,
                yValue,
                xAxisField,
                yAxisField,
                data: Object.keys(data)
              })
            }
            
            // 添加到数值数组
            if (yValue > 0 || !yAxisField) {
              groupedData[xAxisKey].values.push(yValue > 0 ? yValue : 1)
            } else {
              groupedData[xAxisKey].values.push(1)
            }
          } catch (e) {
            console.error(`图表 ${chart.id} 处理记录失败:`, e, record)
          }
        })
        
        console.log(`图表 ${chart.id} 分组后的数据:`, {
          groupedKeys: Object.keys(groupedData),
          totalGroups: Object.keys(groupedData).length,
          sampleData: Object.entries(groupedData).slice(0, 3)
        })
        
        // 对X轴键进行排序
        const xAxisKeys = Object.keys(groupedData).sort()
        
        console.log(`图表 ${chart.id} 折线图数据处理:`, {
          xAxisKeys,
          keysCount: xAxisKeys.length,
          sampleData: groupedData[xAxisKeys[0]]
        })
        
        // 计算Y轴名称
        const yAxisName = (() => {
          if (!yAxisField) return '数值'
          if (chartFormConfig && Array.isArray(chartFormConfig.fields)) {
            const field = chartFormConfig.fields.find((f: any) => f.name === yAxisField)
            return field?.label || yAxisField
          }
          return yAxisField
        })()
        
        // 如果没有数据，显示空图表提示
        if (xAxisKeys.length === 0) {
          chart.option = {
            title: { text: chart.title, left: 'center' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: [] },
            yAxis: { type: 'value', name: yAxisName },
            series: [{ name: yAxisName, type: 'line', data: [], smooth: true, areaStyle: {} }],
            graphic: {
              type: 'text',
              left: 'center',
              top: 'middle',
              style: {
                text: '暂无数据',
                fontSize: 16,
                fill: '#999'
              }
            }
          }
        } else {
          // 计算每个分组的Y轴数值（总和或平均值）
          const trendData = xAxisKeys.map(key => {
            const groupData = groupedData[key]
            if (groupData.values.length > 0) {
              const total = groupData.values.reduce((sum: number, v: number) => sum + v, 0)
              return Math.round(total)
            }
            return groupData.count
          })
          
          // 格式化X轴标签（如果是日期，只显示月-日）
          const xAxisLabels = xAxisKeys.map(key => {
            if (xAxisField === 'auto' && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
              return key.substring(5) // 显示 MM-DD
            }
            return key
          })
          
          console.log(`图表 ${chart.id} 折线图最终数据:`, {
            xAxisLabels,
            trendData,
            dataLength: trendData.length,
            yAxisField
          })
          
          // 计算Y轴和series的name
          const yAxisName = (() => {
            if (!yAxisField) return '数值'
            if (chartFormConfig && Array.isArray(chartFormConfig.fields)) {
              const field = chartFormConfig.fields.find((f: any) => f.name === yAxisField)
              return field?.label || yAxisField
            }
            return yAxisField
          })()
          
          // 确保数据有效，如果只有1个数据点，至少显示这个点
          if (xAxisLabels.length === 0 || trendData.length === 0) {
            chart.option = {
              title: { text: chart.title, left: 'center' },
              tooltip: { trigger: 'axis' },
              xAxis: { type: 'category', data: [] },
              yAxis: { type: 'value', name: yAxisName },
              series: [{ name: yAxisName, type: 'line', data: [], smooth: true, areaStyle: {} }],
              graphic: {
                type: 'text',
                left: 'center',
                top: 'middle',
                style: { text: '暂无数据', fontSize: 16, fill: '#999' }
              }
            }
          } else {
            // 创建完整的 option 对象
            const newOption = {
  title: {
                text: chart.title, 
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'bold' }
  },
  tooltip: {
                trigger: 'axis', 
                axisPointer: { type: 'cross' },
                formatter: (params: any) => {
                  if (Array.isArray(params)) {
                    return `${params[0].name}<br/>${params[0].seriesName}: ${params[0].value}`
                  }
                  return `${params.name}<br/>${params.seriesName}: ${params.value}`
                }
  },
  xAxis: {
    type: 'category',
                data: xAxisLabels,
                boundaryGap: false,
                axisLabel: { rotate: 0 }
  },
  yAxis: {
                type: 'value', 
                name: yAxisName,
                splitLine: { show: true, lineStyle: { type: 'dashed' } }
  },
              series: [{ 
                name: yAxisName,
      type: 'line',
                data: trendData, 
      smooth: true,
                areaStyle: {
                  opacity: 0.3,
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: 'rgba(24, 144, 255, 0.5)' },
                      { offset: 1, color: 'rgba(24, 144, 255, 0.1)' }
                    ]
                  }
                },
                lineStyle: {
                  width: 2,
                  color: '#1890ff'
                },
                itemStyle: {
                  color: '#1890ff'
                },
                symbol: 'circle',
                symbolSize: 4,
                label: { show: false }
              }],
              grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '15%',
                containLabel: true
              },
              animation: true,
              animationDuration: 1000
            }
            
            // 使用深拷贝并重新赋值以触发响应式更新
            const optionCopy = JSON.parse(JSON.stringify(newOption))
            chart.option = optionCopy
            console.log(`图表 ${chart.id} option 已更新，xAxis.data.length:`, chart.option.xAxis.data.length)
            console.log(`图表 ${chart.id} option 详情:`, {
              xAxisData: chart.option.xAxis.data,
              seriesData: chart.option.series[0].data,
              seriesType: chart.option.series[0].type
            })
            
            // 强制触发 Vue 响应式更新 - 通过更新整个数组
            const chartIndex = charts.value.findIndex((c: any) => c.id === chart.id)
            if (chartIndex >= 0) {
              // 创建新的对象引用，确保 Vue 能检测到变化
              charts.value[chartIndex] = {
                ...charts.value[chartIndex],
                option: optionCopy,
                _updateKey: Date.now() // 添加更新键用于强制刷新
              }
            }
            
            // 等待多个 tick 确保 DOM 完全渲染和尺寸计算完成
            await nextTick()
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }
      }
    } else if (chart.type === 'bar') {
      // 柱状图：根据配置的字段生成数据
      const categoryData: any = {}
      
      filteredRecords.forEach((record: any) => {
        try {
          let data: any = {}
          try {
            data = typeof record.data === 'string' ? JSON.parse(record.data || '{}') : record.data
          } catch (e) {
            console.warn(`图表 ${chart.id} 柱状图 JSON解析失败:`, record.data)
            data = {}
          }
          
          // X轴：使用配置的字段或默认字段
          const category = xAxisField && xAxisField !== 'auto' 
            ? String(data[xAxisField] || '未知')
            : getFieldValue(data, ['出发城市', '出发机场', '目的城市', '目的地机场', '航线', '货物名称', '货物类型', '仓库编号'], chartFormConfig) || '未知'
          
          if (!categoryData[category]) {
            categoryData[category] = 0
          }
          
          // Y轴：使用配置的字段或默认字段
          let yValue: number
          if (yAxisField && data[yAxisField] !== undefined && data[yAxisField] !== null) {
            const rawValue = data[yAxisField]
            yValue = parseFloat(String(rawValue))
            // 如果转换失败，尝试清理字符串（移除非数字字符）
            if (isNaN(yValue)) {
              const cleaned = String(rawValue).replace(/[^\d.-]/g, '')
              yValue = parseFloat(cleaned) || 0
            }
          } else {
            const weightValue = getFieldValue(data, ['货物重量(kg)', '提货重量(kg)', '转运货物量(kg)', '配送重量(kg)', '入库数量', '重量', '数量'], chartFormConfig)
            yValue = parseFloat(String(weightValue || '1')) || 1
          }
          
          categoryData[category] += yValue
        } catch (e) {
          console.error(`图表 ${chart.id} 柱状图处理记录失败:`, e, record)
        }
      })
      
      const sortedCategories = Object.entries(categoryData)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10)
      
      const optionCopy = {
        title: { text: chart.title, left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: { 
          type: 'category', 
          data: sortedCategories.map((item: any) => item[0]), 
          axisLabel: { rotate: -45 } 
        },
        yAxis: { 
          type: 'value', 
          name: yAxisField || '数量' 
        },
        series: [{ 
          type: 'bar', 
          name: yAxisField || '数量',
          data: sortedCategories.map((item: any) => Math.round(item[1])) 
        }],
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '15%',
          containLabel: true
        }
      }
      chart.option = optionCopy
      
      // 强制触发 Vue 响应式更新
      const chartIndex = charts.value.findIndex((c: any) => c.id === chart.id)
      if (chartIndex >= 0) {
        charts.value[chartIndex] = {
          ...charts.value[chartIndex],
          option: optionCopy,
          _updateKey: Date.now()
        }
      }
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
    } else if (chart.type === 'pie') {
      // 饼图：根据配置的字段生成数据
      const distributionData: any = {}
      
      filteredRecords.forEach((record: any) => {
        try {
          let data: any = {}
          try {
            data = typeof record.data === 'string' ? JSON.parse(record.data || '{}') : record.data
          } catch (e) {
            console.warn(`图表 ${chart.id} 饼图 JSON解析失败:`, record.data)
            data = {}
          }
          
          // 分类字段：饼图必须指定分类字段，不能使用"auto"
          let category: string
          if (xAxisField && xAxisField !== 'auto') {
            category = String(data[xAxisField] || '其他')
          } else {
            // 如果没有指定分类字段，尝试从常用分类字段中获取
            category = getFieldValue(data, ['货物类型', '货物名称', '货物状态', '仓库编号', '仓库管理员', '航线', '运输状态', '危险等级'], chartFormConfig) || '其他'
          }
          
          // 确保分类不为空
          if (!category || category.trim() === '') {
            category = '其他'
          }
          
          if (!distributionData[category]) {
            distributionData[category] = 0
          }
          
          // 统计字段：使用Y轴字段统计数值，如果没有Y轴字段则统计记录数
          let yValue: number
          if (yAxisField && data[yAxisField] !== undefined && data[yAxisField] !== null) {
            const rawValue = data[yAxisField]
            yValue = parseFloat(String(rawValue))
            // 如果转换失败，尝试清理字符串（移除非数字字符）
            if (isNaN(yValue)) {
              const cleaned = String(rawValue).replace(/[^\d.-]/g, '')
              yValue = parseFloat(cleaned) || 0
            }
            // 如果Y轴字段值为0或负数，仍然累加（可能是合法的0值）
            distributionData[category] += yValue >= 0 ? yValue : 0
          } else {
            // 如果没有指定统计字段，则统计该分类的记录数量
            distributionData[category] = (distributionData[category] || 0) + 1
          }
        } catch (e) {
          console.error(`图表 ${chart.id} 饼图处理记录失败:`, e, record)
        }
      })
      
      const pieData = Object.entries(distributionData)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 8)
        .map((item: any) => ({ name: item[0], value: Math.round(item[1]) }))
      
      console.log(`图表 ${chart.id} 饼图数据:`, {
        totalCategories: Object.keys(distributionData).length,
        pieDataLength: pieData.length,
        sampleData: pieData.slice(0, 3)
      })
      
      // 如果没有数据，显示空数据提示
      if (pieData.length === 0) {
        chart.option = {
          title: { text: chart.title, left: 'center' },
          tooltip: { trigger: 'item' },
          series: [{ 
            type: 'pie', 
            radius: '60%', 
            data: [] 
          }],
          legend: {
            orient: 'vertical',
            left: 'left'
          },
          graphic: {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: '暂无数据',
              fontSize: 16,
              fill: '#999'
            }
          }
        }
      } else {
        const optionCopy = {
          title: { text: chart.title, left: 'center' },
          tooltip: { trigger: 'item' },
          series: [{ 
            type: 'pie', 
            radius: '60%', 
            name: yAxisField || '记录数',
            data: pieData,
            label: {
              show: true,
              formatter: '{b}: {c} ({d}%)'
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }],
          legend: {
            orient: 'vertical',
            left: 'left'
          }
        }
        chart.option = optionCopy
      }
      
      // 强制触发 Vue 响应式更新
      const chartIndex = charts.value.findIndex((c: any) => c.id === chart.id)
      if (chartIndex >= 0) {
        charts.value[chartIndex] = {
          ...charts.value[chartIndex],
          option: chart.option,
          _updateKey: Date.now()
        }
      }
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    // 更新数据源（基于图表自己的formConfigId）
    const chartFormConfigName = chart.formConfigId
      ? (formConfigs.value.find(c => c.id == chart.formConfigId)?.name || '全部表单')
      : '全部数据'
    chart.dataSource = chartFormConfigName
    
    // 确保 option 至少有基本结构（如果仍然为空）
    // 饼图不需要 xAxis，所以检查条件要区分图表类型
    const needsBasicOption = !chart.option || 
                             Object.keys(chart.option).length === 0 || 
                             (chart.type !== 'pie' && !chart.option.xAxis) ||
                             (chart.type === 'pie' && (!chart.option.series || chart.option.series.length === 0))
    
    if (needsBasicOption) {
      if (chart.type === 'pie') {
        // 饼图的默认结构
        chart.option = {
          title: { text: chart.title || '图表', left: 'center' },
          tooltip: { trigger: 'item' },
          series: [{
            type: 'pie',
            radius: '60%',
            data: []
          }],
          legend: {
            orient: 'vertical',
            left: 'left'
          },
          graphic: {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: '暂无数据',
              fontSize: 16,
              fill: '#999'
            }
          }
        }
      } else {
        // 其他图表的默认结构
        chart.option = {
          title: { text: chart.title || '图表', left: 'center' },
          tooltip: { trigger: 'axis' },
          xAxis: { type: 'category', data: ['暂无数据'] },
          yAxis: { type: 'value' },
          series: [{
            type: chart.type === 'bar' ? 'bar' : 'line',
            data: []
          }],
          graphic: {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: '暂无数据',
              fontSize: 16,
              fill: '#999'
            }
          }
        }
      }
    }
    
    console.log(`图表 ${chart.id} option 设置完成:`, {
      hasTitle: !!chart.option.title,
      hasXAxis: !!chart.option.xAxis,
      hasSeries: !!chart.option.series && chart.option.series.length > 0,
      xAxisDataLength: chart.option.xAxis?.data?.length || 0
    })
  } catch (error) {
    console.error('加载数据失败:', error)
    // 即使出错也显示一个基本的图表结构
    chart.option = {
      title: { text: chart.title || '图表', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: [],
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
          text: '数据加载失败',
          fontSize: 16,
          fill: '#f56c6c'
        }
      }
    }
    ElMessage.error('加载数据失败: ' + (error instanceof Error ? error.message : String(error)))
  } finally {
    loading.value = false
  }
}

// 格式化单元格值
const formatCellValue = (value: any, type?: string) => {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  
  if (type === 'date') {
    try {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('zh-CN')
      }
    } catch (e) {
      // ignore
    }
  }
  
  if (type === 'number') {
    const num = parseFloat(String(value))
    if (!isNaN(num)) {
      return num.toLocaleString('zh-CN')
    }
  }
  
  return String(value)
}

const onChartClick = async (params: any, chart: any) => {
  try {
    clickedChart.value = chart
    
    // 获取图表关联的表单配置
    let chartFormConfig: any = null
    if (chart.formConfigId) {
      chartFormConfig = formConfigs.value.find(c => c.id == chart.formConfigId)
      if (chartFormConfig && typeof chartFormConfig.fields === 'string') {
        try {
          chartFormConfig.fields = JSON.parse(chartFormConfig.fields)
        } catch (e) {
          console.error('解析表单字段失败:', e)
        }
      }
    }
    
    // 构建查询条件
    let sql = `
      SELECT 
        cr.id,
        cr.data,
        cr.created_at,
        cr.config_id,
        fc.name as form_name
      FROM cargo_records cr
      LEFT JOIN form_configs fc ON cr.config_id = fc.id
      WHERE 1=1
    `
    const queryParams: any[] = []
    
    // 根据图表的formConfigId过滤
    if (chart.formConfigId) {
      sql += ' AND cr.config_id = ?'
      queryParams.push(typeof chart.formConfigId === 'string' ? parseInt(chart.formConfigId) : chart.formConfigId)
    }
    
    // 根据点击的X轴值过滤数据
    if (params.name) {
      if (chart.type === 'pie') {
        // 饼图：直接匹配分类字段的值
        if (chart.xAxisField && chart.xAxisField !== 'auto') {
          // 需要在数据中查找匹配的记录
          sql += ' AND cr.data LIKE ?'
          queryParams.push(`%"${chart.xAxisField}":"${params.name}"%`)
        }
      } else if (chart.xAxisField && chart.xAxisField !== 'auto') {
        // 如果指定了X轴字段，查找该字段值匹配的记录
        sql += ' AND cr.data LIKE ?'
        queryParams.push(`%"${chart.xAxisField}":"${params.name}"%`)
      } else {
        // 默认按时间过滤（自动模式）
        sql += ' AND cr.created_at LIKE ?'
        queryParams.push(`${params.name}%`)
      }
    }
    
    sql += ' ORDER BY cr.created_at DESC LIMIT 100'
    
    const records = await window.electronAPI.dbQuery(sql, queryParams)
    
    if (!records || records.length === 0) {
      historyData.value = []
      historyTableColumns.value = []
      historyVisible.value = true
      ElMessage.info('没有找到相关数据')
      return
    }
    
    // 处理记录数据
    const processedRecords: any[] = []
    
    records.forEach((record: any) => {
      try {
        let data: any = {}
        try {
          data = typeof record.data === 'string' ? JSON.parse(record.data || '{}') : record.data
        } catch (e) {
          console.warn('解析记录数据失败:', record.data)
          data = {}
        }
        
        // 构建显示的数据对象
        const displayData: any = {
          id: record.id,
          created_at: record.created_at,
          config_id: record.config_id,
          form_name: record.form_name || '未知表单',
          ...data  // 展开所有字段
        }
        
        processedRecords.push(displayData)
      } catch (e) {
        console.error('处理记录失败:', e, record)
      }
    })
    
    historyData.value = processedRecords
    
    // 根据表单配置生成表格列
    if (chartFormConfig && chartFormConfig.fields && Array.isArray(chartFormConfig.fields)) {
      // 使用表单配置的字段
      historyTableColumns.value = chartFormConfig.fields.map((field: any) => ({
        prop: field.name,
        label: field.label || field.name,
        type: field.type,
        width: field.type === 'date' ? 180 : field.type === 'number' ? 120 : 150
      }))
    } else if (processedRecords.length > 0) {
      // 如果没有表单配置，从第一条记录中提取字段
      const firstRecord = processedRecords[0]
      const excludeKeys = ['id', 'created_at', 'config_id', 'form_name']
      historyTableColumns.value = Object.keys(firstRecord)
        .filter(key => !excludeKeys.includes(key))
        .map(key => ({
          prop: key,
          label: key,
          type: typeof firstRecord[key] === 'number' ? 'number' : 'text',
          width: typeof firstRecord[key] === 'number' ? 120 : 150
        }))
    } else {
      historyTableColumns.value = []
    }
    
    historyVisible.value = true
  } catch (error) {
    console.error('加载历史数据失败:', error)
    ElMessage.error('加载历史数据失败: ' + (error instanceof Error ? error.message : String(error)))
  }
}

onMounted(async () => {
  // 先加载表单配置
  formConfigs.value = await formConfigStore.getConfigs()
  
  // 确保每个图表都有初始的 option（防止显示空白）
  // 从localStorage加载的图表需要重新初始化option
  charts.value.forEach(chart => {
    // 确保有必要的字段（向后兼容）
    if (chart.formConfigId === undefined) chart.formConfigId = ''
    if (chart.xAxisField === undefined) chart.xAxisField = 'auto'
    if (chart.yAxisField === undefined) chart.yAxisField = ''
    
    // 从localStorage加载的图表没有option，需要重新创建
    // 即使有option，也要确保是独立的对象引用
    if (!chart.option || Object.keys(chart.option).length === 0) {
      // 设置一个临时的空图表结构，等待数据加载
      chart.option = {
        title: { text: chart.title, left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: chart.type === 'pie' 
          ? [{ type: 'pie', radius: '60%', data: [] }]
          : chart.type === 'bar'
          ? [{ type: 'bar', data: [] }]
          : chart.type === 'kline'
          ? [{ type: 'candlestick', data: [] }]
          : [{ type: 'line', data: [], smooth: true }],
        graphic: {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: {
            text: '正在加载数据...',
            fontSize: 14,
            fill: '#999'
          }
        }
      }
    } else {
      // 确保option是深拷贝，避免共享引用
      chart.option = JSON.parse(JSON.stringify(chart.option))
    }
  })
  
  // 然后加载真实数据 - 等待 DOM 完全渲染后再加载
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 200)) // 等待 el-card 等容器完全渲染
  
  for (const chart of charts.value) {
    try {
      await loadChartData(chart)
      // 等待DOM更新，确保图表组件能接收到新的option
      await nextTick()
      // 再等待一下，确保ECharts渲染完成和尺寸计算
      await new Promise(resolve => setTimeout(resolve, 150))
    } catch (error) {
      console.error(`加载图表 ${chart.id} 数据失败:`, error)
    }
  }
  
  // 启动自动刷新
  updateRefresh()
  
  console.log('所有图表数据加载完成，图表数量:', charts.value.length)
  console.log('图表状态:', charts.value.map(c => ({
    id: c.id,
    title: c.title,
    type: c.type,
    hasOption: !!c.option,
    xAxisDataLength: c.option?.xAxis?.data?.length || 0
  })))
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 4px;
}

.dashboard-header h2 {
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.chart-meta {
  margin-top: 5px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>
