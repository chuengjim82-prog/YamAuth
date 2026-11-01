/**
 * ForgeAbc.Web 页面生成器
 *
 * 交互模式:
 *   node scripts/generate-page/generate.cjs
 *
 * 非交互模式（由 Vite API 调用）:
 *   node scripts/generate-page/generate.cjs --template=standard-crud --module=stock --entity=kunstock --entityCn=库存 --api=/v1/stock/kunstock --dir=src/views/stock
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve))
}

// ==================== 模板变量替换 ====================
function applyTemplate(content, vars) {
  let result = content
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, value)
  }
  return result
}

// ==================== 解析命令行参数 ====================
function parseArgs() {
  const args = {}
  const raw = process.argv.slice(2)
  for (let i = 0; i < raw.length; i++) {
    const m = raw[i].match(/^--(\w+)=(.+)$/)
    if (m) args[m[1]] = m[2]
  }
  return args
}

// ==================== 核心生成逻辑（供非交互模式调用） ====================
function generateFromParams(params) {
  const templateDir = path.join(__dirname, 'templates')
  const templateFile = path.join(templateDir, `${params.templateName}.vue`)

  if (!fs.existsSync(templateFile)) {
    return { success: false, error: `模板文件不存在: ${templateFile}` }
  }

  let templateContent = fs.readFileSync(templateFile, 'utf-8')

  const vars = {
    MODULE_NAME: params.moduleName,
    ENTITY_NAME: params.entityName,
    ENTITY_CN: params.entityCn,
    ENTITY_PASCAL: params.entityPascal,
    API_BASE_PATH: params.apiBasePath,
    PERMISSION_MODULE: params.permModule,
  }

  const output = applyTemplate(templateContent, vars)

  const absoluteTarget = path.resolve(process.cwd(), params.targetPath)
  const targetDirAbsolute = path.dirname(absoluteTarget)

  if (!fs.existsSync(targetDirAbsolute)) {
    fs.mkdirSync(targetDirAbsolute, { recursive: true })
  }

  fs.writeFileSync(absoluteTarget, output, 'utf-8')

  // 自动追加权限常量到 permissions.manual.ts
  appendPermission(params)

  return { success: true, filePath: params.targetPath, fileName: params.fileName }
}

/** 自动将权限常量追加到 permissions.manual.ts（已存在则跳过） */
function appendPermission(params) {
  const permPath = path.resolve(process.cwd(), 'src/constants/permissions.manual.ts')
  if (!fs.existsSync(permPath)) return

  const content = fs.readFileSync(permPath, 'utf-8')
  const constName = params.permModule
  const entityKey = params.entityName ? params.entityName.toLowerCase().replace(/[^a-z0-9-]/g, '') : ''
  if (!entityKey || content.includes(`export const ${constName} =`)) return

  const block = `
export const ${constName} = {
  list: '${params.moduleName}:${entityKey}:list',
  read: '${params.moduleName}:${entityKey}:read',
  create: '${params.moduleName}:${entityKey}:create',
  update: '${params.moduleName}:${entityKey}:update',
  delete: '${params.moduleName}:${entityKey}:delete',
} as const
`
  fs.appendFileSync(permPath, block, 'utf-8')
}

