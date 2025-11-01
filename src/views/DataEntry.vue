<template>
  <div class="data-entry">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>数据录入</span>
          <div style="display: flex; gap: 10px; align-items: center;">
            <el-button type="warning" size="small" @click="handleImportExcelData">导入Excel数据</el-button>
            <el-button type="warning" size="small" @click="handleImportFolderData">批量导入文件夹</el-button>
            <el-select v-model="selectedConfigId" style="width: 200px" @change="loadConfig">
              <el-option label="请选择表单配置" value="" />
              <el-option
                v-for="config in configs"
                :key="config.id"
                :label="config.name"
                :value="config.id"
              />
            </el-select>
          </div>
        </div>
      </template>
      
      <el-form :model="formData" label-width="120px" v-if="configFields.length > 0">
        <el-form-item
          v-for="field in configFields"
          :key="field.name"
          :label="field.name"
        >
          <el-input
            v-if="field.type === 'text'"
            v-model="formData[field.name]"
          />
          <el-input-number
            v-else-if="field.type === 'number'"
            v-model="formData[field.name]"
            style="width: 100%"
          />
          <el-date-picker
            v-else-if="field.type === 'date'"
            v-model="formData[field.name]"
            type="date"
            style="width: 100%"
          />
          <el-select
            v-else-if="field.type === 'select'"
            v-model="formData[field.name]"
            style="width: 100%"
            placeholder="请选择"
          >
            <el-option
              v-for="option in (field.options || [])"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit">提交</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
      
      <el-empty v-else description="请先选择表单配置" />
    </el-card>
    
    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>数据列表</span>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索数据（支持所有字段）"
              style="width: 250px; margin-right: 10px"
              clearable
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select 
              v-model="listFilterConfigId" 
              style="width: 200px" 
              clearable
              placeholder="筛选表单配置"
              @change="handleFilterChange"
            >
              <el-option label="全部表单" value="" />
              <el-option
                v-for="config in configs"
                :key="config.id"
                :label="config.name"
                :value="config.id"
              />
            </el-select>
          </div>
        </div>
      </template>
      <el-table 
        :data="paginatedRecords" 
        style="width: 100%" 
        v-if="filteredRecords.length > 0" 
        v-loading="loading"
        @sort-change="handleSortChange"
      >
        <el-table-column 
          prop="id" 
          label="ID" 
          width="80" 
          fixed="left" 
          sortable="custom"
          :sort-orders="['ascending', 'descending']"
        />
        <el-table-column 
          v-if="!listFilterConfigId" 
          prop="config_id" 
          label="表单ID" 
          width="100"
          sortable="custom"
          :sort-orders="['ascending', 'descending']"
        />
        <el-table-column
          v-for="column in tableColumns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth || 120"
          sortable="custom"
          :sort-orders="['ascending', 'descending']"
        >
          <template #default="{ row }">
            <span v-if="row[column.prop] !== undefined && row[column.prop] !== null">
              {{ formatCellValue(row[column.prop], column.type) }}
            </span>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column 
          v-if="!listFilterConfigId" 
          prop="dataStr" 
          label="数据（JSON）" 
          width="300"
          show-overflow-tooltip
          sortable="custom"
          :sort-orders="['ascending', 'descending']"
        >
          <template #default="{ row }">
            <span class="json-preview">{{ row.dataStr || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column 
          prop="created_at" 
          label="创建时间" 
          width="180" 
          sortable="custom"
          :sort-orders="['ascending', 'descending']"
        />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else :description="searchKeyword ? '未找到匹配的数据' : '暂无数据，请先录入数据或选择表单配置'" />
      
      <!-- 显示总数信息 -->
      <div v-if="filteredRecords.length > 0" style="padding: 10px 0; color: #666; font-size: 14px;">
        共 {{ filteredRecords.length }} 条记录
      </div>
      
      <!-- 编辑对话框 -->
      <el-dialog v-model="editDialogVisible" :title="editDialogTitle" width="600px" @close="handleEditCancel">
        <el-form :model="editFormData" label-width="120px" v-if="editConfigFields.length > 0">
          <el-form-item
            v-for="field in editConfigFields"
            :key="field.name"
            :label="field.name"
          >
            <el-input
              v-if="field.type === 'text'"
              v-model="editFormData[field.name]"
            />
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="editFormData[field.name]"
              style="width: 100%"
            />
            <el-date-picker
              v-else-if="field.type === 'date'"
              v-model="editFormData[field.name]"
              type="date"
              style="width: 100%"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
            <el-select
              v-else-if="field.type === 'select'"
              v-model="editFormData[field.name]"
              style="width: 100%"
              placeholder="请选择"
            >
              <el-option
                v-for="option in (field.options || [])"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="handleEditCancel">取消</el-button>
          <el-button type="primary" @click="handleEditSubmit" :loading="editLoading">保存</el-button>
        </template>
      </el-dialog>
      
      <!-- 分页组件 -->
      <div class="pagination-container" v-if="filteredRecords.length > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="sortedRecords.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useFormConfigStore } from '@/stores/formConfig'
import { useDataEntryStore } from '@/stores/dataEntry'

const formConfigStore = useFormConfigStore()
const dataEntryStore = useDataEntryStore()

const configs = ref<any[]>([])
const selectedConfigId = ref('')
const configFields = ref<any[]>([])
const formData = ref<any>({})
const records = ref<any[]>([])
const listFilterConfigId = ref('')
const tableColumns = ref<any[]>([])
const displayRecords = ref<any[]>([])
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const editDialogVisible = ref(false)
const editFormData = ref<any>({})
const editConfigFields = ref<any[]>([])
const editRecordId = ref<number | null>(null)
const editLoading = ref(false)
const editDialogTitle = ref('编辑数据')

// 排序状态
const sortState = ref<{ prop: string | null; order: 'ascending' | 'descending' | null }>({
  prop: 'created_at',
  order: 'descending'
})

// 搜索过滤后的记录
const filteredRecords = computed(() => {
  if (!searchKeyword.value.trim()) {
    return displayRecords.value
  }
  
  const keyword = searchKeyword.value.toLowerCase().trim()
  return displayRecords.value.filter((record: any) => {
    // 搜索所有字段的值
    return Object.values(record).some((value: any) => {
      if (value === null || value === undefined) return false
      const strValue = String(value).toLowerCase()
      return strValue.includes(keyword)
    })
  })
})

// 排序后的记录
const sortedRecords = computed(() => {
  if (!sortState.value.prop || !sortState.value.order) {
    return filteredRecords.value
  }
  
  const prop = sortState.value.prop
  const order = sortState.value.order
  
  // 获取列的类型信息
  let columnType: string | undefined
  if (prop === 'id' || prop === 'config_id') {
    columnType = 'number'
  } else if (prop === 'created_at') {
    columnType = 'date'
  } else if (prop === 'dataStr') {
    columnType = 'text'
  } else {
    // 从 tableColumns 中查找类型
    const column = tableColumns.value.find((col: any) => col.prop === prop)
    columnType = column?.type
  }
  
  // 创建副本进行排序
  const sorted = [...filteredRecords.value]
  
  sorted.sort((a: any, b: any) => {
    let result = 0
    
    if (prop === 'dataStr') {
      result = sortStringColumn(a, b, prop)
    } else {
      result = sortColumn(a, b, prop, columnType)
    }
    
    // 如果是降序，反转结果
    return order === 'descending' ? -result : result
  })
  
  return sorted
})

// 分页后的记录
const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return sortedRecords.value.slice(start, end)
})

