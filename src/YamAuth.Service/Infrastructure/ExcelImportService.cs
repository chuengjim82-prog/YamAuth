using OfficeOpenXml;
using YamAuth.Service.Abstractions;

namespace YamAuth.Service.Infrastructure;

public class ExcelImportService : IService, IExcelImportService
{
    public async Task<(List<T> Data, ExcelImportResult Result)> ImportAsync<T>(
        Stream stream,
        Func<int, Func<int, string?>, Task<(T? Entity, string? Error)>> rowHandler,
        int headerRow = 1) where T : class
    {
        var data = new List<T>();
        var result = new ExcelImportResult();

        ExcelPackage.License.SetNonCommercialPersonal("YamAuth");
        using var package = new ExcelPackage();
        await package.LoadAsync(stream);

        var sheet = package.Workbook.Worksheets[0];
        if (sheet == null)
        {
            result.FailCount = 1;
            result.Errors.Add("工作簿中未找到工作表");
            return (data, result);
        }

        var rowCount = sheet.Dimension?.Rows ?? 0;
        var dataStart = headerRow + 1;
        if (rowCount < dataStart)
        {
            result.FailCount = 1;
            result.Errors.Add("Excel 中没有数据行");
            return (data, result);
        }

        for (int r = dataStart; r <= rowCount; r++)
        {
            try
            {
                string? Cell(int c) => sheet.Cells[r, c].Text?.Trim();
                var (entity, error) = await rowHandler(r, Cell);

                if (error != null)
                {
                    result.Errors.Add(error);
                    result.FailCount++;
                }
                else if (entity != null)
                {
                    data.Add(entity);
                    result.SuccessCount++;
                }
            }
            catch (Exception ex)
            {
                result.Errors.Add($"第 {r} 行：{ex.Message}");
                result.FailCount++;
            }
        }

        return (data, result);
    }
}
