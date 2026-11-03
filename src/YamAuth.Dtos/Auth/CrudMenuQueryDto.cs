using YamAuth.Dtos;

namespace YamAuth.Dtos.Auth;

public class CrudMenuQueryDto : PagedQuery
{
    /// <summary>是否返回全部匹配记录；缺省或 false 时保留原分页、Keyword 过滤和排序，Size 上限为 200。</summary>
    /// <remarks>
    /// true 时忽略 Page/Size，仍应用 Keyword 并排除已删除记录，按 SortIndex、Id 升序返回。
    /// 保留现有响应包装及 data.total/items；items 为平面数组，取全时 total 等于返回记录数。
    /// 菜单管理查询包含隐藏菜单，沿用原接口的授权与可见范围。
    /// </remarks>
    public bool All { get; set; }
}
