import type { ComponentType } from 'react'
import type { IconBaseProps } from '@ant-design/icons/es/components/Icon'

export type IconComponent = ComponentType<IconBaseProps>
export type IconTheme = 'Outlined' | 'Filled' | 'TwoTone'

// Vite 默认忽略 node_modules；仅枚举图标叶子模块，不能把接口字符串拼成导入路径。
const modules = import.meta.glob<IconComponent>(
  [
    '/node_modules/@ant-design/icons/es/icons/*.js',
    '!/node_modules/@ant-design/icons/es/icons/index.js'
  ],
  { import: 'default', exhaustive: true }
)

const loaders = new Map(
  Object.entries(modules).map(([path, loader]) => [
    path.slice(path.lastIndexOf('/') + 1, -3),
    loader
  ])
)

export const legacyIconNames: Readonly<Record<string, string>> = {
  Lock: 'LockOutlined',
  Briefcase: 'ContainerOutlined',
  OfficeBuilding: 'BankOutlined',
  User: 'UserOutlined',
  UserFilled: 'UserOutlined',
  Grid: 'AppstoreOutlined',
  Connection: 'ApiOutlined',
  List: 'UnorderedListOutlined',
  Tickets: 'ProfileOutlined',
  Menu: 'MenuOutlined',
  Key: 'KeyOutlined',
  Share: 'ShareAltOutlined',
  Coin: 'DollarOutlined',
  Avatar: 'TeamOutlined',
  Suitcase: 'ShoppingOutlined',
  Folder: 'FolderOutlined',
  School: 'ReadOutlined',
  Postcard: 'IdcardOutlined'
}

// 常用语义关键词覆盖同一图标的不同风格，不将品牌或冷门图标冒充为已完整翻译。
const keywordRules: [RegExp, string][] = [
  [/User|Team|Contacts|Solution/, '用户 人员 个人 账户 账号 团队 联系人 成员'],
  [/Lock|Unlock|Key|Safety|Security|Insurance/, '锁 解锁 钥匙 安全 权限 密码 保护'],
  [/Menu|UnorderedList|OrderedList|Bars|Profile|Appstore/, '菜单 列表 功能 应用 网格'],
  [/File|Folder|Container|Snippets|Copy/, '文件 文件夹 文档 资料 复制'],
  [/Bank|Home|Shop|Apartment|Cluster/, '组织 公司 建筑 银行 首页 商店 部门'],
  [/Read|Book|Idcard/, '阅读 书籍 学校 学习 证件 名片 身份'],
  [/Shopping|Gift|Skin/, '购物 商品 购物车 礼物 衣服'],
  [
    /Dollar|Money|Pay|Wallet|AccountBook|Transaction|Euro|Pound|Alipay/,
    '金额 钱 支付 钱包 账单 交易 费用'
  ],
  [/Api|Link|Share|Disconnect|Branches|Node/, '接口 连接 分享 分支 节点'],
  [/Setting|Control|Tool|Build|Sliders/, '设置 配置 工具 调整'],
  [/Search|Zoom|Scan/, '搜索 查找 放大 缩小 扫描'],
  [/Plus|Minus|Close|Check|Stop/, '操作 添加 新增 减少 关闭 确认 停止'],
  [/Delete|Clear|Rest/, '删除 清空 垃圾桶'],
  [/Edit|Form|Highlight/, '编辑 修改 表单 标记'],
  [/Save|Download|Upload|Import|Export/, '保存 下载 上传 导入 导出'],
  [/Calendar|Schedule|Clock|History|FieldTime/, '日期 时间 日历 日程 历史'],
  [/Mail|Message|Comment|Notification|Bell|Sound/, '邮件 消息 评论 通知 提醒 声音'],
  [/Phone|Mobile|Tablet|Desktop|Laptop/, '电话 手机 平板 电脑 设备'],
  [/Camera|Picture|Video|Play|Audio|Youtube/, '相机 图片 视频 播放 音频 媒体'],
  [/Pause|StepBackward|StepForward|FastBackward|FastForward/, '暂停 上一首 下一首 快进 快退'],
  [/Chart|Fund|Stock|Dashboard|HeatMap/, '图表 统计 报表 仪表盘 趋势'],
  [/Database|Hdd|Cloud|Server/, '数据 数据库 存储 云 服务'],
  [/Global|Environment|Compass|Aim|Pushpin/, '全球 地球 地图 位置 定位 指南针'],
  [/Arrow|Caret|Double|Left|Right|Up|Down|Swap/, '方向 箭头 左 右 上 下 交换'],
  [/Login|Logout|Poweroff/, '登录 退出 关闭 电源'],
  [/Loading|Reload|Redo|Undo|Sync|Retweet/, '加载 刷新 重做 撤销 同步'],
  [/Question|Info|Warning|Exclamation|Alert|Bug/, '帮助 信息 警告 提示 错误 问题'],
  [/Eye|EyeInvisible/, '查看 预览 显示 隐藏'],
  [/Heart|Star|Like|Dislike|Smile|Meh|Frown/, '喜欢 收藏 点赞 表情 笑脸'],
  [/Trophy|Crown|Medal|Flag|Fire|Thunderbolt/, '奖杯 皇冠 奖牌 旗帜 热门 闪电'],
  [/Tag|Tags|Filter|Sort|OrderedList/, '标签 筛选 排序'],
  [/Qrcode|Barcode|Printer|PaperClip/, '二维码 条形码 打印 附件'],
  [/Code|Terminal|Console|Html|Java|Python/, '代码 开发 终端 编程'],
  [/Car|Truck|Rocket|Send/, '汽车 车辆 物流 火箭 发送'],
  [/Wifi|Radar|Signal|Bluetooth/, '网络 无线 信号 蓝牙'],
  [/Sun|Moon|Bulb/, '太阳 月亮 灯泡 亮度 主题']
]

export function resolveIconName(name?: string): string | undefined {
  if (!name) return undefined
  const canonical = Object.hasOwn(legacyIconNames, name) ? legacyIconNames[name] : name
  return loaders.has(canonical) ? canonical : undefined
}

export const iconCatalog = [...loaders.keys()]
  .sort((a, b) => a.localeCompare(b, 'en'))
  .map((name) => ({
    name,
    theme: name.endsWith('TwoTone') ? 'TwoTone' : name.endsWith('Filled') ? 'Filled' : 'Outlined',
    searchText: [
      name,
      ...Object.keys(legacyIconNames).filter((alias) => legacyIconNames[alias] === name),
      ...keywordRules.filter(([pattern]) => pattern.test(name)).map(([, words]) => words)
    ]
      .join(' ')
      .toLowerCase()
  }))

const components = new Map<string, IconComponent>()
const pending = new Map<string, Promise<IconComponent>>()

export function cachedIcon(name: string) {
  return components.get(name)
}

export function loadIcon(name: string): Promise<IconComponent> {
  const cached = components.get(name)
  if (cached) return Promise.resolve(cached)
  const running = pending.get(name)
  if (running) return running
  const loader = loaders.get(name)
  if (!loader) return Promise.reject(new Error('未识别图标'))
  const promise = loader()
    .then((component) => {
      components.set(name, component)
      return component
    })
    .finally(() => {
      // 失败不永久缓存，用户可以重试；同一图标的并发展示共用一次请求。
      pending.delete(name)
    })
  pending.set(name, promise)
  return promise
}
