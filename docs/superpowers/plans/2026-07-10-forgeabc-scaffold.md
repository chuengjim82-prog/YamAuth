# YamAuth 重建实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 照抄 `D:\OSOO\Code\ProxySale` 的 .NET 8 + Vue 3 架构，全面重命名为 YamAuth，只保留 YamBase / YamBzss 两库中存在的表，去掉全部权限逻辑（只保留登录），产出可编译、可运行、可登录的前后端骨架。

**Architecture:** 拷贝整棵源码树 → 批量重命名 token（`ProxySale1Base`→`YamBase`、`ProxySale2Bzss`→`YamBzss`、`ProxySale`→`YamAuth`）→ 删除无表支撑的文件 → 逐层剥离权限 / 数据权限 / 资源 / 组织 / i18n / RefreshToken / 密码找回代码 → 修配置与 SQL → 前端同步剥离。后端 DI 为**按接口约定的程序集扫描注册**（`AddYamAuthRepositories` / `AddYamAuthServices`），因此删除文件即自动移除注册，无需维护注册清单。每层以 `dotnet build` 通过为验证点；不搬测试工程。

**Tech Stack:** ASP.NET Core 8、FreeSql、JWT、FluentValidation、Mapster、Serilog；Vue 3、Vite、Element Plus、Pinia、vue-i18n；SQL Server（`127.0.0.1 / sa`）。

**源/目标路径：**
- 源：`D:\OSOO\Code\ProxySale`（下称 `$SRC`）
- 目标：`D:\CODE\YamAuth`（下称 `$DST`，已含 `.git` 与 `docs/`）
- 数据库：`YamBase`（主库）、`YamBzss`（第二库）
- `sqlcmd`：`/c/Program Files/Microsoft SQL Server/Client SDK/ODBC/170/Tools/Binn/sqlcmd`

**保留的表（共 13 张）：**
- YamBase：`tb_Auth_User`、`tb_Auth_MenuGroup`、`tb_Auth_MenuInfo`、`tb_Auth_MenuItem`、`tb_Auth_MenuRole`、`tb_Auth_MenuRoleMenu`、`tb_Auth_MenuRoleUser`、`tb_Base_Country`、`tb_Base_Currency`、`tb_Base_Customer`、`tb_Goods_SpuInfo`、`tb_Goods_SkcInfo`、`tb_Goods_SkuInfo`
- YamBzss：`tb_Stock_SkuStock`

**删除的表（因此不抄实体/仓储/服务/DTO/控制器/页面）：** RefreshToken、PasswordResetToken、Resource、ResourceDimension、RoleResource、DataPolicy、RoleDataScope、UserDataScope、OrgUnit、UserOrgUnit、所有 `*I18n`、SkcImage、SkuImage、Consignment（Order/OrderItem）。

**关键约定（贯穿全程）：**
- 命令使用 Git Bash（POSIX sh），路径用引号包裹。
- `sqlcmd` 每次调用带 `-C`（信任证书）。
- 每个 Phase 结束提交一次 git（`docs:`/`chore:`/`feat:`/`refactor:` 前缀）。
- 「去权限」= 移除权限枚举、`RequiresPermission`/`ResourcePermission` 特性、DataScope 全套、Resource 全套、OrgUnit 全套、i18n、RefreshToken、密码找回；业务查询回归「查全部」。
- 登录后 JWT 仅带 `sub`/`nic`，**不带** `perm`/`pver`；`/v1/auth/menus` 返回**全部菜单**（不按角色过滤）。

---

## Phase 0：拷贝与重命名（产出：可加载的 YamAuth 解决方案骨架）

### Task 0.1：拷贝源码树到目标目录（排除产物与测试）

**Files:**
- Create: `$DST/src/**`、`$DST/web/**`、`$DST/scripts/**`、`$DST/deploy/**`、`$DST/*.sln`、`$DST/Directory.Build.props`

- [ ] **Step 1: 拷贝除 bin/obj/node_modules/.git/tests 外的全部内容**

Run:
```bash
SRC="/d/OSOO/Code/ProxySale"; DST="/d/CODE/YamAuth"
cd "$SRC"
# 用 tar 管道排除产物目录，保留目录结构
tar --exclude='./**/bin' --exclude='./**/obj' \
    --exclude='./**/node_modules' --exclude='./web/*/dist' \
    --exclude='./web/*/test-results' --exclude='./.git' --exclude='./.svn' \
    --exclude='./.vs' --exclude='./tests' --exclude='./docs' \
    -cf - src web scripts deploy openapi template \
    ProxySale.sln Directory.Build.props README.md AGENTS.md ONBOARDING.md .gitignore .gitattributes .dockerignore \
  | ( cd "$DST" && tar -xf - )
echo "COPY DONE"
```
Expected: 打印 `COPY DONE`，`$DST/src` 下出现 7 个 `ProxySale.*` 项目目录。

- [ ] **Step 2: 确认拷贝结果**

Run: `ls "/d/CODE/YamAuth/src" && ls "/d/CODE/YamAuth/web"`
Expected: 列出 `ProxySale.Api ProxySale.CodeGen ProxySale.DbInit ProxySale.Dtos ProxySale.Entity ProxySale.Repository ProxySale.Service`；web 下有 `ProxySale.Web`。

- [ ] **Step 3: 确认 tests 未被拷贝**

Run: `ls "/d/CODE/YamAuth/tests" 2>&1 || echo "NO TESTS (correct)"`
Expected: `NO TESTS (correct)`。

- [ ] **Step 4: Commit**

```bash
cd "/d/CODE/YamAuth" && git add -A && git -c user.name="YamAuth" -c user.email="noreply@local" commit -q -m "chore: 拷贝 ProxySale 源码树（未重命名）" && echo committed
```

### Task 0.2：批量重命名文件内容 token

**Files:** Modify: `$DST` 下所有文本源文件（`.cs .csproj .sln .json .ts .vue .ps1 .cmd .sh .md .html .scss .props`）

- [ ] **Step 1: 按顺序替换内容 token（先双库名，再项目名）**

顺序至关重要：`ProxySale1Base` 含子串 `ProxySale`，必须先替换长 token。

Run:
```bash
cd "/d/CODE/YamAuth"
# 收集目标文本文件（排除二进制/锁文件/产物）
mapfile -t FILES < <(find src web scripts deploy openapi template *.sln Directory.Build.props *.md .gitignore .gitattributes .dockerignore -type f \
  \( -name '*.cs' -o -name '*.csproj' -o -name '*.sln' -o -name '*.json' -o -name '*.ts' -o -name '*.vue' -o -name '*.js' \
     -o -name '*.ps1' -o -name '*.cmd' -o -name '*.sh' -o -name '*.md' -o -name '*.html' -o -name '*.scss' -o -name '*.props' -o -name '*.yml' -o -name '*.yaml' \) \
  ! -name 'package-lock.json' 2>/dev/null)
echo "FILES: ${#FILES[@]}"
for f in "${FILES[@]}"; do
  sed -i -e 's/ProxySale1Base/YamBase/g' \
         -e 's/ProxySale2Bzss/YamBzss/g' \
         -e 's/ProxySale/YamAuth/g' "$f"
done
echo "CONTENT RENAME DONE"
```
Expected: 打印 `FILES: <n>`（约 300+）与 `CONTENT RENAME DONE`。

- [ ] **Step 2: 校验残留**

Run: `cd "/d/CODE/YamAuth" && grep -rIl "ProxySale" src web scripts *.sln 2>/dev/null | head; echo "---"; grep -rIl "ProxySale1Base\|ProxySale2Bzss" src 2>/dev/null | head`
Expected: 两段均无输出（无残留 `ProxySale` / 旧库名）。若有输出，对列出的文件手工检查并 `sed` 修正。

### Task 0.3：重命名目录与文件名

- [ ] **Step 1: 重命名 `.csproj` / `.sln` 文件名**

Run:
```bash
cd "/d/CODE/YamAuth"
mv ProxySale.sln YamAuth.sln
for d in Api CodeGen DbInit Dtos Entity Repository Service; do
  mv "src/ProxySale.$d/ProxySale.$d.csproj" "src/ProxySale.$d/YamAuth.$d.csproj"
done
mv "web/ProxySale.Web/ProxySale.Web.csproj" "web/ProxySale.Web/YamAuth.Web.csproj" 2>/dev/null || true
echo "PROJ FILES RENAMED"
```
Expected: `PROJ FILES RENAMED`。

- [ ] **Step 2: 重命名双库子目录 `ProxySale1Base`→`YamBase`、`ProxySale2Bzss`→`YamBzss`**

Run:
```bash
cd "/d/CODE/YamAuth"
find src -depth -type d -name 'ProxySale1Base' -exec bash -c 'mv "$0" "${0%ProxySale1Base}YamBase"' {} \;
find src -depth -type d -name 'ProxySale2Bzss' -exec bash -c 'mv "$0" "${0%ProxySale2Bzss}YamBzss"' {} \;
echo "DB DIRS RENAMED"
```
Expected: `DB DIRS RENAMED`；`ls src/ProxySale.Entity` 显示 `YamBase YamBzss Abstractions`。

- [ ] **Step 3: 重命名项目根目录 `ProxySale.*`→`YamAuth.*`**

Run:
```bash
cd "/d/CODE/YamAuth"
for d in Api CodeGen DbInit Dtos Entity Repository Service; do mv "src/ProxySale.$d" "src/YamAuth.$d"; done
mv "web/ProxySale.Web" "web/YamAuth.Web"
echo "ROOT DIRS RENAMED"
ls src && ls web
```
Expected: `src` 下为 `YamAuth.Api … YamAuth.Service`；`web` 下为 `YamAuth.Web`。

- [ ] **Step 4: 修正 `.sln` 内的项目路径引用**

`.sln` 里项目路径形如 `src\ProxySale.Api\ProxySale.Api.csproj`。内容 token 已在 0.2 改为 `src\YamAuth.Api\YamAuth.Api.csproj`（`ProxySale`→`YamAuth` 同时命中路径与文件名），无需再改。仅验证：

Run: `cd "/d/CODE/YamAuth" && grep -oE 'src\\\\[A-Za-z.]+\\\\[A-Za-z.]+\.csproj' YamAuth.sln | sort -u`
Expected: 全部为 `src\YamAuth.*\YamAuth.*.csproj`，无 `ProxySale`。

- [ ] **Step 5: 还原 web 项目内 `dist`（若被 gitignore 不影响）并验证 solution 结构**

Run: `cd "/d/CODE/YamAuth" && find src -name '*.csproj' | sort`
Expected: 7 个 `src/YamAuth.*/YamAuth.*.csproj`。

- [ ] **Step 6: Commit**

