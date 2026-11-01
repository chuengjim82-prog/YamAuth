using System.Text.Json;

namespace YamAuth.DbInit;

public sealed class InitManifest
{
    public string[] BaseScripts { get; init; } = [];
    public string[] SecondaryScripts { get; init; } = [];

    public static InitManifest Load(string manifestPath)
    {
        if (!File.Exists(manifestPath))
            throw new FileNotFoundException($"Init manifest not found: {manifestPath}");

        var json = File.ReadAllText(manifestPath);
        var manifest = JsonSerializer.Deserialize<InitManifest>(json, JsonOptions)
            ?? throw new InvalidOperationException($"Invalid manifest: {manifestPath}");
        return manifest;
    }

    static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };
}