// 计算表格列
const buildTableColumns = (configId: string | number | null) => {
  if (!configId) {
    // 如果没有选择表单，显示通用列
    tableColumns.value = []
    return
  }
  
  const config = configs.value.find(c => c.id == configId)
  if (!config) {
    tableColumns.value = []
    return
  }
  
  try {
    const fields = JSON.parse(config.fields)
    tableColumns.value = fields.map((field: any) => ({
      prop: field.name,
      label: field.name,
      type: field.type,
      width: field.type === 'date' ? 180 : field.type === 'number' ? 150 : undefined,
      minWidth: field.type === 'date' ? 180 : 120
    }))
  } catch (e) {
    console.error('解析表单字段失败:', e)
    tableColumns.value = []
  }
}

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1 // 搜索时重置到第一页
}

// 处理筛选变化
const handleFilterChange = async (configId: string | number | null) => {
  loading.value = true
  currentPage.value = 1 // 筛选时重置到第一页
  searchKeyword.value = '' // 清空搜索关键词
  
  try {
    if (configId) {
      // 筛选特定表单的数据
      records.value = await dataEntryStore.getRecords(configId)
      buildTableColumns(configId)
    } else {
      // 显示所有数据
      records.value = await dataEntryStore.getAllRecords()
      tableColumns.value = []
    }
    processDisplayRecords()
  } finally {
    loading.value = false
  }
}

// 格式化单元格值
const formatCellValue = (value: any, type?: string) => {
  if (value === null || value === undefined) return '-'
  if (type === 'date' && value) {
    if (typeof value === 'string') {
      return value.split('T')[0] || value
    }
  }
  return String(value)
}

