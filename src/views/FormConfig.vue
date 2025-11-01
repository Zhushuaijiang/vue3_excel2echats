<template>
  <div class="form-config">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>自定义表单字段配置</span>
          <div class="header-actions">
            <el-button type="warning" @click="handleImportExcel">导入Excel文件</el-button>
            <el-button type="warning" @click="handleImportFolder">批量导入文件夹</el-button>
            <el-button type="success" @click="handleInitData">一键初始化</el-button>
            <el-button type="primary" @click="handleAdd">新增配置</el-button>
            <el-button type="danger" @click="handleClearAll">清空所有数据</el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="configs" style="width: 100%">
        <el-table-column prop="name" label="配置名称" />
        <el-table-column prop="fields" label="字段数量" width="120">
          <template #default="{ row }">
            {{ JSON.parse(row.fields).length }} 个
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加选项对话框 -->
    <el-dialog v-model="optionDialogVisible" title="添加下拉选项" width="500px">
      <el-form :model="optionForm" label-width="80px">
        <el-form-item label="选项标签">
          <el-input v-model="optionForm.label" placeholder="显示给用户的文本" />
        </el-form-item>
        <el-form-item label="选项值">
          <el-input v-model="optionForm.value" placeholder="实际保存的值" />
        </el-form-item>
        <el-form-item>
          <el-alert
            type="info"
            :closable="false"
            style="margin-bottom: 10px;"
          >
            <template #default>
              <div>提示：如果选项值留空，将使用选项标签作为值</div>
            </template>
          </el-alert>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="optionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addOption">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="900px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="配置名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="字段配置">
          <el-button @click="addField" style="margin-bottom: 10px">添加字段</el-button>
          <el-table :data="form.fields" style="width: 100%">
            <el-table-column label="字段名">
              <template #default="{ row, $index }">
                <el-input v-model="row.name" placeholder="请输入字段名" />
              </template>
            </el-table-column>
            <el-table-column label="类型" width="120">
              <template #default="{ row, $index }">
                <el-select v-model="row.type" @change="handleTypeChange(row, $index)">
                  <el-option label="文本" value="text" />
                  <el-option label="数字" value="number" />
                  <el-option label="日期" value="date" />
                  <el-option label="下拉框" value="select" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="选项配置" width="300">
              <template #default="{ row, $index }">
                <div v-if="row.type === 'select'">
                  <el-tag
                    v-for="(option, optIndex) in (row.options || [])"
                    :key="optIndex"
                    closable
                    @close="removeOption(row, optIndex)"
                    style="margin-right: 5px; margin-bottom: 5px;"
                  >
                    {{ option.label || option.value }}
                  </el-tag>
                  <el-button 
                    size="small" 
                    type="primary" 
                    plain
                    @click="showAddOptionDialog(row, $index)"
                    style="margin-top: 5px;"
                  >
                    + 添加选项
                  </el-button>
                </div>
                <span v-else class="text-gray">-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ $index }">
                <el-button size="small" type="danger" @click="removeField($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFormConfigStore } from '@/stores/formConfig'

const formConfigStore = useFormConfigStore()
const configs = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)

const form = ref({
  name: '',
  fields: []
})

// 选项配置相关
const optionDialogVisible = ref(false)
const currentEditingField = ref<any>(null)
const currentEditingFieldIndex = ref<number>(-1)
const optionForm = ref({
  label: '',
  value: ''
})

const dialogTitle = computed(() => isEdit.value ? '编辑配置' : '新增配置')

const addField = () => {
  form.value.fields.push({ name: '', type: 'text' })
}

const handleTypeChange = (row: any, index: number) => {
  // 当类型改为 select 时，初始化 options 数组
  if (row.type === 'select' && !row.options) {
    row.options = []
  }
  // 当类型改为其他类型时，清除 options
  if (row.type !== 'select') {
    delete row.options
  }
}

const showAddOptionDialog = (row: any, index: number) => {
  currentEditingField.value = row
  currentEditingFieldIndex.value = index
  optionForm.value = { label: '', value: '' }
  optionDialogVisible.value = true
}

const addOption = () => {
  if (!optionForm.value.label) {
    ElMessage.warning('请输入选项标签')
    return
  }
  
  if (!currentEditingField.value) {
    ElMessage.error('未找到要编辑的字段')
    return
  }
  
  if (!currentEditingField.value.options) {
    currentEditingField.value.options = []
  }
  
  const optionValue = optionForm.value.value || optionForm.value.label
  currentEditingField.value.options.push({
    label: optionForm.value.label,
    value: optionValue
  })
  
  optionDialogVisible.value = false
  optionForm.value = { label: '', value: '' }
  ElMessage.success('选项添加成功')
}

const removeOption = (row: any, optIndex: number) => {
  if (row.options && row.options.length > optIndex) {
    row.options.splice(optIndex, 1)
    ElMessage.success('选项已删除')
  }
}

const removeField = (index: number) => {
  form.value.fields.splice(index, 1)
}

