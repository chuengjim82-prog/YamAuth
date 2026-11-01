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

builder.Host.UseSerilog((ctx, lc) => lc.ReadFrom.Configuration(ctx.Configuration));

builder.Services.AddKeyedSingleton<IFreeSql>(DbKeys.Base, (sp, _) =>
    FreeSqlFactory.Create(sp.GetRequiredService<IConfiguration>(), "Base", "YamBase"));
builder.Services.AddKeyedSingleton<IFreeSql>(DbKeys.Bzss, (sp, _) =>
    FreeSqlFactory.Create(sp.GetRequiredService<IConfiguration>(), "Bzss", "YamBzss"));

builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<ICurrentUser, CurrentUserAccessor>();

builder.Services.AddYamAuthRepositories();
builder.Services.AddYamAuthServices();
builder.Services.AddMapster();

builder.Services.AddValidatorsFromAssemblyContaining<LoginDtoValidator>();

builder.Services.AddControllers(opt =>
{
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
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = jwt["Issuer"],
            ValidateAudience = true, ValidAudience = jwt["Audience"],
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true, IssuerSigningKey = key,
            NameClaimType = "nic", RoleClaimType = "role"
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>())
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

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
app.MapHealthChecks("/health");

if (app.Environment.IsDevelopment())
    await DevDataSeeder.SeedAsync(app.Services);

Log.Information("YamAuth.Api starting on {Url}", "http://localhost:6500");
app.Run();

public partial class Program { }
