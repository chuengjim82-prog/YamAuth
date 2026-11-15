namespace YamAuth.Authorization;

/// <summary>授权边界的预期失败；状态码与业务错误码分别传递，避免将拒绝伪装成成功。</summary>
public sealed class AccessException(string message, int status = 403, string? reason = null) : Exception(message)
{
    public int Status { get; } = status;
    public string? Reason { get; } = reason;
}
