using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using NNostr.Client.Protocols;
using NNostr.Client;
using WalletWasabi.Discoverability;

// Package-owned readiness probes and Tor-aware discovery. The signed coordinator is unchanged.
using var stop = new CancellationTokenSource();
using var terminate = PosixSignalRegistration.Create(PosixSignal.SIGTERM, context => { context.Cancel = true; stop.Cancel(); });
Console.CancelKeyPress += (_, context) => { context.Cancel = true; stop.Cancel(); };
string Env(string name) => Environment.GetEnvironmentVariable(name) ?? throw new InvalidOperationException($"Missing {name}");
JsonObject Config() => JsonNode.Parse(File.ReadAllText("/data/Config.json").TrimStart('\ufeff'))!.AsObject();
IPEndPoint Tor() { var uri = new Uri(Env("TOR_PROXY")); return new(IPAddress.Parse(uri.Host), uri.Port); }
bool UseTor() => string.Equals(Env("USE_TOR"), "true", StringComparison.OrdinalIgnoreCase);

async Task CheckTor(CancellationToken token)
{
    using var client = new TcpClient();
    await client.ConnectAsync(Tor(), token);
    var stream = client.GetStream();
    await stream.WriteAsync(new byte[] { 5, 1, 0 }, token);
    byte[] reply = new byte[2];
    await stream.ReadExactlyAsync(reply, token);
    if (reply[0] != 5 || reply[1] != 0) throw new IOException("SOCKS handshake failed");
}

async Task<JsonObject> Rpc(string method, CancellationToken token)
{
    using var handler = new HttpClientHandler { UseProxy = false };
    using var http = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(10) };
    var cookie = (await File.ReadAllTextAsync(Env("BITCOIN_COOKIE"), token)).Trim();
    http.DefaultRequestHeaders.Authorization = new("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes(cookie)));
    using var response = await http.PostAsync(Env("BITCOIN_RPC"), new StringContent(new JsonObject { ["jsonrpc"] = "2.0", ["id"] = "startos", ["method"] = method, ["params"] = new JsonArray() }.ToJsonString(), Encoding.UTF8, "application/json"), token);
    response.EnsureSuccessStatusCode();
    var body = JsonNode.Parse(await response.Content.ReadAsStringAsync(token))!.AsObject();
    if (body["error"] is not null) throw new IOException("Bitcoin RPC error");
    return body["result"]!.AsObject();
}

async Task CheckBitcoin(CancellationToken token)
{
    var chain = await Rpc("getblockchaininfo", token);
    if (chain["chain"]!.GetValue<string>() != Env("BITCOIN_CHAIN")) throw new IOException("Wrong Bitcoin network");
    var blocks = chain["blocks"]!.GetValue<long>();
    // Headers briefly lead blocks whenever a new block arrives, so tolerate a small gap.
    if (chain["initialblockdownload"]!.GetValue<bool>() || blocks < 1 || chain["headers"]!.GetValue<long>() - blocks > 2) throw new IOException("Bitcoin is synchronizing");
}

async Task CheckCoordinator(CancellationToken token)
{
    using var handler = new HttpClientHandler { UseProxy = false };
    using var http = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(10) };
    var result = JsonNode.Parse(await http.GetStringAsync("http://127.0.0.1:37126/wabisabi/human-monitor", token));
    if (result?["RoundStates"] is not JsonArray rounds || !rounds.Any(round => round?["Phase"]?.GetValue<string>() is
        "InputRegistration" or "ConnectionConfirmation" or "OutputRegistration" or "TransactionSigning"))
        throw new IOException("No active round available");
}

async Task<bool> PublishToRelay(Uri relay, NostrEvent signed, CancellationToken token)
{
    try
    {
        using var client = NostrClientFactory.Create([relay], UseTor() ? new WebProxy(Env("TOR_PROXY")) : null);
        var accepted = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        void OnOk(object? sender, (string eventId, bool success, string messafe) acknowledgement)
        {
            if (acknowledgement.eventId == signed.Id)
                accepted.TrySetResult(acknowledgement.success);
        }
        client.OkReceived += OnOk;
        try
        {
            await client.ConnectAndWaitUntilConnected(token);
            await client.PublishEvent(signed, token);
            return await accepted.Task.WaitAsync(token);
        }
        finally
        {
            client.OkReceived -= OnOk;
            await client.Disconnect();
        }
    }
    catch (Exception)
    {
        return false;
    }
}