```bash
cd "/d/CODE/YamAuth" && git add -A && git -c user.name="YamAuth" -c user.email="noreply@local" commit -q -m "refactor: 全面重命名 ProxySale→YamAuth / 双库→YamBase·YamBzss" && echo committed
```

---

## Phase 1：Entity 层（产出：YamAuth.Entity 编译通过）

### Task 1.1：删除无表支撑的实体与抽象

**Files:** Delete（路径均在 `$DST/src/YamAuth.Entity/`）

- [ ] **Step 1: 删除 Auth 下已删表实体**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Entity"
rm -f YamBase/Auth/AuthEntityI18n.cs YamBase/Auth/AuthI18nEntityTypes.cs \
      YamBase/Auth/DataPolicy.cs YamBase/Auth/MenuInfoI18n.cs YamBase/Auth/MenuItemI18n.cs \
      YamBase/Auth/OrgUnit.cs YamBase/Auth/PasswordResetToken.cs YamBase/Auth/RefreshToken.cs \
      YamBase/Auth/Resource.cs YamBase/Auth/ResourceDimension.cs YamBase/Auth/RoleDataScope.cs \
      YamBase/Auth/RoleResource.cs YamBase/Auth/UserDataScope.cs YamBase/Auth/UserOrgUnit.cs
echo "AUTH ENTITIES PRUNED"
```

- [ ] **Step 2: 删除 Base/Goods/Consignment 下已删表实体**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Entity"
rm -f YamBase/Goods/SkcImage.cs YamBase/Goods/SkuImage.cs
rm -rf YamBzss/Consignment
echo "BIZ ENTITIES PRUNED"
```

- [ ] **Step 3: 删除 DataScope / Resource 相关抽象**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Entity"
rm -f Abstractions/DataScopeAttribute.cs Abstractions/DataScopeBindingCatalog.cs \
      Abstractions/DataScopeSnapshot.cs Abstractions/ICustomerScoped.cs \
      Abstractions/PolicyType.cs Abstractions/ResourceCodeNormalizer.cs \
      Abstractions/ResourceDataScopeSnapshot.cs Abstractions/ResourceDimensionCatalog.cs \
      Abstractions/ResourcePermissionCodes.cs Abstractions/ResourceType.cs \
      Abstractions/UserDataScopeEffect.cs
echo "ABSTRACTIONS PRUNED"
ls Abstractions
```
Expected: `Abstractions` 仅剩 `IAuditEntity.cs IEntity.cs`。

### Task 1.2：删除保留实体中的已删列属性

**Files:**
- Modify: `src/YamAuth.Entity/YamBase/Auth/MenuInfo.cs`（删除 `ResourceCode` 属性）
- Modify: `src/YamAuth.Entity/YamBase/Auth/MenuRole.cs`（删除 `DataScopeType` 属性）

- [ ] **Step 1: MenuInfo.cs 删除 ResourceCode 块**

删除以下 4 行（含前置注释与特性）：
```csharp
    /// <summary>页面入口权限码（通常为 *.list）；目录节点为空。</summary>
    [Column(Name = "ResourceCode", StringLength = 128)]
    public string? ResourceCode { get; set; }

```

- [ ] **Step 2: MenuRole.cs 删除 DataScopeType 块**

删除以下 3 行：
```csharp
    [Column(Name = "DataScopeType")]
    public byte DataScopeType { get; set; }

```

- [ ] **Step 3: 确认无残留引用**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.Entity" && grep -rn "ResourceCode\|DataScopeType" . || echo "CLEAN"`
Expected: `CLEAN`。

### Task 1.3：编译 Entity 工程

- [ ] **Step 1: 单独构建 Entity 项目**

Run: `cd "/d/CODE/YamAuth" && dotnet build src/YamAuth.Entity/YamAuth.Entity.csproj -c Debug 2>&1 | tail -20`
Expected: `Build succeeded`，0 Error。若报缺失 `ResourcePermissionCodes` 等符号，是被其它未清理文件引用——记录符号名，确认该文件属删除清单后删掉。

- [ ] **Step 2: Commit**

```bash
cd "/d/CODE/YamAuth" && git add -A && git -c user.name="YamAuth" -c user.email="noreply@local" commit -q -m "feat(entity): 删除无表实体与 DataScope/Resource 抽象，清除已删列" && echo committed
```

---

## Phase 2：Dtos 层（产出：YamAuth.Dtos 编译通过）

### Task 2.1：删除无表支撑的 DTO

- [ ] **Step 1: 删除 Auth 下 DataScope/OrgUnit/RefreshToken/密码找回 DTO**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Dtos"
rm -f Auth/DataScopeDimensionDto.cs Auth/DataScopeSummaryDto.cs \
      Auth/OrgUnitCreateDto.cs Auth/OrgUnitDto.cs Auth/OrgUnitMoveDto.cs \
      Auth/OrgUnitUpdateDto.cs Auth/OrgUnitUserDto.cs Auth/UserOrgUnitAssignDto.cs \
      Auth/PasswordResetDtos.cs Auth/RefreshTokenDto.cs
echo "AUTH DTOS PRUNED"
```

- [ ] **Step 2: 删除 Base/Goods/Consignment 下已删表 DTO**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Dtos"
rm -f Goods/SkcImageCreateDto.cs Goods/SkcImageDto.cs Goods/SkcImageQueryDto.cs Goods/SkcImageUpdateDto.cs \
      Goods/SkuImageCreateDto.cs Goods/SkuImageDto.cs Goods/SkuImageQueryDto.cs Goods/SkuImageUpdateDto.cs
rm -rf Consignment
echo "BIZ DTOS PRUNED"
```

### Task 2.2：修正 LoginResultDto（移除 RefreshToken / Permissions / DataScope）

**Files:** Modify: `src/YamAuth.Dtos/Auth/LoginResultDto.cs`

- [ ] **Step 1: 整文件替换为精简版**

```csharp
namespace YamAuth.Dtos.Auth;

public class LoginResultDto
{
    public string Token { get; set; } = "";
    public int ExpiresIn { get; set; }
    public string UserName { get; set; } = "";
    public string NickName { get; set; } = "";
}
```

- [ ] **Step 2: 检查其余 Auth DTO 是否引用已删类型**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.Dtos" && grep -rn "DataScope\|RefreshToken\|ResourceCode\|OrgUnit" Auth/ || echo "CLEAN"`
Expected: `CLEAN`。若 `MenuInfoDto`/`MenuTreeDto` 等含 `ResourceCode`，保留为普通可空字段不影响编译；仅当引用已删 DTO 类型时才需处理。

- [ ] **Step 3: 编译 Dtos 工程**

Run: `cd "/d/CODE/YamAuth" && dotnet build src/YamAuth.Dtos/YamAuth.Dtos.csproj -c Debug 2>&1 | tail -15`
Expected: `Build succeeded`。

- [ ] **Step 4: Commit**

```bash
cd "/d/CODE/YamAuth" && git add -A && git -c user.name="YamAuth" -c user.email="noreply@local" commit -q -m "feat(dtos): 删除无表 DTO，精简 LoginResultDto" && echo committed
```

---

## Phase 3：Repository 层（产出：YamAuth.Repository 编译通过）

### Task 3.1：删除无表支撑仓储与 DataScope/Resource 基础设施

- [ ] **Step 1: 删除已删表的仓储目录/文件**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Repository"
rm -f YamBase/Auth/AuthEntityI18nRepository.cs \
      YamBase/Auth/MenuInfo/MenuInfoI18nRepository.cs \
      YamBase/Auth/MenuItem/MenuItemI18nRepository.cs
rm -rf YamBase/Auth/OrgUnit YamBase/Auth/PasswordResetToken YamBase/Auth/RefreshToken \
       YamBase/Goods/SkcImage YamBase/Goods/SkuImage \
       YamBzss/Consignment
echo "REPOS PRUNED"
```

- [ ] **Step 2: 删除 Goods 试点表的 ResourceCode 分部文件**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Repository"
rm -f YamBase/Goods/SkcInfo/SkcInfoRepository.ResourceCode.cs \
      YamBase/Goods/SkuInfo/SkuInfoRepository.ResourceCode.cs \
      YamBase/Goods/SpuInfo/SpuInfoRepository.ResourceCode.cs \
      YamBzss/Stock/SkuStock/SkuStockRepository.ResourceCode.cs
echo "RESOURCECODE PARTIALS PRUNED"
```

- [ ] **Step 3: 删除 DataScope/Resource 抽象**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Repository/Abstractions"
rm -f CustomerScopedRepositoryBase.cs DataScopeExpressionBuilder.cs DataScopeQueryExtensions.cs \
      IDataPermissionService.cs IDataScopeAccessor.cs ILocaleAccessor.cs \
      IResourceDimensionProvider.cs ResourceDataScopeAdapter.cs
echo "REPO ABSTRACTIONS PRUNED"
ls
```
Expected: `Abstractions` 剩 `DbKeys.cs ICurrentUser.cs IRepository.cs KeywordQueryExtensions.cs RepositoryBase.cs RepositoryServiceCollectionExtensions.cs`。

### Task 3.2：将 Customer 仓储改为普通仓储（去 DataScope）

**Files:** Modify: `src/YamAuth.Repository/YamBase/Base/Customer/CustomerRepository.cs`

- [ ] **Step 1: 整文件替换（构造去掉 IDataScopeAccessor，查询去掉 ApplyDataScope）**

```csharp
using FreeSql;
using Microsoft.Extensions.DependencyInjection;
using YamAuth.Entity.YamBase.Base;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Base;

public partial class CustomerRepository : RepositoryBase<Customer>, ICustomerRepository
{
    public CustomerRepository(
        [FromKeyedServices(DbKeys.Base)] IFreeSql fsql,
        ICurrentUser currentUser)
        : base(fsql, currentUser) { }

    public Task<Customer?> GetAsync(long id) => GetByIdAsync(id);
    public Task<long> InsertAsync(Customer entity) => InsertEntityAsync(entity);
    public Task InsertRangeAsync(IEnumerable<Customer> entities) => InsertEntitiesAsync(entities);
    public Task<int> UpdateAsync(Customer entity) => UpdateEntityAsync(entity);
    public Task<int> SoftDeleteAsync(long id) => SoftDeleteByIdAsync(id);

    public async Task<List<Customer>> ListAllAsync(string? keyword)
    {
        var select = Repo.Select.Where(x => !x.IsDeleted);
        var kw = KeywordQueryExtensions.Normalize(keyword);
        if (kw != null)
            select = select.Where(x => x.Code.Contains(kw) || x.Name.Contains(kw));
        return await select.OrderByDescending(x => x.CreateTime).ToListAsync();
    }

