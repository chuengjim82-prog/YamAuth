using YamAuth.Api.Authorization;
using YamAuth.Authorization;
using YamAuth.Repository.Authorization;
using YamAuth.Service.Authorization;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using YamAuth.Api.Filters;
using YamAuth.Api.Infrastructure;
using YamAuth.Api.Middlewares;
using YamAuth.Api.Services;
using YamAuth.Api.Validators;
using YamAuth.Repository.Abstractions;
using YamAuth.Service.Abstractions;
using YamAuth.Service.Auth;
using Mapster;
using Serilog;

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

var builder = WebApplication.CreateBuilder(args);

// 第一版按一个物理数据库设计，共享写事务前必须确认两套逻辑连接指向同一目标。
var baseConnection = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(builder.Configuration["Db:Base"]);
var businessConnection = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(builder.Configuration["Db:Bzss"]);
if (!string.Equals(baseConnection.DataSource, businessConnection.DataSource, StringComparison.OrdinalIgnoreCase)
    || !string.Equals(baseConnection.InitialCatalog, businessConnection.InitialCatalog, StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("当前权限版本要求 Base 和 Bzss 指向同一个物理数据库");


builder.Host.UseSerilog((ctx, lc) => lc.ReadFrom.Configuration(ctx.Configuration));

builder.Services.AddKeyedSingleton<IFreeSql>(DbKeys.Base, (sp, _) =>
    FreeSqlFactory.Create(sp.GetRequiredService<IConfiguration>(), "Base", "YamBase"));
builder.Services.AddKeyedSingleton<IFreeSql>(DbKeys.Bzss, (sp, _) =>
    FreeSqlFactory.Create(sp.GetRequiredService<IConfiguration>(), "Bzss", "YamBzss"));

builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<AccessContext>();
builder.Services.AddScoped<SecurityStore>();
builder.Services.AddScoped<DataAccessGuard>();
builder.Services.AddScoped<AccessService>();
builder.Services.AddScoped<AccountService>();
builder.Services.AddScoped<PermissionManagementService>();
builder.Services.AddScoped<OwnershipService>();
builder.Services.AddScoped<CandidateService>();
builder.Services.AddSingleton<IAuthorizationPolicyProvider, AccessPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, AccessPolicyHandler>();
builder.Services.AddHostedService<AuditWorker>();
builder.Services.AddScoped<ICurrentUser, CurrentUserAccessor>();

builder.Services.AddYamAuthRepositories();
builder.Services.AddYamAuthServices();
builder.Services.AddMapster();

builder.Services.AddValidatorsFromAssemblyContaining<LoginDtoValidator>();

builder.Services.AddControllers(opt =>
{
    opt.Filters.Add<AccessRequestFilter>();
    opt.Filters.Add<FluentValidationActionFilter>();
    opt.Filters.Add<ApiResultFilter>();
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 10;
        opt.QueueLimit = 0;
    });
});

var jwt = builder.Configuration.GetSection("Jwt");
var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["SecretKey"]!));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                if (!long.TryParse(context.Principal?.FindFirst("sub")?.Value, out var userId)
                    || !Guid.TryParse(context.Principal?.FindFirst("sid")?.Value, out var sessionId)
                    || !long.TryParse(context.Principal?.FindFirst("sv")?.Value, out var version))
                { context.Fail("旧会话已失效，请重新登录"); return; }
                var access = context.HttpContext.RequestServices.GetRequiredService<AccessContext>();
                access.TraceId = context.HttpContext.TraceIdentifier;
                try
                {
                    access.Snapshot = await context.HttpContext.RequestServices.GetRequiredService<AccessService>()
                        .LoadAsync(userId, sessionId, version, null);
                }
                catch (AccessException exception) when (exception.Status == 401) { context.Fail(exception.Message); }
            }
        };
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = jwt["Issuer"],
            ValidateAudience = true, ValidAudience = jwt["Audience"],
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true, IssuerSigningKey = key,
            NameClaimType = "nic", RoleClaimType = "role"
        };
    });
builder.Services.AddAuthorization(options =>
{
    var deny = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().RequireAssertion(_ => false).Build();
    options.DefaultPolicy = deny;
    options.FallbackPolicy = deny;
});

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>())
    .WithExposedHeaders("X-YamAuth-Authorization-Version", "X-YamAuth-Catalog-Version").AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "YamAuth API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { new OpenApiSecurityScheme { Reference = new OpenApiReference { Id = "Bearer", Type = ReferenceType.SecurityScheme } }, Array.Empty<string>() }
    });
});

builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration["Db:Base"]!, name: "YamBase")
    .AddSqlServer(builder.Configuration["Db:Bzss"]!, name: "YamBzss");

var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseCors();

if (builder.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health").AllowAnonymous();
EndpointSecurityCheck.Validate(app.Services);

// 初始化和迁移由显式工具完成，启动服务不创建默认管理员或修改既有数据。

Log.Information("YamAuth.Api starting on {Url}", "http://localhost:6500");
app.Run();

public partial class Program { }