async Task PublishAccepted(Uri[] relays, NostrEvent signed, CancellationToken token)
{
    using var attempts = CancellationTokenSource.CreateLinkedTokenSource(token);
    var publications = relays.Select(relay => PublishToRelay(relay, signed, attempts.Token)).ToArray();
    var pending = publications.ToList();
    try
    {
        while (pending.Count > 0)
        {
            var finished = await Task.WhenAny(pending).WaitAsync(token);
            pending.Remove(finished);
            if (await finished)
            {
                token.ThrowIfCancellationRequested();
                return;
            }
        }
        token.ThrowIfCancellationRequested();
        throw new IOException("No Nostr relay accepted the announcement");
    }
    finally
    {
        attempts.Cancel();
        await Task.WhenAll(publications);
    }
}

JsonObject AnnouncementMetadata(JsonNode ann, string endpoint) => new()
{
    ["network"] = Env("DISCOVERY_NETWORK"),
    ["endpoint"] = endpoint,
    ["name"] = ann["CoordinatorName"]!.GetValue<string>(),
    ["description"] = ann["CoordinatorDescription"]!.GetValue<string>(),
    ["minimumInputs"] = ann["AbsoluteMinInputCount"]!.GetValue<uint>(),
    ["readMore"] = EffectiveReadMore(ann["ReadMoreUri"]!.GetValue<string>(), endpoint),
    ["relays"] = ann["RelayUris"]!.DeepClone(),
    ["keyFingerprint"] = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(ann["Key"]!.GetValue<string>()))).ToLowerInvariant()
};

try
{
    var mode = args.Single();
    if (mode.StartsWith("check-", StringComparison.Ordinal))
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stop.Token);
        timeout.CancelAfter(TimeSpan.FromSeconds(15));
        if (mode == "check-bitcoin") await CheckBitcoin(timeout.Token);
        else if (mode == "check-tor") await CheckTor(timeout.Token);
        else if (mode == "check-coordinator") await CheckCoordinator(timeout.Token);
        else throw new ArgumentException("Unknown check");
        return 0;
    }
    if (mode == "announce")
    {
        while (!stop.IsCancellationRequested)
        {
            try
            {
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stop.Token);
                timeout.CancelAfter(TimeSpan.FromSeconds(45));
                if (UseTor()) await CheckTor(timeout.Token);
                await CheckCoordinator(timeout.Token);
                var ann = JsonNode.Parse(Env("ANNOUNCEMENT_CONFIG"))!.AsObject();
                ann["Key"] = Config()["AnnouncerConfig"]!["Key"]!.GetValue<string>();
                var relays = ann["RelayUris"]!.AsArray().Select(x => new Uri(x!.GetValue<string>())).ToArray();
                var network = Env("DISCOVERY_NETWORK");
                var ev = new NostrEvent { Kind = 15750, Content = ann["CoordinatorDescription"]!.GetValue<string>(), Tags = [
                    Tag("name", ann["CoordinatorName"]!.GetValue<string>()), Tag("type", "wabisabi"), Tag("network", network),
                    Tag("endpoint", Env("ANNOUNCEMENT_URL")), Tag("absolutemininputcount", ann["AbsoluteMinInputCount"]!.GetValue<uint>().ToString(CultureInfo.InvariantCulture)),
                    Tag("readmore", EffectiveReadMore(ann["ReadMoreUri"]!.GetValue<string>(), Env("ANNOUNCEMENT_URL")))] };
                using var key = ann["Key"]!.GetValue<string>().FromNIP19Nsec();
                var signed = await ev.ComputeIdAndSignAsync(key);
                await PublishAccepted(relays, signed, timeout.Token);
                stop.Token.ThrowIfCancellationRequested();
                File.WriteAllText("/startos/announcement-status.json", new JsonObject
                {
                    ["lastSuccess"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                    ["eventId"] = signed.Id,
                    ["metadata"] = AnnouncementMetadata(ann, Env("ANNOUNCEMENT_URL"))
                }.ToJsonString());
                Console.WriteLine("Discovery announcement published.");
            }
            catch (Exception) when (!stop.IsCancellationRequested) { Console.Error.WriteLine("Discovery announcement unavailable; retrying."); }
            await Task.Delay(TimeSpan.FromMinutes(15), stop.Token);
        }
        return 0;
    }
    throw new ArgumentException("Unknown mode");
}
catch (OperationCanceledException) when (stop.IsCancellationRequested) { return 0; }
catch (Exception exception) { Console.Error.WriteLine(exception.GetType().Name); return 1; }

static NostrEventTag Tag(string id, string value) => new() { TagIdentifier = id, Data = [value] };
// Keep the explicit blank set identical to effectiveReadMore in startos/utils.ts.
static string EffectiveReadMore(string value, string endpoint) =>
    Regex.IsMatch(value, @"^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*$") ? endpoint : value;
