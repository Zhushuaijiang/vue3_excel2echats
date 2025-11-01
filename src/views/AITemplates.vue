<template>
  <div class="ai-templates">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>AI提示语模板</span>
          <el-button type="primary" @click="handleAdd">新增模板</el-button>
        </div>
      </template>
      
      <el-table :data="templates" style="width: 100%">
        <el-table-column prop="name" label="模板名称" />
        <el-table-column prop="prompt" label="提示语内容" show-overflow-tooltip />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="模板名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="提示语">
          <el-input
            v-model="form.prompt"
            type="textarea"
            :rows="8"
            placeholder="输入AI提示语模板，可以使用 {user_input} 作为用户输入的占位符"
          />
        </el-form-item>
        <el-form-item label="示例">
          <div class="prompt-example">
            <p>示例说明：</p>
            <p>1. 使用 {user_input} 作为占位符，系统会自动替换为用户输入的内容</p>
            <p>2. 提示语应该清晰描述期望生成的大屏内容</p>
            <p>3. 可以包含数据来源、图表类型、展示方式等要求</p>
          </div>
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
import { useAITemplateStore } from '@/stores/aiTemplate'

const aiTemplateStore = useAITemplateStore()
const templates = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)

const form = ref({
  name: '',
  prompt: ''
})

const dialogTitle = computed(() => isEdit.value ? '编辑模板' : '新增模板')

const handleAdd = () => {
  isEdit.value = false
  currentId.value = null
  form.value = { name: '', prompt: '' }
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  currentId.value = row.id
  form.value = {
    name: row.name,
    prompt: row.prompt
  }
  dialogVisible.value = true
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这个模板吗？', '提示', {
      type: 'warning'
    })
    await aiTemplateStore.deleteTemplate(row.id)
    ElMessage.success('删除成功')
    loadTemplates()
  } catch (e) {
    // 用户取消
  }
}

const handleSave = async () => {
  if (!form.value.name) {
    ElMessage.warning('请输入模板名称')
    return
  }
  if (!form.value.prompt) {
    ElMessage.warning('请输入提示语内容')
    return
  }
  
  if (isEdit.value && currentId.value) {
    await aiTemplateStore.updateTemplate(currentId.value, {
      name: form.value.name,
      prompt: form.value.prompt
    })
    ElMessage.success('更新成功')
  } else {
    await aiTemplateStore.createTemplate({
      name: form.value.name,
      prompt: form.value.prompt
    })
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  loadTemplates()
}

const loadTemplates = async () => {
  templates.value = await aiTemplateStore.getTemplates()
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.ai-templates {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.prompt-example {
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
}

.prompt-example p {
  margin: 5px 0;
}
</style>

