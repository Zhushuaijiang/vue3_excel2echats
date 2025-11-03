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
        <el-form-item label="关联表单">
          <el-select v-model="selectedConfigId" placeholder="选择表单配置" style="width: 100%">
            <el-option
              v-for="cfg in formConfigs"
              :key="cfg.id"
              :label="cfg.name"
              :value="cfg.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="selectedFields.length" label="可用字段">
          <div class="field-chips">
            <el-tag
              v-for="f in selectedFields"
              :key="f.name"
              class="chip"
              type="info"
              @click="insertPlaceholder(f.name)"
            >{ {{ f.name }} }</el-tag>
            <div class="chips-actions">
              <el-button size="small" type="primary" plain @click="generateAutoPrompt">自动生成提示语</el-button>
            </div>
          </div>
        </el-form-item>
        <el-form-item v-if="selectedConfigId && dataOverview.ready" label="数据概览">
          <div class="data-overview">
            <div class="overview-head">
              <span>基于最近数据样本的字段统计与示例</span>
              <el-button link type="primary" @click="insertDataOverview">插入数据说明到提示语</el-button>
            </div>
            <div class="overview-list">
              <div class="overview-item" v-for="item in dataOverview.items" :key="item.name">
                <div class="item-title">{{ item.name }}</div>
                <div class="item-content">
                  <template v-if="item.type === 'number'">
                    <span class="metric">样本数：{{ item.count }}</span>
                    <span class="metric">最小：{{ item.min }}</span>
                    <span class="metric">最大：{{ item.max }}</span>
                    <span class="metric">均值：{{ item.avg }}</span>
                  </template>
                  <template v-else>
                    <span class="metric">样本数：{{ item.count }}</span>
                  </template>
                  <div class="samples">
                    <el-tag v-for="s in item.samples" :key="s" size="small" class="sample">{{ s }}</el-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
            <p>2. 可点击上方字段快速插入 {字段名} 占位符，以结合具体表单字段进行分析</p>
            <p>3. 提示语应该清晰描述期望生成的大屏内容，可包含数据来源、图表类型、展示方式等要求</p>
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
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAITemplateStore } from '@/stores/aiTemplate'
import { useFormConfigStore } from '@/stores/formConfig'

const aiTemplateStore = useAITemplateStore()
const formConfigStore = useFormConfigStore()
const templates = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)
const formConfigs = ref<any[]>([])
const selectedConfigId = ref<number | null>(null)

const form = ref({
  name: '',
  prompt: ''
})

const dialogTitle = computed(() => isEdit.value ? '编辑模板' : '新增模板')

const selectedConfig = computed(() => {
  return formConfigs.value.find((c: any) => c.id === selectedConfigId.value) || null
})

const selectedFields = computed<any[]>(() => {
  if (!selectedConfig.value) return []
  try {
    const fields = JSON.parse(selectedConfig.value.fields)
    return Array.isArray(fields) ? fields : []
  } catch {
    return []
  }
})

const dataOverview = ref<{ ready: boolean; items: any[] }>({ ready: false, items: [] })

const loadDataOverview = async () => {
  dataOverview.value = { ready: false, items: [] }
  if (!selectedConfigId.value) return
  try {
    const rows = await (window as any).electronAPI.dbQuery(
      'SELECT data FROM cargo_records WHERE config_id = ? ORDER BY created_at DESC LIMIT 200',
      [selectedConfigId.value]
    )
    const parsed = (rows || []).map((r: any) => {
      try { return JSON.parse(r.data) } catch { return null }
    }).filter(Boolean)
    // 汇总：按字段遍历，生成count、samples、数值统计
    const fieldDefs = selectedFields.value
    const items: any[] = []
    fieldDefs.forEach((fd: any) => {
      const values: any[] = []
      parsed.forEach((rec: any) => {
        if (rec.hasOwnProperty(fd.name)) values.push(rec[fd.name])
      })
      const samples = Array.from(new Set(values.filter(v => v !== undefined && v !== null).slice(0, 6))).slice(0, 6)
      if (fd.type === 'number') {
        const nums = values.map(v => Number(v)).filter(v => !Number.isNaN(v))
        const count = nums.length
        const min = count ? Math.min(...nums) : null
        const max = count ? Math.max(...nums) : null
        const avg = count ? Number((nums.reduce((a, b) => a + b, 0) / count).toFixed(2)) : null
        items.push({ name: fd.name, type: 'number', count, min, max, avg, samples })
      } else {
        items.push({ name: fd.name, type: fd.type, count: values.length, samples })
      }
    })
    dataOverview.value = { ready: true, items }
  } catch (e) {
    dataOverview.value = { ready: true, items: [] }
  }
}

const handleAdd = () => {
  isEdit.value = false
  currentId.value = null
  form.value = { name: '', prompt: '' }
  dialogVisible.value = true
  selectedConfigId.value = null
}

const handleEdit = (row: any) => {
  isEdit.value = true
  currentId.value = row.id
  form.value = {
    name: row.name,
    prompt: row.prompt
  }
  selectedConfigId.value = row.config_id || null
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
      prompt: form.value.prompt,
      config_id: selectedConfigId.value
    })
    ElMessage.success('更新成功')
  } else {
    await aiTemplateStore.createTemplate({
      name: form.value.name,
      prompt: form.value.prompt,
      config_id: selectedConfigId.value
    })
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  loadTemplates()
}

const loadTemplates = async () => {
  templates.value = await aiTemplateStore.getTemplates()
}