// 排序函数
const sortColumn = (a: any, b: any, prop: string, type?: string) => {
  const aVal = a[prop]
  const bVal = b[prop]
  
  // 处理空值
  if (aVal === null || aVal === undefined || aVal === '') {
    return bVal === null || bVal === undefined || bVal === '' ? 0 : 1
  }
  if (bVal === null || bVal === undefined || bVal === '') {
    return -1
  }
  
  // 根据类型排序
  if (type === 'number') {
    const aNum = parseFloat(String(aVal))
    const bNum = parseFloat(String(bVal))
    if (isNaN(aNum) && isNaN(bNum)) return 0
    if (isNaN(aNum)) return 1
    if (isNaN(bNum)) return -1
    return aNum - bNum
  }
  
  if (type === 'date') {
    const aDate = new Date(aVal)
    const bDate = new Date(bVal)
    if (isNaN(aDate.getTime()) && isNaN(bDate.getTime())) return 0
    if (isNaN(aDate.getTime())) return 1
    if (isNaN(bDate.getTime())) return -1
    return aDate.getTime() - bDate.getTime()
  }
  
  // 文本类型：字符串比较
  return String(aVal).localeCompare(String(bVal), 'zh-CN')
}

// 字符串列排序
const sortStringColumn = (a: any, b: any, prop: string) => {
  const aVal = a[prop] || ''
  const bVal = b[prop] || ''
  return String(aVal).localeCompare(String(bVal), 'zh-CN')
}

// 处理表格排序变化
const handleSortChange = ({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }) => {
  sortState.value = {
    prop: order ? prop : null,
    order: order
  }
  // 排序变化时重置到第一页
  currentPage.value = 1
}

// 处理显示数据：将JSON字符串解析为对象
const processDisplayRecords = () => {
  if (!listFilterConfigId.value) {
    // 如果没有筛选，显示原始数据（显示JSON字符串）
    displayRecords.value = records.value.map((record: any) => {
      try {
        const dataObj = JSON.parse(record.data || '{}')
        return {
          ...record,
          data: dataObj,
          dataStr: JSON.stringify(dataObj, null, 2).substring(0, 200) + (JSON.stringify(dataObj).length > 200 ? '...' : '')
        }
      } catch (e) {
        return {
          ...record,
          data: {},
          dataStr: record.data || '-'
        }
      }
    })
    return
  }
  
  // 如果有筛选，按字段展开
  displayRecords.value = records.value.map((record: any) => {
    try {
      const data = JSON.parse(record.data || '{}')
      return {
        id: record.id,
        config_id: record.config_id,
        created_at: record.created_at,
        ...data
      }
    } catch (e) {
      console.error('解析数据失败:', e, record)
      return {
        id: record.id,
        config_id: record.config_id,
        created_at: record.created_at
      }
    }
  })
}

const loadConfig = async () => {
  if (!selectedConfigId.value) {
    configFields.value = []
    return
  }
  const config = configs.value.find(c => c.id === selectedConfigId.value)
  if (config) {
    configFields.value = JSON.parse(config.fields)
    formData.value = {}
    await loadRecords()
  }
}

const handleSubmit = async () => {
  if (!selectedConfigId.value) {
    ElMessage.warning('请先选择表单配置')
    return
  }
  await dataEntryStore.createRecord({
    config_id: selectedConfigId.value,
    data: JSON.stringify(formData.value)
  })
  ElMessage.success('提交成功')
  handleReset()
  loadRecords()
}

const handleReset = () => {
  formData.value = {}
}

// 编辑数据
const handleEdit = async (row: any) => {
  editRecordId.value = row.id
  
  // 获取该记录的表单配置
  const configId = row.config_id
  const config = configs.value.find(c => c.id == configId)
  
  if (!config) {
    ElMessage.error('无法找到该记录的表单配置')
    return
  }
  
  try {
    editConfigFields.value = JSON.parse(config.fields)
    
    // 解析当前记录的数据
    let recordData: any = {}
    if (listFilterConfigId.value) {
      // 如果已经按字段展开，直接使用
      recordData = { ...row }
      delete recordData.id
      delete recordData.config_id
      delete recordData.created_at
    } else {
      // 如果是JSON格式，需要解析
      try {
        recordData = JSON.parse(row.data || '{}')
      } catch (e) {
        recordData = row.data || {}
      }
    }
    
    editFormData.value = { ...recordData }
    editDialogTitle.value = `编辑数据 - ${config.name}`
    editDialogVisible.value = true
  } catch (e) {
    console.error('加载编辑数据失败:', e)
    ElMessage.error('加载编辑数据失败')
  }
}

// 提交编辑
const handleEditSubmit = async () => {
  if (!editRecordId.value) return
  
  editLoading.value = true
  try {
    await dataEntryStore.updateRecord(editRecordId.value, {
      data: JSON.stringify(editFormData.value)
    })
    ElMessage.success('更新成功')
    editDialogVisible.value = false
    await loadRecords()
  } catch (e: any) {
    console.error('更新失败:', e)
    ElMessage.error('更新失败: ' + (e.message || '未知错误'))
  } finally {
    editLoading.value = false
  }
}