const handleAdd = () => {
  isEdit.value = false
  currentId.value = null
  form.value = { name: '', fields: [] }
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  currentId.value = row.id
  const fields = JSON.parse(row.fields)
  // 确保每个 select 类型字段都有 options 数组（即使为空）
  fields.forEach((field: any) => {
    if (field.type === 'select' && !field.options) {
      field.options = []
    }
  })
  form.value = {
    name: row.name,
    fields: fields
  }
  dialogVisible.value = true
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个配置吗？删除后将同时删除所有关联的数据记录，此操作不可恢复！',
      '警告',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )
    await formConfigStore.deleteConfig(row.id)
    ElMessage.success('删除成功')
    loadConfigs()
  } catch (e) {
    // 用户取消或删除失败
    if (e !== 'cancel') {
      ElMessage.error('删除失败：' + (e instanceof Error ? e.message : '未知错误'))
    }
  }
}

const handleInitData = async () => {
  try {
    const result = await ElMessageBox.confirm(
      '此操作将初始化示例表单配置和模拟数据：\n\n' +
      '• 8 个表单配置模板\n' +
      '• 每个表单约 20-50 条模拟数据\n\n' +
      '如果已存在相同名称的表单配置，将不会重复创建。\n\n' +
      '确定要继续吗？',
      '初始化数据',
      {
        type: 'info',
        confirmButtonText: '确定初始化',
        cancelButtonText: '取消',
        distinguishCancelAndClose: true
      }
    )
    
    if (result === 'confirm') {
      const loading = ElMessage({
        message: '正在初始化数据，请稍候...',
        type: 'info',
        duration: 0,
        showClose: false
      })
      
      try {
        const data = await window.electronAPI.initSampleData({ includeSampleData: true })
        
        loading.close()
        
        if (data.success) {
          ElMessage.success({
            message: data.message,
            duration: 5000
          })
          
          loadConfigs()
        } else {
          ElMessage.error('初始化失败')
        }
      } catch (error) {
        loading.close()
        ElMessage.error('初始化失败：' + (error instanceof Error ? error.message : '未知错误'))
      }
    }
  } catch (e) {
    // 用户取消
    if (e !== 'cancel') {
      ElMessage.error('初始化失败：' + (e instanceof Error ? e.message : '未知错误'))
    }
  }
}

const handleClearAll = async () => {
  try {
    await ElMessageBox.confirm(
      '⚠️ 警告：此操作将清空数据库中的所有数据！\n\n' +
      '包括：\n' +
      '• 所有表单配置\n' +
      '• 所有数据记录\n' +
      '• 所有大屏配置\n' +
      '• 所有AI模板\n\n' +
      '此操作不可恢复，确定要继续吗？',
      '危险操作',
      {
        type: 'error',
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    const result = await window.electronAPI.clearAllData()
    
    if (result.success) {
      const details = Object.entries(result.details)
        .filter(([_, count]) => count > 0)
        .map(([table, count]) => `${table}: ${count} 条`)
        .join('\n')
      
      ElMessage.success({
        message: `清空成功！共删除 ${result.totalDeleted} 条记录\n${details}`,
        duration: 5000
      })
      
      loadConfigs()
    } else {
      ElMessage.error('清空失败')
    }
  } catch (e) {
    // 用户取消或操作失败
    if (e !== 'cancel') {
      ElMessage.error('清空失败：' + (e instanceof Error ? e.message : '未知错误'))
    }
  }
}

const handleSave = async () => {
  if (!form.value.name) {
    ElMessage.warning('请输入配置名称')
    return
  }
  if (form.value.fields.length === 0) {
    ElMessage.warning('请至少添加一个字段')
    return
  }
  
  if (isEdit.value && currentId.value) {
    await formConfigStore.updateConfig(currentId.value, {
      name: form.value.name,
      fields: JSON.stringify(form.value.fields)
    })
    ElMessage.success('更新成功')
  } else {
    await formConfigStore.createConfig({
      name: form.value.name,
      fields: JSON.stringify(form.value.fields)
    })
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  loadConfigs()
}

const loadConfigs = async () => {
  configs.value = await formConfigStore.getConfigs()
}

// 导入Excel文件
const handleImportExcel = async () => {
  try {
    const filePath = await window.electronAPI.selectFile({
      filters: [
        { name: 'Excel文件', extensions: ['xlsx', 'xls'] }
      ]
    })
    
    if (!filePath) {
      return // 用户取消
    }
    
    const loading = ElMessage({
      message: '正在导入Excel文件，请稍候...',
      type: 'info',
      duration: 0,
      showClose: false
    })
    
    try {
      const result = await window.electronAPI.importExcelFile(filePath, {
        importFormConfig: true,
        importData: true
      })
      
      loading.close()
      
      if (result.success) {
        let message = `导入成功！\n`
        if (result.formConfigs > 0) {
          message += `• 导入 ${result.formConfigs} 个表单配置\n`
        }
        if (result.records > 0) {
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
        
        loadConfigs()
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

// 批量导入文件夹
const handleImportFolder = async () => {
  try {
    const folderPath = await window.electronAPI.selectFolder()
    
    if (!folderPath) {
      return // 用户取消
    }
    
    const loading = ElMessage({
      message: '正在批量导入文件夹，请稍候...',
      type: 'info',
      duration: 0,
      showClose: false
    })
    
    try {
      const result = await window.electronAPI.importExcelFolder(folderPath, {
        importFormConfig: true,
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
        if (result.totalFormConfigs > 0) {
          message += `• 导入 ${result.totalFormConfigs} 个表单配置\n`
        }
        if (result.totalRecords > 0) {
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
        
        loadConfigs()
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

onMounted(() => {
  loadConfigs()
})
</script>

<style scoped>
.form-config {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.text-gray {
  color: #909399;
  font-style: italic;
}
</style>