const loadFormConfigs = async () => {
  formConfigs.value = await formConfigStore.getConfigs()
}

const insertPlaceholder = (fieldName: string) => {
  const textarea = form.value.prompt || ''
  const placeholder = `{${fieldName}}`
  form.value.prompt = textarea ? `${textarea}\n${placeholder}: ` : `${placeholder}: `
}

const buildDataOverviewText = () => {
  if (!dataOverview.value.ready || !dataOverview.value.items.length) return ''
  const lines: string[] = []
  lines.push('数据概览（基于样本）：')
  dataOverview.value.items.forEach((it: any) => {
    if (it.type === 'number') {
      lines.push(`- ${it.name}: 数值字段，样本=${it.count}，范围=[${it.min} ~ ${it.max}]，均值=${it.avg}`)
    } else {
      lines.push(`- ${it.name}: 文本/枚举字段，样本=${it.count}`)
    }
    if (it.samples && it.samples.length) {
      lines.push(`  示例: ${it.samples.slice(0, 5).join('，')}`)
    }
  })
  return lines.join('\n')
}

const insertDataOverview = () => {
  const text = buildDataOverviewText()
  if (!text) return
  const textarea = form.value.prompt || ''
  form.value.prompt = textarea ? `${textarea}\n\n${text}` : text
}

onMounted(() => {
  loadTemplates()
  loadFormConfigs()
})

watch(selectedConfigId, () => {
  loadDataOverview()
})

// 基于数据概览自动生成高质量提示语（不足时自动扩展统计）
const generateAutoPrompt = async () => {
  if (!selectedConfig.value) {
    ElMessage.warning('请先选择关联表单')
    return
  }

  // 确保有概览；若不足则扩展统计
  if (!dataOverview.value.ready) {
    await loadDataOverview()
  }

  let items = dataOverview.value.items
  if (!items || items.length === 0) {
    // 扩展统计：从数据库拉取更多样本
    try {
      const rows = await (window as any).electronAPI.dbQuery(
        'SELECT data FROM cargo_records WHERE config_id = ? ORDER BY created_at DESC LIMIT 1000',
        [selectedConfigId.value]
      )
      const parsed = (rows || []).map((r: any) => { try { return JSON.parse(r.data) } catch { return null } }).filter(Boolean)
      const fields = selectedFields.value
      const extItems: any[] = []
      fields.forEach((fd: any) => {
        const values: any[] = []
        parsed.forEach((rec: any) => { if (rec.hasOwnProperty(fd.name)) values.push(rec[fd.name]) })
        const samples = Array.from(new Set(values.filter(v => v !== undefined && v !== null))).slice(0, 6)
        if (fd.type === 'number') {
          const nums = values.map(v => Number(v)).filter(v => !Number.isNaN(v))
          const count = nums.length
          const min = count ? Math.min(...nums) : null
          const max = count ? Math.max(...nums) : null
          const avg = count ? Number((nums.reduce((a, b) => a + b, 0) / count).toFixed(2)) : null
          extItems.push({ name: fd.name, type: 'number', count, min, max, avg, samples })
        } else {
          extItems.push({ name: fd.name, type: fd.type, count: values.length, samples })
        }
      })
      items = extItems
    } catch (e) {
      // ignore
    }
  }

  const fields = selectedFields.value
  const numericFields = fields.filter((f: any) => f.type === 'number').map((f: any) => f.name)
  const dateFields = fields.filter((f: any) => f.type === 'date').map((f: any) => f.name)
  const categoricalFields = fields.filter((f: any) => f.type === 'select' || f.type === 'text').map((f: any) => f.name)

  const lines: string[] = []
  lines.push(`你是航空货运数据看板规划助手。请基于下列真实表单与数据特征，规划 3 个可视化图表（仅输出布局字段：id,type,title,x,y,w,h；type∈['line','bar','pie']）。`) 
  lines.push('禁止杜撰字段，必须使用提供的字段名称。')
  lines.push('表单：' + (selectedConfig.value?.name || '未命名'))
  lines.push('字段：' + fields.map((f: any) => `${f.name}(${f.type})`).join('，'))
  if (items && items.length) {
    lines.push('数据概览（部分字段）：')
    items.slice(0, 8).forEach((it: any) => {
      if (it.type === 'number') {
        lines.push(`- ${it.name}: 数值，样本=${it.count}，范围=[${it.min}~${it.max}]，均值=${it.avg}`)
      } else {
        const smp = (it.samples || []).slice(0, 5).join('，')
        lines.push(`- ${it.name}: 文本/枚举，样本=${it.count}${smp ? `，示例=${smp}` : ''}`)
      }
    })
  }
  lines.push('推荐图表（请结合字段类型自动匹配）：')
  if (dateFields.length && numericFields.length) {
    lines.push(`1) 折线图：按 ${dateFields[0]} 的时间序列展示 ${numericFields[0]} 趋势。`)
  }
  if (categoricalFields.length && numericFields.length) {
    lines.push(`2) 柱状图：按 ${categoricalFields[0]} 分类汇总 ${numericFields[0]} 并取Top N。`)
  }
  if (categoricalFields.length && numericFields.length) {
    lines.push(`3) 饼图：${categoricalFields[1] || categoricalFields[0]} 的占比分布（数值：${numericFields[0]}）。`)
  }
  lines.push('布局要求：组件不重叠，x,y,w,h使用0-100的百分比。')

  form.value.prompt = lines.join('\n')
  ElMessage.success('已生成提示语，可根据需要微调后保存')
}
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

.field-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  cursor: pointer;
}
</style>

