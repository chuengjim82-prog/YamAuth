namespace YamAuth.Service.Abstractions;

public class ApiResult
{
    public int Code { get; set; }
    public string Message { get; set; } = "";
    public object? Data { get; set; }
    public string TraceId { get; set; } = "";

    public static ApiResult Ok(object? data = null) => new() { Code = 0, Message = "OK", Data = data };
    public static ApiResult Fail(int code, string message) => new() { Code = code, Message = message };
}
