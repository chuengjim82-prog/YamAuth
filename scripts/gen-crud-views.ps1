# Generate standard CRUD Vue pages from YamAuth entity files.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$entityRoot = Join-Path $root 'src\YamAuth.Entity'
$utf8 = New-Object System.Text.UTF8Encoding($false)

$audit = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($n in @('IsDeleted','CreatorId','CreatorNic','CreateTime','UpdaterId','UpdaterNic','UpdateTime','DeleterId','DeleterNic','DeleteTime')) {
    [void]$audit.Add($n)
}
$secret = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($n in @('Password','PwdSalt','AppSecret')) { [void]$secret.Add($n) }

$labels = @{
    Id='编号'; TenantId='租户'; ParentId='上级'; Remark='备注'
    UserName='用户名'; NickName='昵称'; Password='密码'; Avatar='头像'; Phone='电话'; Email='邮箱'
    IsAdmin='管理员'; IsActived='启用'; AppsCode='应用编码'; AppsName='应用名称'; AppKey='AppKey'; AppSecret='密钥'
    AppsId='应用'; UserId='用户'; CrudName='功能名称'; CrudCode='功能编码'; CrudType='功能类型'; SortIndex='排序'
    CrudId='功能'; Method='方法'; ApiPath='接口路径'; MenuCode='菜单编码'; MenuName='菜单名称'; MenuType='菜单类型'
    IconName='图标'; RoutePath='路由'; Redirect='重定向'; OpenType='打开方式'; IsHided='隐藏'; AllowAny='匿名访问'
    RoleCode='角色编码'; RoleName='角色名称'; IsSystem='系统角色'; CrudRoleId='功能角色'; CrudInfoId='功能'
    RoleId='角色'; TenantCode='租户编码'; TenantName='租户名称'
    NameCn='中文名'; NameEn='英文名'; RegistratioNo='注册号'; LegalName='法人'; CountryId='国家'; RegDate='注册日期'
    Classify='分类'; Currency='币种'; ProjCode='项目编码'; ProjName='项目名称'
    DeptName='部门名称'; EmpCount='人数'; DirectorId='负责人'; DepartmentId='部门'
}

function To-Camel([string]$name) {
    if ([string]::IsNullOrEmpty($name)) { return $name }
    return $name.Substring(0,1).ToLowerInvariant() + $name.Substring(1)
}
function To-KebabPlural([string]$pascal) {
    $sb = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $pascal.Length; $i++) {
        if ($i -gt 0 -and [char]::IsUpper($pascal[$i])) { [void]$sb.Append('-') }
        [void]$sb.Append([char]::ToLowerInvariant($pascal[$i]))
    }
    $s = $sb.ToString()
    if ($s.EndsWith('y')) { return $s.Substring(0, $s.Length - 1) + 'ies' }
    return $s + 's'
}
function To-PascalPlural([string]$pascal) {
    if ($pascal.EndsWith('y')) { return $pascal.Substring(0, $pascal.Length - 1) + 'ies' }
    return $pascal + 's'
}
function Get-Kind([string]$type) {
    $t = $type.TrimEnd('?')
    if ($t -eq 'bool') { return 'bool' }
    if ($t -eq 'DateTime') { return 'date' }
    if ($t -in @('long','int','short','byte','decimal','double','float')) { return 'number' }
    return 'string'
}
function Get-Default([string]$type, [string]$kind) {
    $nullable = $type.EndsWith('?') -or $type -eq 'string'
    if ($kind -eq 'bool') { return 'false' }
    if ($kind -eq 'date') { return 'null' }
    if ($kind -eq 'number') { if ($nullable) { return 'null' } else { return '0' } }
    return "''"
}

