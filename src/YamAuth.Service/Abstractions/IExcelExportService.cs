namespace YamAuth.Service.Abstractions;

/// <summary>Excel 列定义</summary>
public class ExcelColumn<T>
{
    /// <summary>列头文字</summary>
    public string Header { get; set; } = "";

    /// <summary>从数据行获取单元格值</summary>
    public Func<T, object?> ValueGetter { get; set; } = _ => null;

    /// <summary>可选列宽（字符数），不设置则自动适应</summary>
    public double? Width { get; set; }
}

/// <summary>通用 Excel 导出服务</summary>
public interface IExcelExportService
{
    /// <summary>生成 .xlsx 文件的字节数组</summary>
    byte[] GenerateXlsx<T>(string sheetName, IList<ExcelColumn<T>> columns, IList<T> data);
}