    public async Task<(long total, List<Customer> items)> PageAsync(int page, int size, string? keyword)
    {
        var select = Repo.Select.Where(x => !x.IsDeleted);
        var kw = KeywordQueryExtensions.Normalize(keyword);
        if (kw != null)
            select = select.Where(x => x.Code.Contains(kw) || x.Name.Contains(kw));
        var total = await select.CountAsync();
        var items = await select.Page(page, size).OrderByDescending(x => x.CreateTime).ToListAsync();
        return (total, items);
    }

    public async Task<bool> CodeExistsAsync(string code)
        => await Repo.Select.AnyAsync(x => x.Code == code && !x.IsDeleted);
}
```

### Task 3.3：将 Goods/Stock 仓储从 CustomerScopedRepositoryBase 改为 RepositoryBase

对 `SkcInfoRepository`、`SkuInfoRepository`、`SpuInfoRepository`（`YamBase/Goods/*`）、`SkuStockRepository`（`YamBzss/Stock/SkuStock/`）应用同一模式变换。以 **SkuInfoRepository** 为范例，其余三者结构相同（改类型名、DbKey、关键字过滤字段）。

**Files:** Modify: `src/YamAuth.Repository/YamBase/Goods/SkuInfo/SkuInfoRepository.cs`

- [ ] **Step 1: SkuInfoRepository.cs 整文件替换**

```csharp
using FreeSql;
using Microsoft.Extensions.DependencyInjection;
using YamAuth.Entity.YamBase.Goods;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBase.Goods;

public partial class SkuInfoRepository : RepositoryBase<SkuInfo>, ISkuInfoRepository
{
    public SkuInfoRepository(
        [FromKeyedServices(DbKeys.Base)] IFreeSql fsql,
        ICurrentUser currentUser)
        : base(fsql, currentUser) { }

    public Task<SkuInfo?> GetAsync(long id) => GetByIdAsync(id);
    public Task<long> InsertAsync(SkuInfo entity) => InsertEntityAsync(entity);
    public Task<int> UpdateAsync(SkuInfo entity) => UpdateEntityAsync(entity);
    public Task<int> SoftDeleteAsync(long id) => SoftDeleteByIdAsync(id);

    public async Task<(long total, List<SkuInfo> items)> PageAsync(int page, int size, string? keyword)
    {
        var select = Repo.Select.Where(x => !x.IsDeleted);
        var kw = KeywordQueryExtensions.Normalize(keyword);
        if (kw != null)
        {
            select = select.Where(x =>
                x.SkuCode.Contains(kw)
                || x.BrandName.Contains(kw)
                || x.PrdTitleCn.Contains(kw)
                || x.PrdTitleEn.Contains(kw)
                || x.PrdTitleLc.Contains(kw)
                || x.ColorName.Contains(kw)
                || x.SizeName.Contains(kw)
                || x.Remark.Contains(kw));
        }
        var total = await select.CountAsync();
        var items = await select.Page(page, size).OrderByDescending(x => x.CreateTime).ToListAsync();
        return (total, items);
    }
}
```

- [ ] **Step 2: 核对接口 `ISkuInfoRepository`**

原 `CustomerScopedRepositoryBase` 提供 `GetAsync`/`SoftDeleteAsync`，接口未必声明。打开 `YamBase/Goods/SkuInfo/ISkuInfoRepository.cs`，确保声明包含 `GetAsync/PageAsync/InsertAsync/UpdateAsync/SoftDeleteAsync`（缺则补齐，签名同 `ICountryRepository`）。

Run: `cd "/d/CODE/YamAuth/src/YamAuth.Repository" && cat YamBase/Goods/SkuInfo/ISkuInfoRepository.cs`
Expected: 五个方法齐全；若缺 `SoftDeleteAsync`/`GetAsync` 则补上：
```csharp
    Task<SkuInfo?> GetAsync(long id);
    Task<int> SoftDeleteAsync(long id);
```

- [ ] **Step 3: SkcInfoRepository.cs 整文件替换**

同 SkuInfo 模式，类型 `SkcInfo`，DbKey `DbKeys.Base`，命名空间 `YamAuth.Repository.YamBase.Goods`。关键字过滤字段（照抄原 `SkcInfoRepository.cs` 的 `PageAsync` 内 `Where` 子句，保留其字段列表，仅去掉 `ScopedSelectAsync`→改 `Repo.Select.Where(x => !x.IsDeleted)`）。构造与 `Get/Insert/Update/SoftDelete` 委托同上。

- [ ] **Step 4: SpuInfoRepository.cs 整文件替换**

同上，类型 `SpuInfo`，字段过滤照抄原文件的 `PageAsync` `Where`。

- [ ] **Step 5: SkuStockRepository.cs 整文件替换**

```csharp
using FreeSql;
using Microsoft.Extensions.DependencyInjection;
using YamAuth.Entity.YamBzss.Stock;
using YamAuth.Repository.Abstractions;

namespace YamAuth.Repository.YamBzss.Stock;

public partial class SkuStockRepository : RepositoryBase<SkuStock>, ISkuStockRepository
{
    public SkuStockRepository(
        [FromKeyedServices(DbKeys.Bzss)] IFreeSql fsql,
        ICurrentUser currentUser)
        : base(fsql, currentUser) { }

    public Task<SkuStock?> GetAsync(long id) => GetByIdAsync(id);
    public Task<long> InsertAsync(SkuStock entity) => InsertEntityAsync(entity);
    public Task<int> UpdateAsync(SkuStock entity) => UpdateEntityAsync(entity);
    public Task<int> SoftDeleteAsync(long id) => SoftDeleteByIdAsync(id);

    public async Task<(long total, List<SkuStock> items)> PageAsync(int page, int size, string? keyword)
    {
        var select = Repo.Select.Where(x => !x.IsDeleted);
        var kw = KeywordQueryExtensions.Normalize(keyword);
        if (kw != null && long.TryParse(kw, out var id))
            select = select.Where(x => x.CustomerId == id || x.WarehouseId == id || x.SkuId == id);
        var total = await select.CountAsync();
        var items = await select.Page(page, size).OrderByDescending(x => x.CreateTime).ToListAsync();
        return (total, items);
    }
}
```
（同步核对 `ISkuStockRepository.cs` 含五方法，缺则补。）

### Task 3.4：清理仓储注册扩展与 GlobalUsings

**Files:** Modify: `src/YamAuth.Repository/Abstractions/RepositoryServiceCollectionExtensions.cs`

- [ ] **Step 1: 删除 AuthEntityI18nRepository 手工注册**

删除方法内这段（`AuthEntityI18nRepository` 已删）：
```csharp
        services.AddScoped<YamAuth.Repository.YamBase.Auth.IAuthEntityI18nRepository,
            YamAuth.Repository.YamBase.Auth.AuthEntityI18nRepository>();
```
方法体保留扫描注册与 `return services;`。

- [ ] **Step 2: 检查 GlobalUsings / 其它引用残留**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.Repository" && grep -rn "IDataScopeAccessor\|ApplyDataScope\|CustomerScoped\|ResourceCode\|IAuthEntityI18n\|ILocaleAccessor" . || echo "CLEAN"`
Expected: `CLEAN`。若有命中，按「查全部」语义就地移除该引用。

- [ ] **Step 3: 编译 Repository 工程**

Run: `cd "/d/CODE/YamAuth" && dotnet build src/YamAuth.Repository/YamAuth.Repository.csproj -c Debug 2>&1 | tail -20`
Expected: `Build succeeded`。

- [ ] **Step 4: Commit**

```bash
cd "/d/CODE/YamAuth" && git add -A && git -c user.name="YamAuth" -c user.email="noreply@local" commit -q -m "feat(repository): 删除无表仓储与 DataScope 基建，业务仓储回归查全部" && echo committed
```

---

## Phase 4：Service 层（产出：YamAuth.Service 编译通过）

### Task 4.1：删除权限 / 数据权限 / 资源 / 组织 / i18n / 邮件 / 密码找回服务

- [ ] **Step 1: 删除 Auth 下整套权限相关服务**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Service/Auth"
rm -f DataPermissionResolver.cs DataPermissionService.cs DataScopeAccessor.cs DataScopeCacheKeys.cs \
      ResourceDimensionProvider.cs SmtpEmailService.cs AuthCacheOptions.cs
rm -rf Helper
rm -rf Service/PasswordResetService Service/PermissionService Service/PermissionSyncService \
       Service/RbacService Service/RoleAssignmentService Service/SessionInvalidationService
echo "AUTH SERVICES PRUNED"
ls . && echo "---SERVICE DIR---" && ls Service 2>/dev/null
```
Expected: `Auth` 剩 `Service/`；`Auth/Service` 剩 `AuthLoginService/`。

- [ ] **Step 2: 删除 Abstractions 下权限/资源/组织/Excel 相关文件**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Service/Abstractions"
rm -f DataScopeDimension.cs DataScopeType.cs IEmailService.cs OrgUnitType.cs \
      PermissionAction.cs PermissionCatalogEntry.cs PermissionCodes.cs PermissionMatcher.cs \
      Permissions.Consignment.cs Permissions.Org.cs Permissions.ResourceCatalog.cs \
      Permissions.Wildcard.cs Permissions.g.cs ResourceCatalogEntry.cs
echo "ABSTRACTIONS PRUNED"
ls
```
Expected: 剩 `ApiCodes.cs ApiResult.cs BusinessException.cs IExcelExportService.cs IExcelImportService.cs IService.cs PasswordHelper.cs ServiceServiceCollectionExtensions.cs TokenHelper.cs`。
（`IExcelExportService`/`IExcelImportService` 及其实现 `Infrastructure/ExcelExportService.cs`/`ExcelImportService.cs` 供 Customer 导入导出使用，**保留**。）

- [ ] **Step 3: 删除已删表的业务服务（Goods 图片 / Consignment / Org / RoleAssignment 等）**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Service"
rm -f YamBase/Goods/ISkcImageService.cs YamBase/Goods/SkcImageService.cs \
      YamBase/Goods/ISkuImageService.cs YamBase/Goods/SkuImageService.cs \
      YamBase/Auth/IOrgUnitService.cs YamBase/Auth/OrgUnitService.cs \
      YamBase/Auth/IMenuRoleMenuService.cs YamBase/Auth/MenuRoleMenuService.cs
rm -rf YamBzss/Consignment
echo "BIZ SERVICES PRUNED (images/org/consignment)"
```
注：`MenuRoleMenuService` 是否保留取决于其是否仅做纯 CRUD。**保留**角色三表的 CRUD 服务（`MenuRoleService`/`MenuRoleUserService`/`MenuRoleMenuService`）。若 `MenuRoleMenuService` 依赖已删的 RoleResource 同步逻辑则先删、后于 Task 4.4 用纯 CRUD 版补回。先执行下一步判定。

- [ ] **Step 4: 判定角色三表服务的依赖**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Service/YamBase/Auth"
grep -ln "RoleResource\|IDataScope\|IRbac\|ResourceCode\|IPermission\|OrgUnit\|IDataPermission\|RoleResourceSyncHelper" \
  MenuRoleService.cs MenuRoleUserService.cs MenuRoleMenuService.cs 2>/dev/null || echo "NONE COUPLED"
```
Expected: 列出需要清理的文件（若为 `NONE COUPLED` 则三表服务可原样保留）。对列出的文件在 Task 4.4 中就地剥离到纯 CRUD。上一步已删 `MenuRoleMenuService`——若本步显示它未耦合，用 `git checkout` 恢复它：`git checkout -- YamBase/Auth/MenuRoleMenuService.cs YamBase/Auth/IMenuRoleMenuService.cs`。

### Task 4.2：新增 MenuService（返回全部菜单树，替代 RbacService.GetMenuTreeAsync）

前端 `/v1/auth/menus` 依赖被删的 `RbacService`。新增一个精简 `MenuService`，返回**全部**菜单，无权限过滤。

**Files:**
- Create: `src/YamAuth.Service/YamBase/Auth/IMenuTreeService.cs`
- Create: `src/YamAuth.Service/YamBase/Auth/MenuTreeService.cs`
- Modify: `src/YamAuth.Dtos/Auth/MenuTreeDto.cs`（去掉 `Permissions`/`ResourceCode`，保留导航字段）

- [ ] **Step 1: 精简 MenuTreeDto.cs**

```csharp
namespace YamAuth.Dtos.Auth;

public class MenuTreeDto
{
    public long Id { get; set; }
    public long ParentId { get; set; }
    public string MenuName { get; set; } = "";
    public string MenuUrl { get; set; } = "";
    public string MenuIcon { get; set; } = "";
    public List<MenuTreeDto> Children { get; set; } = new();
}
```

- [ ] **Step 2: IMenuTreeService.cs**

```csharp
using YamAuth.Service.Abstractions;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public interface IMenuTreeService : IService
{
    Task<List<MenuTreeDto>> GetMenuTreeAsync();
}
```

- [ ] **Step 3: MenuTreeService.cs（读取全部未删除、未隐藏菜单，构树）**

```csharp
using Mapster;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.YamBase.Auth;

public class MenuTreeService : IMenuTreeService
{
    private readonly IMenuInfoRepository _menuRepo;

    public MenuTreeService(IMenuInfoRepository menuRepo) => _menuRepo = menuRepo;

    public async Task<List<MenuTreeDto>> GetMenuTreeAsync()
    {
        var all = await _menuRepo.ListAllAsync();          // 见 Step 4：确保仓储有该方法
        var nodes = all
            .Where(m => !m.IsHided)
            .OrderBy(m => m.SortIndex)
            .Select(m => new MenuTreeDto
            {
                Id = m.Id,
                ParentId = m.ParentId,
                MenuName = m.MenuName,
                MenuUrl = m.MenuUrl,
                MenuIcon = m.MenuIcon
            })
            .ToList();

        var byParent = nodes.ToLookup(n => n.ParentId);
        foreach (var n in nodes)
            n.Children = byParent[n.Id].ToList();

        return byParent[0].ToList();   // ParentId=0 为根
    }
}
```

- [ ] **Step 4: 确保 IMenuInfoRepository 有 ListAllAsync**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.Repository" && grep -n "ListAllAsync\|GetAllAsync\|interface IMenuInfoRepository" YamBase/Auth/MenuInfo/IMenuInfoRepository.cs`
Expected: 若已有返回全部菜单的方法（如 `ListAllAsync`/`GetAllAsync`），在 Step 3 改用其名；若无，向接口与实现各加一个：

接口 `IMenuInfoRepository.cs` 增加：
```csharp
    Task<List<YamAuth.Entity.YamBase.Auth.MenuInfo>> ListAllAsync();
```
实现 `MenuInfoRepository.cs` 增加（放入类体，去 DataScope）：
```csharp
    public Task<List<YamAuth.Entity.YamBase.Auth.MenuInfo>> ListAllAsync()
        => Repo.Select.Where(x => !x.IsDeleted).ToListAsync();
```
（若 `MenuInfoRepository` 仍继承 DataScope 基类或引用已删符号，一并改为 `RepositoryBase<MenuInfo>` 模式，同 Task 3.3。）

### Task 4.3：改写 AuthLoginService（只登录 + 改密，去 RefreshToken/RBAC/DataScope）

**Files:**
- Modify: `src/YamAuth.Service/Auth/Service/AuthLoginService/IAuthLoginService.cs`
- Modify: `src/YamAuth.Service/Auth/Service/AuthLoginService/AuthLoginService.cs`

- [ ] **Step 1: IAuthLoginService.cs 整文件替换**

```csharp
using YamAuth.Service.Abstractions;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.Auth;

public interface IAuthLoginService : IService
{
    Task<LoginResultDto> LoginAsync(LoginDto dto);
    Task ChangePasswordAsync(ChangePasswordDto dto);
}
```

- [ ] **Step 2: AuthLoginService.cs 整文件替换**

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using YamAuth.Entity.YamBase.Auth;
using YamAuth.Repository.Abstractions;
using YamAuth.Repository.YamBase.Auth;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos.Auth;

namespace YamAuth.Service.Auth;

/// <summary>登录：校验用户名/密码、签发 JWT（仅身份，不含权限）、修改密码</summary>
public class AuthLoginService : IAuthLoginService
{
    private readonly IUserRepository _userRepo;
    private readonly IConfiguration _cfg;
    private readonly ICurrentUser _current;

    public AuthLoginService(IUserRepository userRepo, IConfiguration cfg, ICurrentUser current)
    {
        _userRepo = userRepo;
        _cfg = cfg;
        _current = current;
    }

    public async Task<LoginResultDto> LoginAsync(LoginDto dto)
    {
        var account = dto.UserName.Trim();
        var user = await ResolveUserByAccountAsync(account)
            ?? throw new BusinessException("用户名或密码错误");
        if (!user.IsActived) throw new BusinessException("账号已停用");
        if (!PasswordHelper.Verify(dto.Password, user.PwdSalt, user.Password))
            throw new BusinessException("用户名或密码错误");

        var minutes = _cfg.GetValue<int>("Jwt:AccessTokenMinutes");
        var token = IssueJwt(user.Id, user.NickName, TimeSpan.FromMinutes(minutes));
        return new LoginResultDto
        {
            Token = token,
            ExpiresIn = minutes * 60,
            UserName = user.UserName,
            NickName = user.NickName
        };
    }

    async Task<User?> ResolveUserByAccountAsync(string account)
    {
        if (string.IsNullOrWhiteSpace(account)) return null;
        var byUserName = await _userRepo.FindByUserNameAsync(account);
        if (byUserName != null) return byUserName;
        return await _userRepo.FindByEmailAsync(account);
    }

    public async Task ChangePasswordAsync(ChangePasswordDto dto)
    {
        if (!_current.IsAuthenticated || _current.UserId <= 0)
            throw new BusinessException("未登录", 401);
        var user = await _userRepo.GetAsync(_current.UserId)
            ?? throw new BusinessException("用户不存在", 404);
        if (!PasswordHelper.Verify(dto.OldPassword, user.PwdSalt, user.Password))
            throw new BusinessException("原密码错误", 400);
        if (dto.OldPassword == dto.NewPassword)
            throw new BusinessException("新密码不能与原密码相同", 400);
        var (hash, salt) = PasswordHelper.Hash(dto.NewPassword);
        user.Password = hash;
        user.PwdSalt = salt;
        await _userRepo.UpdateAsync(user);
    }

    string IssueJwt(long userId, string nic, TimeSpan ttl)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:SecretKey"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new("sub", userId.ToString()),
            new("nic", nic ?? "")
        };
        var jwt = new JwtSecurityToken(
            issuer: _cfg["Jwt:Issuer"],
            audience: _cfg["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.Add(ttl),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }
}
```

- [ ] **Step 3: 核对 IUserRepository 仍有 GetAsync/FindByUserNameAsync/FindByEmailAsync/UpdateAsync**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.Repository" && grep -n "FindByUserNameAsync\|FindByEmailAsync\|GetAsync\|UpdateAsync" YamBase/Auth/User/IUserRepository.cs YamBase/Auth/User/IUserRepository.Extensions.cs`
Expected: 四方法均存在。`UserRepository` 若继承 DataScope 基类或含 Resource 逻辑，改为 `RepositoryBase<User>` 模式（同 Task 3.3），保留其登录查询方法。

### Task 4.4：剥离保留业务服务中的 DataScope（Country/Currency/Customer/Goods/Stock/User/Menu*）

**Files:** Modify: 所有仍引用 `IDataScopeGuard` / `DataScopeDimensions` / `YamAuth.Service.Auth`（DataScope 相关）的服务。

- [ ] **Step 1: 定位受影响服务**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.Service" && grep -rln "IDataScopeGuard\|DataScopeDimensions\|_scopeGuard\|IRbac\|IPermission\|IDataPermission\|ISessionInvalidation\|IEmailService\|IPasswordReset" .`
Expected: 一份清单（预期含 `Goods/SkuInfoService`、`Goods/SkcInfoService`、`Goods/SpuInfoService`、`Stock/SkuStockService`、`Base/CustomerService`、可能 `Auth/UserService`）。

- [ ] **Step 2: SkuInfoService.cs 整文件替换（去 _scopeGuard）**

```csharp
using Mapster;
using YamAuth.Entity.YamBase.Goods;
using YamAuth.Repository.YamBase.Goods;
using YamAuth.Service.Abstractions;
using YamAuth.Dtos.Goods;

namespace YamAuth.Service.YamBase.Goods;

public partial class SkuInfoService : ISkuInfoService
{
    private readonly ISkuInfoRepository _repo;
    public SkuInfoService(ISkuInfoRepository repo) => _repo = repo;

    public async Task<SkuInfoDto?> GetAsync(long id)
    {
        var e = await _repo.GetAsync(id);
        return e == null ? null : e.Adapt<SkuInfoDto>();
    }

    public async Task<PagedResult<SkuInfoDto>> PageAsync(SkuInfoQueryDto q)
    {
        var (total, items) = await _repo.PageAsync(q.Page, q.Size, q.Keyword);
        return new PagedResult<SkuInfoDto> { Total = total, Items = items.Adapt<List<SkuInfoDto>>() };
    }

    public Task<long> CreateAsync(SkuInfoCreateDto dto) => _repo.InsertAsync(dto.Adapt<SkuInfo>());

    public async Task UpdateAsync(long id, SkuInfoUpdateDto dto)
    {
        var e = await _repo.GetAsync(id) ?? throw new BusinessException("记录不存在", 404);
        dto.Adapt(e);
        e.Id = id;
        await _repo.UpdateAsync(e);
    }

    public Task DeleteAsync(long id) => _repo.SoftDeleteAsync(id);
}
```

- [ ] **Step 3: SkcInfoService.cs / SpuInfoService.cs / SkuStockService.cs 同法替换**

对每个文件：删除 `IDataScopeGuard _scopeGuard` 字段与构造参数、`using YamAuth.Service.Auth;`（若仅为 DataScope 引入）、`await _scopeGuard.EnsureCustomerAccessAsync(...)` 与 `await _scopeGuard.EnsureRecordAccessAsync(...)` 调用行。类型分别为 `SkcInfo`/`SpuInfo`/`SkuStock`，命名空间照旧。`SkuStockService` 命名空间 `YamAuth.Service.YamBzss.Stock`、仓储 `YamAuth.Repository.YamBzss.Stock`。

- [ ] **Step 4: CustomerService.cs 去 _scopeGuard（保留 Excel 导入导出）**

删除字段 `private readonly IDataScopeGuard _scopeGuard;`、构造参数 `IDataScopeGuard scopeGuard`、赋值行 `_scopeGuard = scopeGuard;`、以及 `CreateAsync` 内 `await _scopeGuard.EnsureUnrestrictedDataScopeAsync();` 一行。保留 `IExcelExportService`/`IExcelImportService` 相关字段与逻辑。若含 `using YamAuth.Service.Auth;` 且不再需要则删。

- [ ] **Step 5: 处理 UserService 与角色三表服务的耦合**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.Service" && grep -rln "IDataScopeGuard\|IRbac\|IPermission\|IDataPermission\|RoleResource\|OrgUnit\|ISessionInvalidation\|DataScopeDimensions" YamBase/Auth/`
Expected: 列出仍耦合的文件。逐个就地剥离：移除相关字段/构造参数/调用，保留 CRUD 主体。`UserService` 保留用户增删改查与密码设置；移除 perm 版本自增、角色分配、DataScope 相关方法（若属已删接口方法，一并从 `IUserService` 删声明）。

- [ ] **Step 6: 清理 ServiceServiceCollectionExtensions.cs 与 GlobalUsings**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.Service" && grep -rn "IDataScopeGuard\|IRbac\|IEmailService\|IPasswordReset\|Permissions\.\|DataScope\|OrgUnit\|ResourceCode\|ILocaleAccessor" . | grep -v "GetMenuTree" || echo "CLEAN"`
Expected: `CLEAN`（除 MenuTreeService 无关命中）。剩余命中逐个处理。

- [ ] **Step 7: 编译 Service 工程**

Run: `cd "/d/CODE/YamAuth" && dotnet build src/YamAuth.Service/YamAuth.Service.csproj -c Debug 2>&1 | tail -25`
Expected: `Build succeeded`。反复迭代：每个 error 指向一处残留耦合，按「保留 CRUD、删权限」原则移除。

- [ ] **Step 8: Commit**

```bash
cd "/d/CODE/YamAuth" && git add -A && git -c user.name="YamAuth" -c user.email="noreply@local" commit -q -m "feat(service): 只留登录+CRUD，新增全量 MenuTreeService，剥离 DataScope/RBAC/Org/i18n" && echo committed
```

---

## Phase 5：Api 层（产出：整个解决方案编译通过）

### Task 5.1：删除无表 / 权限相关控制器与过滤器

- [ ] **Step 1: 删除控制器**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Api/Controllers/V1"
rm -f Auth/DataScopeDimensionsController.cs Auth/OrgUnitsController.cs \
      Auth/RoleAssignmentsController.cs \
      Goods/SkcImagesController.cs Goods/SkuImagesController.cs
rm -rf Consignment
echo "CONTROLLERS PRUNED"
```
（`RbacController` 暂留——下一步改造为调用 `MenuTreeService`；`MenuRoleMenusController`/`MenuRolesController`/`MenuRoleUsersController` 保留为 CRUD。）

- [ ] **Step 2: 删除权限过滤器**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Api/Filters"
rm -f HasPermissionAttribute.cs RequiresAnyPermissionAttribute.cs \
      RequiresPermissionAttribute.cs ResourcePermissionAttribute.cs
echo "FILTERS PRUNED"
ls
```
Expected: `Filters` 剩 `ApiResultFilter.cs FluentValidationActionFilter.cs`。

- [ ] **Step 3: 删除权限/会话/i18n 相关中间件与服务**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Api"
rm -f Middlewares/LocaleMiddleware.cs Middlewares/SessionValidationMiddleware.cs \
      Services/LocaleAccessor.cs Services/UserSessionValidator.cs \
      Hosted/PermissionSyncHostedService.cs
rmdir Hosted 2>/dev/null || true
echo "MW/SVC PRUNED"
```
（保留 `Middlewares/GlobalExceptionMiddleware.cs`、`Services/CurrentUserAccessor.cs`、`Infrastructure/FreeSqlFactory.cs`。）

### Task 5.2：改造 RbacController → 调用 MenuTreeService

**Files:** Modify: `src/YamAuth.Api/Controllers/V1/Auth/RbacController.cs`（或重命名为 MenuController，保持路由 `api/v1/auth/menus` 不变）

- [ ] **Step 1: 整文件替换**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YamAuth.Service.YamBase.Auth;
using YamAuth.Dtos.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth")]
[Authorize]
public class RbacController : ControllerBase
{
    private readonly IMenuTreeService _menu;
    public RbacController(IMenuTreeService menu) => _menu = menu;

    [HttpGet("menus")]
    public Task<List<MenuTreeDto>> Menus() => _menu.GetMenuTreeAsync();
}
```

### Task 5.3：改造 LoginController（去 refresh/logout/forgot/reset）

**Files:** Modify: `src/YamAuth.Api/Controllers/V1/Auth/LoginController.cs`

- [ ] **Step 1: 整文件替换**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using YamAuth.Service.Auth;
using YamAuth.Dtos.Auth;

namespace YamAuth.Api.Controllers.V1.Auth;

[ApiController]
[Route("api/v1/auth")]
public class LoginController : ControllerBase
{
    private readonly IAuthLoginService _svc;
    public LoginController(IAuthLoginService svc) => _svc = svc;

    [HttpPost("login"), AllowAnonymous, EnableRateLimiting("login")]
    public Task<LoginResultDto> Login([FromBody] LoginDto dto) => _svc.LoginAsync(dto);

    [HttpPost("change-password"), Authorize]
    public Task ChangePassword([FromBody] ChangePasswordDto dto) => _svc.ChangePasswordAsync(dto);
}
```

### Task 5.4：去掉其余控制器上的权限特性

- [ ] **Step 1: 批量移除 `[RequiresPermission(...)]` / `[ResourcePermission(...)]` / `[RequiresAnyPermission(...)]` 特性**

Run:
```bash
cd "/d/CODE/YamAuth/src/YamAuth.Api/Controllers"
# 删除独立成行的权限特性
grep -rl "RequiresPermission\|ResourcePermission\|RequiresAnyPermission" . | while read -r f; do
  sed -i -E '/^[[:space:]]*\[(RequiresPermission|ResourcePermission|RequiresAnyPermission)\(/d' "$f"
done
echo "ATTR LINES REMOVED"
grep -rn "RequiresPermission\|ResourcePermission\|RequiresAnyPermission" . || echo "CLEAN"
```
Expected: 末尾 `CLEAN`。若有**行内**（与 `[HttpGet(...)]` 同行）的权限特性未被删，手工处理：把 `[HttpGet("menus"), RequiresPermission(...)]` 改为 `[HttpGet("menus")]`。

- [ ] **Step 2: 清理控制器 using / Permissions 引用**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.Api" && grep -rn "using YamAuth.Service.Abstractions;.*Permissions\|Permissions\.\|IRbacService\|IRoleAssignment\|IOrgUnit\|DataScope\|ResourceCode" Controllers/ || echo "CLEAN"`
Expected: `CLEAN`。逐个命中处理（删 `using`、删引用行）。控制器统一保留类级 `[Authorize]`（登录可访问）。

### Task 5.5：改写 Program.cs（去权限/会话/i18n/邮件/HostedService 注册）

**Files:** Modify: `src/YamAuth.Api/Program.cs`

- [ ] **Step 1: 删除以下注册行**

删除这些行（若存在）：
```csharp
builder.Services.Configure<AuthCacheOptions>(builder.Configuration.GetSection(AuthCacheOptions.SectionName));
builder.Services.AddScoped<IDataScopeAccessor, DataScopeAccessor>();
builder.Services.AddScoped<IUserSessionValidator, UserSessionValidator>();
builder.Services.AddScoped<LocaleAccessor>();
builder.Services.AddScoped<ILocaleAccessor>(sp => sp.GetRequiredService<LocaleAccessor>());
builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddHostedService<PermissionSyncHostedService>();
```
以及对应的 `using` 行（`YamAuth.Api.Hosted;`、`YamAuth.Service.Auth;` 中仅 DataScope 用途者按需保留——`IAuthLoginService` 仍在 `YamAuth.Service.Auth` 命名空间，故该 using 保留）。

- [ ] **Step 2: 删除管线中间件行**

删除：
```csharp
app.UseMiddleware<LocaleMiddleware>();
app.UseMiddleware<SessionValidationMiddleware>();
```
保留：`GlobalExceptionMiddleware`、`UseCors`、`UseRateLimiter`、`UseAuthentication`、`UseAuthorization`、`MapControllers`、`MapHealthChecks`。

- [ ] **Step 3: 修正 JWT 校验的 keyed IFreeSql 连接名（内容已重命名，仅确认）**

确认这两行为 YamBase/YamBzss：
```csharp
builder.Services.AddKeyedSingleton<IFreeSql>(DbKeys.Base, (sp, _) =>
    FreeSqlFactory.Create(sp.GetRequiredService<IConfiguration>(), "Base", "YamBase"));
builder.Services.AddKeyedSingleton<IFreeSql>(DbKeys.Bzss, (sp, _) =>
    FreeSqlFactory.Create(sp.GetRequiredService<IConfiguration>(), "Bzss", "YamBzss"));
```

- [ ] **Step 4: 确认健康检查连接键**

`AddSqlServer(builder.Configuration["Db:Base"]!, name: "YamBase")` 与 `"Db:Bzss"`/`"YamBzss"` —— 内容已随重命名更新，确认即可。

- [ ] **Step 5: 确认启动日志文案**

`Log.Information("YamAuth.Api starting on {Url}", "http://localhost:6500");` —— 已随重命名更新。

### Task 5.6：清理 Validators（删除已删表的生成校验器）

- [ ] **Step 1: 删除 Consignment/Image 相关生成校验器条目**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.Api/Validators" && ls Generated && grep -ln "SkcImage\|SkuImage\|Consignment\|OrgUnit\|DataScope\|RefreshToken\|PasswordReset" Generated/*.cs AuthValidators.cs 2>/dev/null`
Expected: 列出含已删类型的校验器文件/片段。对 `Generated/GoodsValidators.g.cs` 删除 `SkcImage*`/`SkuImage*` 校验类；`AuthValidators.cs` 删除 RefreshToken/密码找回相关校验器；删除整文件级的 Consignment 校验（若存在于某 `.g.cs`）。保留 Login/ChangePassword/Country/Currency/Customer/Spu/Skc/Sku/SkuStock 校验器。

- [ ] **Step 2: 编译整个解决方案**

Run: `cd "/d/CODE/YamAuth" && dotnet build YamAuth.sln -c Debug 2>&1 | tail -30`
Expected: `Build succeeded`，0 Error（CodeGen 项目此时可能仍报权限相关错误——若如此，先在 Phase 6 修复，或临时将 CodeGen 从 sln 卸载后再整体构建 Api）。若 CodeGen 阻断，先单独构建除 CodeGen 外项目：
```bash
for p in Entity Dtos Repository Service Api DbInit; do dotnet build "src/YamAuth.$p/YamAuth.$p.csproj" -c Debug 2>&1 | tail -3; done
```

- [ ] **Step 3: Commit**

```bash
cd "/d/CODE/YamAuth" && git add -A && git -c user.name="YamAuth" -c user.email="noreply@local" commit -q -m "feat(api): 精简 Program/Login/Rbac，去权限特性与会话/i18n 中间件" && echo committed
```

---

## Phase 6：CodeGen 去权限（产出：YamAuth.CodeGen 编译通过且模板不再发射权限代码）

> 目的：后续若从 YamBase/YamBzss 再生成表，产物不带权限。若暂不需要生成能力，最低限度让 CodeGen 编译通过即可。

### Task 6.1：删除 PermissionsGenerator 并从流程摘除

**Files:**
- Delete: `src/YamAuth.CodeGen/Generators/PermissionsGenerator.cs`
- Modify: `src/YamAuth.CodeGen/Program.cs`

- [ ] **Step 1: 删除权限生成器**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.CodeGen" && rm -f Generators/PermissionsGenerator.cs && echo done`

- [ ] **Step 2: 从 Program.cs 摘除 PermissionsGenerator 调用**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.CodeGen" && grep -n "Permission\|ResourceCode\|DataScope\|RequiresPermission" Program.cs Generators/*.cs Schema/*.cs`
删除 `Program.cs` 中对 `PermissionsGenerator` 的实例化与 `Run/Generate` 调用行；删除相关 `using`。

### Task 6.2：从模板生成器中去掉权限发射

**Files:** Modify: `src/YamAuth.CodeGen/Generators/{ControllerGenerator,ServiceGenerator,RepositoryGenerator}.cs`

- [ ] **Step 1: ControllerGenerator — 去掉 RequiresPermission/ResourcePermission 输出**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.CodeGen/Generators" && grep -n "RequiresPermission\|ResourcePermission\|Permissions\.\|ResourceCode" ControllerGenerator.cs`
将模板字符串里发射 `[RequiresPermission(...)]` / `[ResourcePermission(...)]` 的片段删除，控制器方法只保留 `[HttpGet]` 等路由特性；类级发射 `[Authorize]`。

- [ ] **Step 2: ServiceGenerator — 去掉 IDataScopeGuard 注入与调用发射**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.CodeGen/Generators" && grep -n "IDataScopeGuard\|DataScopeDimensions\|EnsureCustomerAccess\|EnsureRecordAccess" ServiceGenerator.cs`
删除模板中发射 `IDataScopeGuard _scopeGuard`、构造参数、`EnsureCustomerAccessAsync`/`EnsureRecordAccessAsync` 调用的片段，使生成的 Service 形如 Task 4.4 的精简版。

- [ ] **Step 3: RepositoryGenerator — 生成 RepositoryBase 而非 CustomerScopedRepositoryBase**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.CodeGen/Generators" && grep -n "CustomerScopedRepositoryBase\|IDataScopeAccessor\|ScopedSelectAsync\|ResourceCode\|ApplyDataScope" RepositoryGenerator.cs`
将基类发射改为 `RepositoryBase<T>`，构造去掉 `IDataScopeAccessor`，查询用 `Repo.Select.Where(x => !x.IsDeleted)`，删除 `ResourceCode` 分部与 `ScopedSelectAsync`。

- [ ] **Step 4: 删除 CodeGen 内引用已删符号的 Schema 辅助**

Run: `cd "/d/CODE/YamAuth/src/YamAuth.CodeGen" && grep -rn "DataScope\|ResourceDimension\|ResourceCode\|Permission" Schema/*.cs Naming.cs`
删除/精简命中片段（如 `TableInfoExtensions` 中 DataScope 绑定推断）。

- [ ] **Step 5: 编译 CodeGen 工程**

Run: `cd "/d/CODE/YamAuth" && dotnet build src/YamAuth.CodeGen/YamAuth.CodeGen.csproj -c Debug 2>&1 | tail -20`
Expected: `Build succeeded`。

- [ ] **Step 6: 整解决方案编译**

Run: `cd "/d/CODE/YamAuth" && dotnet build YamAuth.sln -c Debug 2>&1 | tail -15`
Expected: `Build succeeded`，0 Error。

- [ ] **Step 7: Commit**

```bash
cd "/d/CODE/YamAuth" && git add -A && git -c user.name="YamAuth" -c user.email="noreply@local" commit -q -m "feat(codegen): 模板去权限（删 PermissionsGenerator，生成 RepositoryBase/无 DataScope 服务）" && echo committed
```

---

## Phase 7：配置、SQL 初始化与脚本（产出：两库建表 + 种子，API 可连库）

### Task 7.1：配置连接串

**Files:**
- Modify: `src/YamAuth.Api/appsettings.json`
- Modify: `src/YamAuth.CodeGen/appsettings.json`
- Create: `scripts/database.local.json`

- [ ] **Step 1: 精简 Api appsettings.json**

将 `Db` 段设为本地库；删除 `Smtp`、`PasswordReset`、`Rbac`、`Auth` 段；`Jwt` 去掉 `RefreshTokenDays`，补一个开发用 `SecretKey`（≥32 字节）。目标内容：
```json
{
  "Db": {
    "Base": "Server=127.0.0.1;Database=YamBase;User Id=sa;Password=1qazXSW@;TrustServerCertificate=True;",
    "Bzss": "Server=127.0.0.1;Database=YamBzss;User Id=sa;Password=1qazXSW@;TrustServerCertificate=True;",
    "LogSql": false
  },
  "Jwt": {
    "Issuer": "YamAuth",
    "Audience": "YamAuth.Web",
    "SecretKey": "YamAuth-dev-secret-key-change-me-0123456789",
    "AccessTokenMinutes": 120
  },
  "Cors": { "AllowedOrigins": [ "http://localhost:6501" ] },
  "App": { "WebBaseUrl": "http://localhost:6501" },
  "Swagger": { "Enabled": true },
  "Serilog": {
    "Using": ["Serilog.Sinks.Console", "Serilog.Sinks.File"],
    "MinimumLevel": { "Default": "Information", "Override": { "Microsoft": "Warning" } },
    "WriteTo": [
      { "Name": "Console" },
      { "Name": "File", "Args": { "path": "logs/yam-auth-.log", "rollingInterval": "Day", "retainedFileCountLimit": 14 } }
    ]
  }
}
```

- [ ] **Step 2: CodeGen appsettings.json 指向本地两库**

```json
{
  "Databases": [
    { "Name": "YamBase", "ConnectionString": "Server=127.0.0.1;Database=YamBase;User Id=sa;Password=1qazXSW@;TrustServerCertificate=True;" },
    { "Name": "YamBzss", "ConnectionString": "Server=127.0.0.1;Database=YamBzss;User Id=sa;Password=1qazXSW@;TrustServerCertificate=True;" }
  ],
  "Output": {
    "EntityProject": "src/YamAuth.Entity",
    "RepositoryProject": "src/YamAuth.Repository",
    "DtosProject": "src/YamAuth.Dtos",
    "ServiceProject": "src/YamAuth.Service",
    "ApiProject": "src/YamAuth.Api"
  }
}
```

- [ ] **Step 3: scripts/database.local.json（供 init-db 脚本；已 gitignore）**

先看模板：`cat scripts/database.local.json.example`，据其字段写 `scripts/database.local.json`：
```json
{
  "Server": "127.0.0.1",
  "User": "sa",
  "Password": "1qazXSW@",
  "DbBase": "YamBase",
  "DbSecondary": "YamBzss"
}
```
（字段名以 `.example` 为准，不一致时以 example 的键名为准。）

### Task 7.2：精简 DbInit SQL 到 13 张保留表

> 两库已由用户手工建好并含数据；`init_db.sql` 仅用于「重建/新环境」。这里把脚本改到与现库一致，避免误建已删表。

**Files:**
- Modify: `scripts/init_db.sql`（主库结构：仅 12 张 YamBase 表）
- Modify: `scripts/init_db.secondary.sql`（第二库：仅 `tb_Stock_SkuStock`）
- Modify: `scripts/init_db.seed.sql`（菜单 + 超管，去权限/角色强绑定的多余种子）
- Modify: `scripts/init-db.manifest.json`（引用清单，去掉已删迁移）

- [ ] **Step 1: 从现库导出权威 DDL 作为基准**

Run:
```bash
SQLCMD="/c/Program Files/Microsoft SQL Server/Client SDK/ODBC/170/Tools/Binn/sqlcmd"
"$SQLCMD" -S 127.0.0.1 -U sa -P '1qazXSW@' -d YamBase -C -h -1 -W -Q "SET NOCOUNT ON; SELECT name FROM sys.tables ORDER BY name"
echo "--- Bzss ---"
"$SQLCMD" -S 127.0.0.1 -U sa -P '1qazXSW@' -d YamBzss -C -h -1 -W -Q "SET NOCOUNT ON; SELECT name FROM sys.tables ORDER BY name"
```
Expected: YamBase 12 张、YamBzss 1 张——作为脚本应包含的表清单基准。

- [ ] **Step 2: 编辑 init_db.sql——删除已删表的 CREATE TABLE 段**

打开 `scripts/init_db.sql`，删除以下表的建表语句：`tb_Auth_RefreshToken`、`tb_Auth_PasswordResetToken`、`tb_Auth_Resource`、`tb_Auth_ResourceDimension`、`tb_Auth_RoleResource`、`tb_Auth_DataPolicy`、`tb_Auth_RoleDataScope`、`tb_Auth_UserDataScope`、`tb_Auth_OrgUnit`、`tb_Auth_UserOrgUnit`、所有 `*_i18n`、`tb_Goods_SkcImage`、`tb_Goods_SkuImage`。同时从 `tb_Auth_MenuInfo` 删 `ResourceCode` 列、从 `tb_Auth_MenuRole` 删 `DataScopeType` 列（与库一致）。保留 12 张表。

Run（编辑后校验脚本不再含已删表名）: `cd "/d/CODE/YamAuth/scripts" && grep -nE "RefreshToken|PasswordResetToken|_Resource|ResourceDimension|RoleResource|DataPolicy|RoleDataScope|UserDataScope|OrgUnit|_i18n|SkcImage|SkuImage|ResourceCode|DataScopeType" init_db.sql || echo "CLEAN"`
Expected: `CLEAN`。

- [ ] **Step 3: init_db.secondary.sql——仅保留 tb_Stock_SkuStock**

删除 Consignment 相关建表；仅留 `tb_Stock_SkuStock`。
Run: `cd "/d/CODE/YamAuth/scripts" && grep -nE "Consignment" init_db.secondary.sql || echo "CLEAN"`
Expected: `CLEAN`。

- [ ] **Step 4: init_db.seed.sql——精简种子**

保留：菜单组/菜单/菜单项种子（对应保留页面）、超级管理员用户（`tb_Auth_User` 一行，密码由 DbInit 的 AdminCredentialPatcher 覆盖）。删除：`tb_Auth_Resource`/`RoleResource`/`DataPolicy`/`OrgUnit`/i18n 的 INSERT。删除菜单种子里对已删页面（OrgUnits、DataScope、Consignment、Images、RoleDataScopeAssign、RoleCustomersAssign）的 MenuInfo 行。
Run: `cd "/d/CODE/YamAuth/scripts" && grep -nE "Resource|DataPolicy|OrgUnit|_i18n|Consignment|SkcImage|SkuImage|DataScope" init_db.seed.sql || echo "CLEAN"`
Expected: `CLEAN`。

- [ ] **Step 5: 精简 manifest 与删除废弃迁移/生成 SQL**

Run:
```bash
cd "/d/CODE/YamAuth/scripts"
rm -f tb_Auth_Entity_i18n_sync.g.sql tb_Auth_MenuItem_seed.g.sql tb_Auth_Resource_seed.g.sql \
      init_db.full.bak.sql simplify-init-db.ps1
rm -rf migrations migrations-bzss verify
cat init-db.manifest.json
```
确保 `init-db.manifest.json` 为：
```json
{
  "baseScripts": [ "init_db.sql", "init_db.seed.sql" ],
  "secondaryScripts": [ "init_db.secondary.sql" ]
}
```

- [ ] **Step 6: 冒烟——对现库跑一次结构校验（不重建，只验证脚本语法可解析）**

> 现库已存在，勿重复 CREATE。仅验证脚本无残留已删对象即可（已在 Step 2-4 校验）。真正重建留待新环境。

- [ ] **Step 7: Commit**

```bash
cd "/d/CODE/YamAuth" && git add -A && git -c user.name="YamAuth" -c user.email="noreply@local" commit -q -m "chore(scripts+config): 连接串指向 YamBase/YamBzss，SQL 精简到 13 张保留表" && echo committed
```

### Task 7.3：后端启动冒烟

- [ ] **Step 1: 启动 API**

Run（后台）: `cd "/d/CODE/YamAuth" && dotnet run --project src/YamAuth.Api/YamAuth.Api.csproj -c Debug`（`run_in_background: true`）
Expected: 日志出现 `YamAuth.Api starting on http://localhost:6500`，无启动异常（DI 解析全部成功）。

- [ ] **Step 2: 健康检查**

Run: `sleep 6 && curl -s http://localhost:6500/health`
Expected: `Healthy`（两库连接 OK）。

- [ ] **Step 3: 登录接口冒烟**

Run:
```bash
curl -s -X POST http://localhost:6500/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userName":"admin","password":"<init 输出或 database.local 的管理员密码>"}'
```
Expected: 返回含 `token` 的 JSON（`refreshToken`/`permissions` 字段应已消失）。若 401，确认 `tb_Auth_User` 是否有 admin 行及密码；必要时用 DbInit 或手工插入。

- [ ] **Step 4: 菜单接口冒烟（带 token）**

Run:
```bash
TOKEN="<上一步 token>"
curl -s http://localhost:6500/api/v1/auth/menus -H "Authorization: Bearer $TOKEN"
```
Expected: 返回菜单树 JSON（全部菜单，节点含 `menuName/menuUrl/menuIcon/children`）。

- [ ] **Step 5: 停止后台 API 进程**（记录并 TaskStop 该后台任务）

---

## Phase 8：前端（产出：YamAuth.Web 构建通过，去权限）

### Task 8.1：删除无表 / 权限相关页面、api、组件

- [ ] **Step 1: 删除视图**

Run:
```bash
cd "/d/CODE/YamAuth/web/YamAuth.Web/src/views"
rm -f auth/OrgUnits.vue auth/RoleDataScopeAssign.vue auth/RoleCustomersAssign.vue \
      login/ForgotPassword.vue login/ResetPassword.vue \
      goods/SkcImages.vue goods/SkuImages.vue
rm -rf consignment
echo "VIEWS PRUNED"
```
（保留 `auth/MenuRoles.vue`、`auth/RoleMenusAssign.vue`、`auth/UserRolesAssign.vue`、`auth/MenuInfos.vue`、`auth/MenuItems.vue`、`auth/MenuRoleMenus.vue`、`auth/MenuRoleUsers.vue`、`auth/Users.vue`、`auth/menu-infos/*`、`base/*`、`goods/Spu/Skc/SkuInfos.vue`、`stock/SkuStocks.vue`。）

- [ ] **Step 2: 删除 api 与组件**

Run:
```bash
cd "/d/CODE/YamAuth/web/YamAuth.Web/src"
rm -f api/dataScope.ts api/orgUnit.ts
rm -f components/auth/RoleDataScopePanel.vue components/auth/UserDataScopePanel.vue \
      components/auth/UserOrgAssignPanel.vue components/OrderStatusFilterBar.vue
echo "API/COMPONENTS PRUNED"
```
（`api/roleAssignment.ts` 暂留——角色页面 CRUD 可能用到；下一步按编译结果处理。`components/CustomerSelect*` 保留。）

### Task 8.2：精简 user store（去 refreshToken/permissions/dataScope/hasPerm）

**Files:** Modify: `web/YamAuth.Web/src/stores/user.ts`

- [ ] **Step 1: 整文件替换**

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { LoginResult } from '@/constants/auth';

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') ?? '');
  const userName = ref<string>(localStorage.getItem('userName') ?? '');
  const nickName = ref<string>(localStorage.getItem('nickName') ?? '');

  function persist() {
    localStorage.setItem('token', token.value);
    localStorage.setItem('userName', userName.value);
    localStorage.setItem('nickName', nickName.value);
  }

  function setLogin(data: LoginResult) {
    token.value = data.token;
    userName.value = data.userName;
    nickName.value = data.nickName;
    persist();
  }

  function clearLocal() {
    token.value = '';
    userName.value = '';
    nickName.value = '';
    localStorage.clear();
  }

  function logout() { clearLocal(); }

  // 去权限：一律放行
  function hasPerm(_perm: string) { return true; }

  return { token, userName, nickName, setLogin, clearLocal, logout, hasPerm };
});
```
（保留 `hasPerm` 恒 true，使模板中 `v-has` 与路由守卫无需改动即放行。）

### Task 8.3：精简 auth 相关类型与 api

**Files:**
- Modify: `web/YamAuth.Web/src/constants/auth.ts`（`LoginResult` 去 refreshToken/permissions/dataScope）
- Modify: `web/YamAuth.Web/src/api/auth.ts`（删 logout/forgot/reset）

- [ ] **Step 1: 修改 LoginResult 类型**

Run: `cd "/d/CODE/YamAuth/web/YamAuth.Web/src/constants" && cat auth.ts`
将 `LoginResult` 接口改为仅含后端返回字段：
```ts
export interface LoginResult {
  token: string;
  expiresIn: number;
  userName: string;
  nickName: string;
}
```
删除 `DataScopeSummary` 类型及其导出（若本文件定义）。若被其它文件 import，将在 8.5 编译时暴露并清理。

- [ ] **Step 2: 精简 api/auth.ts**

```ts
import { request } from '@/utils/request';
import type { LoginResult } from '@/constants/auth';

export function login(userName: string, password: string) {
  return request<LoginResult>({ url: '/v1/auth/login', method: 'POST', data: { userName, password } });
}

export function fetchMenuTree() {
  return request<import('@/stores/menu').MenuNode[]>({ url: '/v1/auth/menus', method: 'GET' });
}

export function changePassword(oldPassword: string, newPassword: string) {
  return request<void>({ url: '/v1/auth/change-password', method: 'POST', data: { oldPassword, newPassword } });
}
```

### Task 8.4：路由去权限（静态路由删除已删页面 + 守卫放行）

**Files:**
- Modify: `web/YamAuth.Web/src/router/index.ts`
- Modify: `web/YamAuth.Web/src/stores/menu.ts`（MenuNode 去 permissions/resourceCode，可选）

- [ ] **Step 1: index.ts——删除 forgot/reset/consignment 静态路由与权限判断**

将 `staticRoutes` 精简为（去掉 forgot-password、reset-password、consignment 三段、`consignmentOrder` import、`canAccessRoute` 判断）：
```ts
import { fetchMenuTree } from '@/api/auth'
import { ensureDynamicRoutes, routeState } from '@/router/dynamic'
import { useMenuStore } from '@/stores/menu'
import { useUserStore } from '@/stores/user'
import { localizeMenuTree } from '@/utils/menuI18n'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

const staticRoutes: RouteRecordRaw[] = [
  { path: '/login', component: () => import('@/views/login/Login.vue') },
  {
    path: '/',
    name: 'Default',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/home',
    children: [
      { path: 'home', component: () => import('@/views/home/Home.vue') },
      { path: '403', component: () => import('@/views/error/403.vue') },
      {
        path: ':pathMatch(.*)*',
        name: 'DefaultCatchAll',
        component: () => import('@/views/layout/RouteCatchAll.vue'),
      },
    ],
  },
]

const router = createRouter({ history: createWebHistory(), routes: staticRoutes })
const publicPaths = new Set(['/login'])

router.beforeEach(async (to) => {
  const user = useUserStore()
  if (publicPaths.has(to.path)) { routeState.navigating = false; return true }
  if (!user.token) { routeState.loaded = false; routeState.navigating = false; return '/login' }

  if (!routeState.loaded) {
    routeState.navigating = true
    try {
      const menu = useMenuStore()
      await ensureDynamicRoutes(router, async () => {
        const tree = localizeMenuTree(await fetchMenuTree())
        menu.setTree(tree)
        return tree
      })
      return to.fullPath
    } catch {
      user.clearLocal(); routeState.loaded = false; routeState.navigating = false; return '/login'
    }
  }
  return true   // 去权限：登录后一律放行
})

router.afterEach(() => { routeState.navigating = false })
router.onError(() => { routeState.navigating = false })

export default router
```

- [ ] **Step 2: dynamic.ts——route meta 去 permissions（保留导航能力）**

`dynamic.ts` 的 `add()` 中 `meta: { ..., permissions: node.permissions, ... }` 依赖 `MenuNode.permissions`。将该 `meta` 改为不含 permissions：
把 `meta: { title: node.menuName, permissions: node.permissions, menuUrl: node.menuUrl }` 改为
`meta: { title: node.menuName, menuUrl: node.menuUrl }`。

- [ ] **Step 3: menu.ts——MenuNode 去 permissions/resourceCode**

将 `MenuNode` 接口精简为：
```ts
export interface MenuNode {
  id: number;
  parentId: number;
  menuName: string;
  menuUrl: string;
  menuIcon: string;
  children: MenuNode[];
}
```

- [ ] **Step 4: 删除 routePermission.ts（不再被引用）**

Run: `cd "/d/CODE/YamAuth/web/YamAuth.Web/src" && rm -f utils/routePermission.ts && grep -rn "routePermission\|canAccessRoute" . || echo "CLEAN"`
Expected: `CLEAN`。

### Task 8.5：解决前端编译/构建（清理残留引用）

- [ ] **Step 1: 安装依赖**

Run: `cd "/d/CODE/YamAuth/web/YamAuth.Web" && npm install 2>&1 | tail -5`
Expected: 安装完成，无 peer error 阻断。

- [ ] **Step 2: 类型检查 / 构建，收集残留引用错误**

Run: `cd "/d/CODE/YamAuth/web/YamAuth.Web" && npx vite build 2>&1 | tail -40`
Expected: 首次可能报「找不到模块 `@/api/dataScope`、`@/api/orgUnit`、`DataScopeSummary`、`permissions.g`、已删视图」等。逐个处理：
  - 删除对已删 api/组件/视图的 `import`；
  - 引用 `user.permissions`/`user.dataScope`/`hasPermission` 的页面：删除该逻辑或改为恒显示；
  - `constants/permissions.g.ts`/`permissions.manual.ts`/`permissionWildcard.ts` 若仅服务权限，可保留文件（不被引用即无害）或按报错删除其 import 方；
  - 角色分配页 `RoleMenusAssign.vue`/`UserRolesAssign.vue`/`MenuRoleMenus.vue`/`MenuRoleUsers.vue` 若依赖 `api/roleAssignment.ts`/`api/dataScope.ts`：保留其纯 CRUD 部分，删除 DataScope 面板引用（`RoleDataScopePanel`/`UserDataScopePanel`/`UserOrgAssignPanel` 已删）。

- [ ] **Step 3: 反复构建至通过**

Run: `cd "/d/CODE/YamAuth/web/YamAuth.Web" && npx vite build 2>&1 | tail -15`
Expected: `built in ...`，`dist/` 生成，0 error。

- [ ] **Step 4: Commit**

```bash
cd "/d/CODE/YamAuth" && git add -A && git -c user.name="YamAuth" -c user.email="noreply@local" commit -q -m "feat(web): 去权限（精简 user store/路由/auth api），删无表页面，构建通过" && echo committed
```

---

## Phase 9：端到端冒烟（产出：登录→菜单→列表全链路可用）

### Task 9.1：联调运行

- [ ] **Step 1: 启动后端**

Run（后台）: `cd "/d/CODE/YamAuth" && dotnet run --project src/YamAuth.Api/YamAuth.Api.csproj -c Debug`
Expected: 监听 6500，无异常。

- [ ] **Step 2: 启动前端 dev**

Run（后台）: `cd "/d/CODE/YamAuth/web/YamAuth.Web" && npm run dev`
Expected: Vite 监听 6501，`/api` 代理到 6500。

- [ ] **Step 3: 浏览器/接口验证登录**

用管理员登录（浏览器访问 `http://localhost:6501` 或用 curl 走登录+菜单接口）。
Expected：登录成功 → 侧边栏显示全部菜单 → 打开 Countries / Currencies / Customers / SpuInfos / SkcInfos / SkuInfos / SkuStocks 列表均能加载分页数据（空列表也算通过，关键是无 403 / 无 500）。

- [ ] **Step 4: 验证角色页「保留但不生效」**

打开 MenuRoles / UserRolesAssign / RoleMenusAssign 页面：能正常 CRUD（增删改查角色、绑定关系），且这些绑定**不影响**当前用户看到的菜单（仍为全部）。
Expected: 页面可用，无报错。

- [ ] **Step 5: 停止后台进程**（TaskStop 两个后台任务）

### Task 9.2：收尾

- [ ] **Step 1: 更新 README/ONBOARDING 顶部标题与端口说明为 YamAuth（内容 token 已重命名，仅人工确认关键段落）**

Run: `cd "/d/CODE/YamAuth" && grep -rn "ProxySale\|数据权限\|RBAC\|CodeGen 驱动的 CRUD 全链路" README.md ONBOARDING.md AGENTS.md | head`
按需修订：删除已不存在的「数据权限 / RBAC / 组织」特性描述，改为「登录 + 菜单导航 + CRUD（无权限）」。可最小化处理。

- [ ] **Step 2: 最终整解决方案构建 + 前端构建双验证**

Run:
```bash
cd "/d/CODE/YamAuth" && dotnet build YamAuth.sln -c Release 2>&1 | tail -5
cd web/YamAuth.Web && npx vite build 2>&1 | tail -3
```
Expected: 后端 `Build succeeded`（Release）；前端 `built in ...`。

- [ ] **Step 3: 最终提交**

```bash
cd "/d/CODE/YamAuth" && git add -A && git -c user.name="YamAuth" -c user.email="noreply@local" commit -q -m "docs+chore: 收尾文档与最终构建验证（YamAuth 骨架完成）" && echo committed
```

---

## 附录 A：完整删除清单（对照检查）

**实体（Entity）：** AuthEntityI18n, AuthI18nEntityTypes, DataPolicy, MenuInfoI18n, MenuItemI18n, OrgUnit, PasswordResetToken, RefreshToken, Resource, ResourceDimension, RoleDataScope, RoleResource, UserDataScope, UserOrgUnit, SkcImage, SkuImage, ConsignmentOrder, ConsignmentOrderItem；抽象：DataScopeAttribute, DataScopeBindingCatalog, DataScopeSnapshot, ICustomerScoped, PolicyType, ResourceCodeNormalizer, ResourceDataScopeSnapshot, ResourceDimensionCatalog, ResourcePermissionCodes, ResourceType, UserDataScopeEffect。

**仓储（Repository）：** OrgUnit/*, PasswordResetToken/*, RefreshToken/*, SkcImage/*, SkuImage/*, Consignment/*, AuthEntityI18nRepository, MenuInfoI18nRepository, MenuItemI18nRepository, 各 `*.ResourceCode.cs`；抽象：CustomerScopedRepositoryBase, DataScopeExpressionBuilder, DataScopeQueryExtensions, IDataPermissionService, IDataScopeAccessor, ILocaleAccessor, IResourceDimensionProvider, ResourceDataScopeAdapter。

**服务（Service）：** DataPermissionResolver, DataPermissionService, DataScopeAccessor, DataScopeCacheKeys, ResourceDimensionProvider, SmtpEmailService, AuthCacheOptions, Helper/*, PasswordResetService/*, PermissionService/*, PermissionSyncService/*, RbacService/*, RoleAssignmentService/*, SessionInvalidationService/*, SkcImageService, SkuImageService, OrgUnitService, Consignment/*；抽象：DataScopeDimension, DataScopeType, IEmailService, OrgUnitType, PermissionAction, PermissionCatalogEntry, PermissionCodes, PermissionMatcher, Permissions.*.cs, ResourceCatalogEntry。

**API：** DataScopeDimensionsController, OrgUnitsController, RoleAssignmentsController, SkcImagesController, SkuImagesController, Consignment/*；Filters：HasPermissionAttribute, RequiresAnyPermissionAttribute, RequiresPermissionAttribute, ResourcePermissionAttribute；Middlewares：LocaleMiddleware, SessionValidationMiddleware；Services：LocaleAccessor, UserSessionValidator；Hosted：PermissionSyncHostedService。

**DTO：** DataScopeDimensionDto, DataScopeSummaryDto, OrgUnit*Dto, UserOrgUnitAssignDto, PasswordResetDtos, RefreshTokenDto, SkcImage*Dto, SkuImage*Dto, Consignment/*。

**前端：** views: auth/OrgUnits, auth/RoleDataScopeAssign, auth/RoleCustomersAssign, login/ForgotPassword, login/ResetPassword, goods/SkcImages, goods/SkuImages, consignment/*；api: dataScope.ts, orgUnit.ts；components/auth: RoleDataScopePanel, UserDataScopePanel, UserOrgAssignPanel；utils: routePermission.ts。

## 附录 B：保留但改造清单

| 文件 | 改造 |
|---|---|
| Entity MenuInfo/MenuRole | 删 ResourceCode / DataScopeType 属性 |
| Repository Customer/Sku/Skc/Spu/SkuStock/MenuInfo/User | CustomerScopedRepositoryBase → RepositoryBase，去 DataScope |
| Service Sku/Skc/Spu/SkuStock/Customer/User/角色三表 | 去 IDataScopeGuard 及权限调用，保留 CRUD |
| Service 新增 MenuTreeService | 返回全部菜单树 |
| AuthLoginService | 只 Login + ChangePassword，JWT 仅身份 |
| Api RbacController | 调 MenuTreeService |
| Api LoginController | 只 login + change-password |
| Api Program.cs | 去权限/会话/i18n/邮件/HostedService 注册与中间件 |
| CodeGen 模板 | 生成 RepositoryBase / 无 DataScope 服务 / 无权限控制器 |
| 前端 user store / router / auth api / menu store | 去 refreshToken/permissions/dataScope，守卫放行 |

## 附录 C：不做（YAGNI）
- 不搬 `tests/`（Service.Tests / Api.Tests / Playwright）。
- 不做任何权限、数据权限、组织、i18n 功能。
- 不做生产部署调优（deploy/ 保留但不验证）。
