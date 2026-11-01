namespace YamAuth.Service.Abstractions;

/// <summary>业务错误码：4011 表示权限/会话已失效，客户端应直接跳转登录，不可 refresh。</summary>
public static class ApiCodes
{
    public const int SessionInvalidated = 4011;
}