// 取消编辑
const handleEditCancel = () => {
  editDialogVisible.value = false
  editFormData.value = {}
  editConfigFields.value = []
  editRecordId.value = null
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
      type: 'warning'
    })
    await dataEntryStore.deleteRecord(row.id)
    ElMessage.success('删除成功')
    loadRecords()
  } catch (e) {
    // 用户取消
  }
}

// 分页处理
const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handlePageChange = (page: number) => {
  currentPage.value = page
}

const loadRecords = async () => {
  loading.value = true
  try {
    if (selectedConfigId.value) {
      records.value = await dataEntryStore.getRecords(selectedConfigId.value)
    }
    // 如果当前有筛选，也要更新列表
    if (listFilterConfigId.value) {
      await handleFilterChange(listFilterConfigId.value)
    } else {
      processDisplayRecords()
    }
  } finally {
    loading.value = false
  }
}

// 导入Excel数据
const handleImportExcelData = async () => {
  try {
    const filePathResult = await window.electronAPI.selectFile({
      filters: [
        { name: 'Excel文件', extensions: ['xlsx', 'xls'] }
      ]
    })
    
    if (!filePathResult || Array.isArray(filePathResult)) {
      return // 用户取消或选择了多个文件
    }
    
    const filePath = filePathResult as string
    
    const loading = ElMessage({
      message: '正在导入Excel数据，请稍候...',
      type: 'info',
      duration: 0,
      showClose: false
    })
    
    try {
      const result = await window.electronAPI.importExcelFile(filePath, {
        importFormConfig: false, // 只导入数据，不导入表单配置
        importData: true
      })
      
      loading.close()
      
      if (result.success) {
        let message = `导入成功！\n`
        if (result.records && result.records > 0) {
          message += `• 导入 ${result.records} 条数据记录\n`
        }
        
        if (result.errors && result.errors.length > 0) {
          message += `\n警告：\n${result.errors.slice(0, 5).join('\n')}`
          if (result.errors.length > 5) {
            message += `\n...还有 ${result.errors.length - 5} 个错误`
          }
        }
        
        ElMessage.success({
          message,
          duration: 5000
        })
        
        await loadRecords()
      } else {
        ElMessage.error('导入失败: ' + (result.error || '未知错误'))
      }
    } catch (error: any) {
      loading.close()
      ElMessage.error('导入失败: ' + (error.message || '未知错误'))
    }
  } catch (e) {
    // 用户取消或选择失败
  }
}

// 批量导入文件夹数据
const handleImportFolderData = async () => {
  try {
    const folderPath = await window.electronAPI.selectFolder()
    
    if (!folderPath) {
      return // 用户取消
    }
    
    const loading = ElMessage({
      message: '正在批量导入文件夹数据，请稍候...',
      type: 'info',
      duration: 0,
      showClose: false
    })
    
    try {
      const result = await window.electronAPI.importExcelFolder(folderPath, {
        importFormConfig: false, // 只导入数据，不导入表单配置
        importData: true
      })
      
      loading.close()
      
      if (result.success) {
        let message = `批量导入完成！\n`
        message += `• 共处理 ${result.totalFiles} 个文件\n`
        message += `• 成功 ${result.successFiles} 个\n`
        if (result.failedFiles && result.failedFiles.length > 0) {
          message += `• 失败 ${result.failedFiles.length} 个\n`
        }
        if (result.totalRecords && result.totalRecords > 0) {
          message += `• 导入 ${result.totalRecords} 条数据记录\n`
        }
        
        if (result.errors && result.errors.length > 0) {
          message += `\n警告：\n${result.errors.slice(0, 5).join('\n')}`
          if (result.errors.length > 5) {
            message += `\n...还有 ${result.errors.length - 5} 个错误`
          }
        }
        
        ElMessage.success({
          message,
          duration: 7000
        })
        
        await loadRecords()
      } else {
        ElMessage.error('批量导入失败: ' + (result.error || '未知错误'))
      }
    } catch (error: any) {
      loading.close()
      ElMessage.error('批量导入失败: ' + (error.message || '未知错误'))
    }
  } catch (e) {
    // 用户取消或选择失败
  }
}

onMounted(async () => {
  loading.value = true
  try {
    configs.value = await formConfigStore.getConfigs()
    records.value = await dataEntryStore.getAllRecords()
    processDisplayRecords()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.data-entry {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.text-gray {
  color: #999;
}

.json-preview {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #666;
  word-break: break-all;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination-container {
  padding: 20px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #ebeef5;
}
</style>

