namespace YamAuth.Service.Abstractions;

/// <summary>Excel 导入结果</summary>
public class ExcelImportResult
{
    public int SuccessCount { get; set; }
    public int FailCount { get; set; }
    public List<string> Errors { get; set; } = new();
}

/// <summary>通用 Excel 导入服务</summary>
public interface IExcelImportService : IService
{
    /// <summary>
    /// 解析 Excel 流并返回组装好的实体列表
    /// </summary>
    /// <typeparam name="T">目标实体类型</typeparam>
    /// <param name="rowHandler">参数：(行号, 取值函数) -> 返回 (组装好的实体, 错误信息)。两者二选一</param>
    Task<(List<T> Data, ExcelImportResult Result)> ImportAsync<T>(
        Stream stream,
        Func<int, Func<int, string>, Task<(T? Entity, string? Error)>> rowHandler,
        int headerRow = 1) where T : class;
}
