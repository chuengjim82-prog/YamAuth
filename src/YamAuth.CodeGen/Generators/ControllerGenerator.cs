using System.Text;
using YamAuth.CodeGen.Schema;

namespace YamAuth.CodeGen.Generators;

public class ControllerGenerator
{
    public string ApiProjectPath { get; init; } = "";

    public void Generate(TableInfo t)
    {
        var dir = Path.Combine(ApiProjectPath, "Controllers", "V1", t.Module);
        Directory.CreateDirectory(dir);
        var entityPlural = Naming.ToPascalPlural(t.EntityName);
        var file = Path.Combine(dir, $"{entityPlural}Controller.cs");

        var moduleLower = t.Module.ToLowerInvariant();
        var resource = Naming.ToKebabPlural(t.EntityName);

        var sb = new StringBuilder();
        sb.AppendLine("using Microsoft.AspNetCore.Authorization;");
        sb.AppendLine("using Microsoft.AspNetCore.Mvc;");
        sb.AppendLine("using YamAuth.Api.Filters;");
        sb.AppendLine("using YamAuth.Service.Abstractions;");
        sb.AppendLine("using YamAuth.Dtos;");
        sb.AppendLine($"using YamAuth.Dtos.{t.Module};");
        sb.AppendLine($"using YamAuth.Service.{t.DatabaseName}.{t.Module};");
        sb.AppendLine();
        sb.AppendLine($"namespace YamAuth.Api.Controllers.V1.{t.Module};");
        sb.AppendLine();
        sb.AppendLine("[ApiController]");
        sb.AppendLine($"[Route(\"api/v1/{moduleLower}/{resource}\")]");
        sb.AppendLine("[Authorize]");
        sb.AppendLine($"public partial class {entityPlural}Controller : ControllerBase");
        sb.AppendLine("{");
        sb.AppendLine($"    private readonly I{t.EntityName}Service _svc;");
        sb.AppendLine($"    public {entityPlural}Controller(I{t.EntityName}Service svc) => _svc = svc;");
        sb.AppendLine();
        sb.AppendLine($"    [HttpGet]");
        sb.AppendLine($"    public Task<PagedResult<{t.EntityName}Dto>> Page([FromQuery] {t.EntityName}QueryDto q) => _svc.PageAsync(q);");
        sb.AppendLine();
        sb.AppendLine($"    [HttpGet(\"{{id:long}}\")]");
        sb.AppendLine($"    public Task<{t.EntityName}Dto?> Get(long id) => _svc.GetAsync(id);");
        sb.AppendLine();
        sb.AppendLine($"    [HttpPost]");
        sb.AppendLine($"    public Task<long> Create([FromBody] {t.EntityName}CreateDto dto) => _svc.CreateAsync(dto);");
        sb.AppendLine();
        sb.AppendLine($"    [HttpPut(\"{{id:long}}\")]");
        sb.AppendLine($"    public Task Update(long id, [FromBody] {t.EntityName}UpdateDto dto) => _svc.UpdateAsync(id, dto);");
        sb.AppendLine();
        sb.AppendLine($"    [HttpDelete(\"{{id:long}}\")]");
        sb.AppendLine($"    public Task Delete(long id) => _svc.DeleteAsync(id);");
        sb.AppendLine("}");

        File.WriteAllText(file, sb.ToString());
    }
}