// ==================== 主流程 ====================
async function main() {
  const args = parseArgs()

  // 非交互模式：直接使用参数生成
  if (args.template) {
    const result = generateFromParams({
      templateName: args.template,
      moduleName: args.module,
      entityName: args.entity,
      entityCn: args.entityCn || '',
      entityPascal:
        args.entityPascal ||
        args.entity
          .split('-')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(''),
      apiBasePath: args.api || '',
      permModule: args.perm || args.module + (args.entity.charAt(0).toUpperCase() + args.entity.slice(1)),
      targetPath: args.dir
        ? `${args.dir}/${
            args.fileName ||
            (args.entityPascal ||
              args.entity
                .split('-')
                .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                .join('')) + '.vue'
          }`
        : '',
      fileName:
        args.fileName ||
        `${
          args.entityPascal ||
          args.entity
            .split('-')
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join('')
        }.vue`,
    })
    if (result.success) {
      console.log(JSON.stringify({ success: true, filePath: result.filePath }))
    } else {
      console.log(JSON.stringify({ success: false, error: result.error }))
    }
    process.exit(0)
  }
  console.log('')
  console.log('╔══════════════════════════════════════════╗')
  console.log('║    ForgeAbc.Web 页面生成器               ║')
  console.log('║    快速生成标准 CRUD .vue 页面             ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log('')

  // 1. 选择模板类型
  console.log('')
  console.log('可用模板:')
  console.log('  1) standard-crud  — 声明式字段配置（使用 :fields / :columns props）')
  console.log('     适用于标准 CRUD，字段配置集中管理')
  console.log('     参考: Customers.vue')
  console.log('')
  console.log('  2) slot-crud     — 插槽式自定义布局（使用 #default / #cell-xxx 插槽）')
  console.log('     适用于布局灵活、有自定义列渲染或行操作的页面')
  console.log('     参考: Countries.vue, Users.vue')
  console.log('')
  console.log('  3) module-dashboard — 模块概览仪表盘（卡片式导航）')
  console.log('     适用于模块首页，展示该模块下各子实体的导航卡片')
  console.log('     参考: 商品管理 / 库存管理 等模块首页')
  console.log('')

  const templateChoice = await ask('请选择模板 (1 / 2 / 3，默认 1): ')
  let templateName
  if (templateChoice.trim() === '2') {
    templateName = 'slot-crud'
  } else if (templateChoice.trim() === '3') {
    templateName = 'module-dashboard'
  } else {
    templateName = 'standard-crud'
  }

  const isModuleDashboard = templateName === 'module-dashboard'

  // 2. 基本信息
  const moduleName = await ask('模块名（小写，如 base / auth / goods / stock）: ')

  const moduleNameClean = moduleName.trim().replace(/[^a-z0-9]/g, '')

  let entityName = ''
  let entityCn = ''
  let apiBasePath = ''
  let entityClean = ''
  let entityPascal = ''
  let permModule = ''

  if (isModuleDashboard) {
    // 模块仪表盘只需要模块名，不需要具体实体信息
    entityName = 'index'
    entityCn = moduleNameClean + ' 模块'
    apiBasePath = ''
    entityClean = 'index'
    entityPascal = 'Index'
    permModule = moduleNameClean
  } else {
    entityName = await ask('实体名（小写，如 customer / product / order）: ')
    entityCn = await ask('实体中文名（如 客户 / 产品 / 订单）: ')
    apiBasePath = await ask('API 基础路径（如 /v1/base/customers）: ')

    entityClean = entityName.trim().replace(/[^a-z0-9]/g, '')

    // 转换为 PascalCase
    entityPascal = entityClean
      .split(/[-_]/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('')

    // 权限模块名：首字母小写的驼峰，如 baseCustomer
    permModule = moduleNameClean + entityPascal.charAt(0).toLowerCase() + entityPascal.slice(1)
  }

  // 3. 目标路径
  const defaultDir = `src/views/${moduleNameClean}/`
  const targetDir = await ask(`目标目录（默认 ${defaultDir}）: `)
  const targetDirClean = (targetDir.trim() || defaultDir).replace(/\\/g, '/')

  const fileName = isModuleDashboard ? 'Index.vue' : entityPascal + '.vue'
  const targetPath = path.join(targetDirClean, fileName).replace(/\\/g, '/')

  // 4. 预览
  console.log('')
  console.log('══════════════════════════════════════════')
  console.log('即将生成:')
  console.log(`  模板:         ${templateName}.vue`)
  console.log(`  输出文件:     ${targetPath}`)
  console.log(`  模块名:       ${moduleNameClean}`)
  if (!isModuleDashboard) {
    console.log(`  实体名:       ${entityClean}`)
    console.log(`  PascalCase:   ${entityPascal}`)
    console.log(`  API 路径:     ${apiBasePath}`)
    console.log(`  权限模块:     ${permModule}`)
  }
  console.log('══════════════════════════════════════════')
  console.log('')

  const confirm = await ask('确认生成? (Y/n): ')
  if (confirm.trim().toLowerCase() === 'n') {
    console.log('已取消。')
    rl.close()
    return
  }

  // 5. 读取模板
  const templateDir = path.join(__dirname, 'templates')
  const templateFile = path.join(templateDir, `${templateName}.vue`)

  if (!fs.existsSync(templateFile)) {
    console.error(`❌ 模板文件不存在: ${templateFile}`)
    rl.close()
    return
  }

  let templateContent = fs.readFileSync(templateFile, 'utf-8')

  // 6. 计算菜单 URL
  const menuUrl = isModuleDashboard ? `/${moduleNameClean}/index` : `/${moduleNameClean}/${entityClean}`

  // 7. 替换变量
  const vars = {
    MODULE_NAME: moduleNameClean,
    ENTITY_NAME: entityClean,
    ENTITY_CN: entityCn,
    ENTITY_PASCAL: entityPascal,
    API_BASE_PATH: apiBasePath,
    PERMISSION_MODULE: permModule,
  }

  const output = applyTemplate(templateContent, vars)

  // 8. 输出文件
  const absoluteTarget = path.resolve(process.cwd(), targetPath)
  const targetDirAbsolute = path.dirname(absoluteTarget)

  if (!fs.existsSync(targetDirAbsolute)) {
    fs.mkdirSync(targetDirAbsolute, { recursive: true })
    console.log(`📁 已创建目录: ${targetDirAbsolute}`)
  }

  fs.writeFileSync(absoluteTarget, output, 'utf-8')
  console.log(`✅ 页面已生成: ${absoluteTarget}`)

  // 9. 生成后指引
  console.log('')
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║            📋 后续操作指引                           ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log('')

  // === 共同步骤：菜单注册 ===
  console.log('🔥 最关键一步 — 让页面在侧边栏显示:')
  console.log('')
  console.log('  本项目菜单由后端管理，需要在后台菜单管理中添加菜单项:')
  console.log('')
  console.log('  ┌─────────────────────────────────────────────────┐')
  console.log(`  │  菜单名称    ${(isModuleDashboard ? entityCn + '首页' : entityCn + '管理').padEnd(41)}│`)
  console.log(`  │  菜单 URL    ${menuUrl.padEnd(41)}│`)
  if (!isModuleDashboard) {
    console.log(`  │  权限标识    ${(permModule + '.list').padEnd(41)}│`)
  }
  console.log('  │  父级菜单    根据业务模块选择                   │')
  console.log('  │  菜单图标    根据需要设置（如 Setting）         │')
  console.log('  │  排序        根据需要设置                       │')
  console.log('  └─────────────────────────────────────────────────┘')
  console.log('')
  console.log('  📌 视图文件自动匹配规则:')
  console.log(`     菜单 URL "${menuUrl}"`)
  console.log(`     → 自动匹配文件 "${targetPath.replace(/^src/, '/src')}"`)
  console.log('')
  console.log('  📌 添加完成后，刷新页面或重新登录即可在侧边栏看到新菜单')
  console.log('')

  // === 页面特定步骤 ===
  if (isModuleDashboard) {
    console.log('─── 模块仪表盘开发步骤 ──────────────────────────────')
    console.log('')
    console.log('  1️⃣  编辑导航卡片')
    console.log(`      打开 ${targetPath}`)
    console.log('      找到 moduleCards 数组，将 entity1~entity4 替换为实际业务子模块')
    console.log('')
    console.log('  2️⃣  添加 i18n 国际化文案')
    console.log(`      src/i18n/locales/zh-CN.ts:`)
    console.log(`        "module": { "${moduleNameClean}": {`)
    console.log(`          "title": "${moduleNameClean} 管理",`)
    console.log(`          "description": "模块描述",`)
    console.log(`          "entity1": "子模块1", "entity1Desc": "描述"`)
    console.log(`        } }`)
    console.log('')
    console.log('  3️⃣  子模块页面也要各自注册菜单')
    console.log('      仪表盘中的每个导航卡片都需要对应的子页面菜单')
    console.log('      例如卡片 route="/goods/spu-infos" → 注册 menuUrl=/goods/spu-infos')
    console.log('')
  } else {
    console.log('─── CRUD 页面开发步骤 ───────────────────────────────')
    console.log('')
    console.log('  1️⃣  注册权限常量')
    console.log(`      编辑 src/constants/permissions.manual.ts:`)
    console.log(`        export const ${permModule} = {`)
    console.log(`          list:   '${moduleNameClean}:${entityClean}:list',`)
    console.log(`          read:   '${moduleNameClean}:${entityClean}:read',`)
    console.log(`          create: '${moduleNameClean}:${entityClean}:create',`)
    console.log(`          update: '${moduleNameClean}:${entityClean}:update',`)
    console.log(`          delete: '${moduleNameClean}:${entityClean}:delete',`)
    console.log(`        } as const;`)
    console.log('')
    console.log('  2️⃣  添加 i18n 国际化文案')
    console.log(`      src/i18n/locales/zh-CN.ts:`)
    console.log(`        "${moduleNameClean}": { "${entityClean}": {`)
    console.log(`          "code": "编码", "name": "名称", "remark": "备注"`)
    console.log(`        } }`)
    console.log('')
    console.log(`      src/i18n/locales/en-US.ts: 添加对应的英文文案`)
    console.log('')
    console.log('  3️⃣  替换 TODO 标记')
    console.log(`      打开 ${targetPath}，搜索 TODO`)
    console.log('      - 配置搜索字段 (searchFields)')
    console.log('      - 配置表格列 (tableColumns)')
    console.log('      - 配置表单字段和校验规则 (rules)')
    console.log('')
    console.log('  4️⃣  可选：提取表单子组件')
    console.log(`      如果表单字段较多，提取到独立的 ${entityPascal}Form.vue`)
    console.log('')
  }

  rl.close()
}

main().catch((err) => {
  console.error('❌ 出错了:', err)
  rl.close()
})