$files = Get-ChildItem $entityRoot -Recurse -Filter *.cs | Where-Object { $_.FullName -notmatch '\\Abstractions\\|\\(bin|obj)\\' }
foreach ($file in $files) {
    $entity = [IO.Path]::GetFileNameWithoutExtension($file.Name)
    $module = $file.Directory.Name
    $moduleLower = $module.ToLowerInvariant()
    $resource = To-KebabPlural $entity
    $plural = To-PascalPlural $entity
    $text = [IO.File]::ReadAllText($file.FullName)
    $props = [regex]::Matches($text, 'public\s+([\w\?]+)\s+(\w+)\s+\{\s*get;') | ForEach-Object {
        [pscustomobject]@{ Type = $_.Groups[1].Value; Name = $_.Groups[2].Value }
    }
    $tableProps = @($props | Where-Object { -not $audit.Contains($_.Name) -and -not $secret.Contains($_.Name) })
    $formProps = @($props | Where-Object { -not $audit.Contains($_.Name) -and $_.Name -ne 'Id' -and $_.Name -ne 'PwdSalt' })

    $columns = ($tableProps | ForEach-Object {
        $camel = To-Camel $_.Name
        $label = if ($labels.ContainsKey($_.Name)) { $labels[$_.Name] } else { $_.Name }
        $width = if ($_.Name -eq 'Id') { ' width="90"' } else { '' }
        "      <el-table-column prop=`"$camel`" label=`"$label`"$width />"
    }) -join "`r`n"

    $formItems = ($formProps | ForEach-Object {
        $camel = To-Camel $_.Name
        $label = if ($labels.ContainsKey($_.Name)) { $labels[$_.Name] } else { $_.Name }
        $kind = Get-Kind $_.Type
        $control = if ($_.Name -in @('Password','AppSecret')) {
            "<el-input v-model=`"form.$camel`" type=`"password`" show-password />"
        } elseif ($kind -eq 'bool') {
            "<el-switch v-model=`"form.$camel`" />"
        } elseif ($kind -eq 'date') {
            "<el-date-picker v-model=`"form.$camel`" type=`"datetime`" value-format=`"YYYY-MM-DD HH:mm:ss`" />"
        } elseif ($kind -eq 'number') {
            "<el-input-number v-model=`"form.$camel`" :controls=`"false`" />"
        } elseif ($_.Name -eq 'Remark') {
            "<el-input v-model=`"form.$camel`" type=`"textarea`" />"
        } else {
            "<el-input v-model=`"form.$camel`" />"
        }
        "        <el-form-item label=`"$label`" prop=`"$camel`">$control</el-form-item>"
    }) -join "`r`n"

    $defaults = ($formProps | ForEach-Object {
        $camel = To-Camel $_.Name
        $kind = Get-Kind $_.Type
        $value = Get-Default $_.Type $kind
        "$camel`: $value"
    }) -join ', '

    $vue = @"
<template>
  <div>
    <SearchForm :initial="query" @search="onSearch">
      <template #default="{ form }">
        <el-form-item :label="labels.keyword"><el-input v-model="form.keyword" clearable /></el-form-item>
      </template>
      <template #actions>
        <el-button type="primary" @click="openCreate">{{ labels.create }}</el-button>
      </template>
    </SearchForm>

    <DataTable
      :items="items" :total="total"
      :page="query.page" :size="query.size" :loading="loading"
      @update:page="(p: number) => { query.page = p; load(); }"
      @update:size="(s: number) => { query.size = s; load(); }">
$columns
      <el-table-column :label="labels.actions" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">{{ labels.edit }}</el-button>
          <el-popconfirm :title="labels.confirmDelete" @confirm="remove(row.id)">
            <template #reference><el-button link type="danger">{{ labels.delete }}</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </DataTable>

    <FormDialog v-model="dialogVisible" :title="dialogTitle" :initial="dialogForm" @submit="onSubmit">
      <template #default="{ form }">
$formItems
      </template>
    </FormDialog>
  </div>
</template>
<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import SearchForm from '@/components/SearchForm.vue';
import DataTable from '@/components/DataTable.vue';
import FormDialog from '@/components/FormDialog.vue';
import { createCrudApi } from '@/api/crud';
import { useCrudLabels } from '@/composables/useCrudLabels';

const { labels } = useCrudLabels();
const api = createCrudApi<any, any, any, any>('/v1/$moduleLower/$resource');

const query = reactive({ page: 1, size: 20, keyword: '' });
const items = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const dialogForm = ref<any>({});
const editingId = ref<number | null>(null);

async function load() {
  loading.value = true;
  try {
    const { total: count, items: list } = await api.page(query);
    total.value = count;
    items.value = list;
  } finally { loading.value = false; }
}

function onSearch(form: any) { Object.assign(query, form); query.page = 1; load(); }

function openCreate() {
  editingId.value = null;
  dialogTitle.value = labels.value.createTitle;
  dialogForm.value = { $defaults };
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  dialogTitle.value = labels.value.editTitle;
  dialogForm.value = { ...row };
  dialogVisible.value = true;
}

async function onSubmit(form: any) {
  if (editingId.value) await api.update(editingId.value, form);
  else await api.create(form);
  ElMessage.success(labels.value.saveSuccess);
  dialogVisible.value = false;
  await load();
}

async function remove(id: number) {
  await api.remove(id);
  ElMessage.success(labels.value.deleteSuccess);
  await load();
}

onMounted(load);
</script>
"@

    $dir = Join-Path $root "web\YamAuth.Web\src\views\$moduleLower"
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $out = Join-Path $dir "$plural.vue"
    [IO.File]::WriteAllText($out, $vue.Replace("`n", "`r`n"), $utf8)
    Write-Host $out.Substring($root.Length + 1)
}
