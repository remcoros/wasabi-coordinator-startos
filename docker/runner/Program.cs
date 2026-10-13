using System.Collections.Concurrent;
using System.Collections.Immutable;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using NBitcoin;
using WalletWasabi.Blockchain.Analysis.Clustering;
using WalletWasabi.Blockchain.Keys;
using WalletWasabi.Blockchain.TransactionOutputs;
using WalletWasabi.Blockchain.Transactions;
using WalletWasabi.Crypto;
using WalletWasabi.Crypto.Randomness;
using WalletWasabi.Models;
using WalletWasabi.Services;
using WalletWasabi.WabiSabi.Client;
using WalletWasabi.WabiSabi.Client.CoinJoin.Client;
using WalletWasabi.WabiSabi.Client.CoinJoin.Manager;
using WalletWasabi.WabiSabi.Client.RoundStateAwaiters;
using WalletWasabi.WabiSabi.Coordinator.Models;
using WalletWasabi.WabiSabi.Coordinator.PostRequests;
using WalletWasabi.WabiSabi.Coordinator.Rounds;
using WalletWasabi.WabiSabi.Models;
using WalletWasabi.WebClients.Wasabi;

var mode = args.Single();
using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(10));
var token = timeout.Token;
var runId = Environment.GetEnvironmentVariable("RUN_ID") ?? Guid.NewGuid().ToString();
if (!Guid.TryParse(runId, out _)) throw new ArgumentException("Invalid run ID");
var started = DateTimeOffset.UtcNow;
var report = new Dictionary<string, object?> { ["runId"] = runId, ["scenario"] = mode, ["started"] = started, ["passed"] = false };
using var handler = new HttpClientHandler { UseProxy = false };
using var http = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(30) };
string Env(string name) => Environment.GetEnvironmentVariable(name) ?? throw new InvalidOperationException("Missing " + name);
var nativeConfig = JsonNode.Parse(File.ReadAllText("/data/Config.json").TrimStart('\ufeff'))!;
var walletUrl = Env("BITCOIN_RPC").TrimEnd('/') + "/wallet/wasabi-regtest-lab";
async Task<JsonNode?> Rpc(string method, bool wallet = false, params object[] parameters)
{
    var cookie = (await File.ReadAllTextAsync(Env("BITCOIN_COOKIE"), token)).Trim();
    using var request = new HttpRequestMessage(HttpMethod.Post, wallet ? walletUrl : Env("BITCOIN_RPC"));
    request.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes(cookie)));
    request.Content = new StringContent(JsonSerializer.Serialize(new { jsonrpc = "2.0", id = runId, method, @params = parameters }), Encoding.UTF8, "application/json");
    using var response = await http.SendAsync(request, token);
    response.EnsureSuccessStatusCode();
    var body = JsonNode.Parse(await response.Content.ReadAsStringAsync(token))!;
    if (body["error"] is not null) throw new IOException("Bitcoin RPC " + method + " failed: " + body["error"]!["code"]);
    return body["result"];
}
async Task Prepare()
{
    var wallets = (await Rpc("listwallets"))!.AsArray();
    if (!wallets.Any(x => x!.GetValue<string>() == "wasabi-regtest-lab"))
    {
        var directories = (await Rpc("listwalletdir"))!["wallets"]!.AsArray();
        if (directories.Any(x => x!["name"]!.GetValue<string>() == "wasabi-regtest-lab"))
            await Rpc("loadwallet", false, "wasabi-regtest-lab");
        else
            await Rpc("createwallet", false, "wasabi-regtest-lab");
    }
    var balance = (await Rpc("getbalance", true))!.GetValue<decimal>();
    if (balance < 20)
    {
        var miningAddress = (await Rpc("getnewaddress", true))!.GetValue<string>();
        await Rpc("generatetoaddress", false, 110, miningAddress);
    }
}
var factory = new CoordinatorHttpClientFactory(new Uri(Env("COORDINATOR_URL")), new WalletWasabi.WebClients.Wasabi.HttpClientFactory());
var api = new WabiSabiHttpApiClient("regtest-runner", factory);
async Task<RoundState> Round()
{
    while (true)
    {
        var rounds = (await api.GetStatusAsync(RoundStateRequest.Empty, token)).RoundStates;
        var round = rounds.FirstOrDefault(x => x.Phase == Phase.InputRegistration && !x.IsBlame && x.InputRegistrationEnd > DateTimeOffset.UtcNow.AddSeconds(20));
        if (round is not null)
        {
            if (round.CoinjoinState.Parameters.Network != Network.RegTest) throw new InvalidOperationException("Coordinator is not on regtest");
            return round;
        }
        await Task.Delay(250, token);
    }
}
async Task<Transaction> Fund(IEnumerable<LabWallet> wallets, int totalInputs)
{
    var recipients = new Dictionary<string, decimal>();
    var list = wallets.ToArray();
    for (var i = 0; i < totalInputs; i++) recipients.Add(list[i % list.Length].NewAddress().ToString(), 0.1m);
    var txid = (await Rpc("sendmany", true, "", recipients))!.GetValue<string>();
    var miningAddress = (await Rpc("getnewaddress", true))!.GetValue<string>();
    await Rpc("generatetoaddress", false, 1, miningAddress);
    return Transaction.Parse((await Rpc("getrawtransaction", false, txid))!.GetValue<string>(), Network.RegTest);
}
try
{
    Directory.CreateDirectory("/startos/reports");
    using var testLock = new FileStream("/startos/test.lock", FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
    var chain = (await Rpc("getblockchaininfo"))!;
    if (chain["chain"]!.GetValue<string>() != "regtest" || nativeConfig["Network"]!.GetValue<string>() != "RegTest")
        throw new InvalidOperationException("Refusing to test or mine outside regtest");
    report["network"] = "regtest";
    if (mode == "prepare")
    {
        await Prepare();
        Console.WriteLine("Disposable regtest coins are ready.");
        return 0;
    }
    if (mode == "status")
    {
        report["blocks"] = chain["blocks"]!.GetValue<long>();
        report["mempoolTransactions"] = (await Rpc("getrawmempool"))!.AsArray().Count;
        var round = await Round();
        report["coordinatorRoundId"] = round.Id.ToString();
        report["maximumInputs"] = round.CoinjoinState.Parameters.MaxInputCountByRound;
        report["minimumInputs"] = round.CoinjoinState.Parameters.MinInputCountByRound;
        report["disruptionBudget"] = nativeConfig["DoSSeverity"]!.GetValue<string>();
        report["trimCoordinatorOutput"] = nativeConfig["TrimCoordinatorOutput"]!.GetValue<bool>();
        if (File.Exists("/startos/latest-coinjoin.json"))
        {
            var last = JsonNode.Parse(await File.ReadAllTextAsync("/startos/latest-coinjoin.json", token))!;
            var transactionId = last["transactionId"]!.GetValue<string>();
            var transaction = (await Rpc("getrawtransaction", false, transactionId, true))!;
            report["lastCoinJoinId"] = transactionId;
            report["lastCoinJoinConfirmations"] = transaction["confirmations"]!.GetValue<int>();
            if (transaction["confirmations"]!.GetValue<int>() < 1) throw new InvalidOperationException("Previously tested CoinJoin is not confirmed");
        }
    }
    else if (mode == "round")
    {
        await Prepare();
        var initialRound = await Round();
        if (initialRound.InputRegistrationEnd > DateTimeOffset.UtcNow.AddMinutes(7))
            throw new InvalidOperationException("Stop the lab and apply Use Quick Round Settings before this test");
        var maxInputs = initialRound.CoinjoinState.Parameters.MaxInputCountByRound;
        if (maxInputs < 2 || maxInputs > 100) throw new InvalidOperationException("This lab supports rounds with 2 to 100 inputs");
        var wallets = Enumerable.Range(0, Math.Min(10, maxInputs)).Select(_ => new LabWallet()).ToArray();
        try
        {
            var funding = await Fund(wallets, maxInputs);
            var height = (await Rpc("getblockcount"))!.GetValue<int>();
            var fundingState = new SmartTransaction(funding, new Height.ChainHeight(checked((uint)height)));
            var round = await Round();
            report["roundId"] = round.Id.ToString();
            report["maximumInputs"] = round.CoinjoinState.Parameters.MaxInputCountByRound;
            report["minimumInputs"] = round.CoinjoinState.Parameters.MinInputCountByRound;
            report["inputRegistrationTimeoutSeconds"] = round.CoinjoinState.Parameters.StandardInputRegistrationTimeout.TotalSeconds;
            report["participants"] = wallets.Length;
            var phases = new ConcurrentQueue<string>();
            using var updater = Workers.Spawn<RoundUpdateMessage>("regtest-rounds-" + runId,
                Workers.EventDriven(new RoundsState(DateTime.UtcNow, TimeSpan.FromMilliseconds(250), new Dictionary<uint256, RoundState>(), ImmutableList<RoundStateAwaiter>.Empty), RoundStateUpdater.Create(api)), token);
            await using var ticker = new Timer(_ => updater.Post(new RoundUpdateMessage.UpdateMessage(DateTime.UtcNow)), null, TimeSpan.Zero, TimeSpan.FromMilliseconds(250));
            var provider = new RoundStateProvider(updater);
            var results = await Task.WhenAll(wallets.Select(async wallet =>
            {
                var coins = funding.Outputs.AsIndexedOutputs().Where(x => wallet.Owns(x.TxOut.ScriptPubKey))
                    .Select(x => new SmartCoin(fundingState, x.N, wallet.PublicKey(x.TxOut.ScriptPubKey))).ToArray();
                var client = new CoinJoinClient(_ => api, wallet, new OutputProvider(wallet, RandomnessProviders.Secure), provider,
                    new CoinJoinCoinSelector(true, int.MaxValue, 0),
                    new CoinJoinConfiguration(nativeConfig["CoordinatorIdentifier"]!.GetValue<string>(), 200m, 2, true),
                    InputVerifiers.NoVerification(), new LiquidityClueProvider(), TimeSpan.Zero);
                client.CoinJoinClientProgress += (_, progress) => phases.Enqueue(progress.GetType().Name);
                return await client.StartRoundAsync(coins.ToImmutableList(), CoinJoinClient.UnrestrictedRound.Instance, round, token);
            }));
            if (results.Any(x => x is not SuccessfulCoinJoinResult)) throw new InvalidOperationException("Not every participant completed the round");
            var successes = results.Cast<SuccessfulCoinJoinResult>().ToArray();
            var txid = successes[0].UnsignedCoinJoin.GetHash().ToString();
            if (successes.Any(x => x.UnsignedCoinJoin.GetHash().ToString() != txid)) throw new InvalidOperationException("Participants disagree about the transaction");
            if (!(await Rpc("getrawmempool"))!.AsArray().Any(x => x!.GetValue<string>() == txid)) throw new InvalidOperationException("CoinJoin is not in the real node mempool");
            var signed = Transaction.Parse((await Rpc("getrawtransaction", false, txid))!.GetValue<string>(), Network.RegTest);
            var inputs = funding.Outputs.AsIndexedOutputs().Where(x => wallets.Any(w => w.Owns(x.TxOut.ScriptPubKey))).Select(x => x.ToCoin()).ToArray();
            if (signed.Inputs.Count != inputs.Length || inputs.Any(x => !signed.Inputs.Any(i => i.PrevOut == x.Outpoint))) throw new InvalidOperationException("CoinJoin inputs do not match funded coins");
            var participantAccounting = new List<object>();
            for (var i = 0; i < successes.Length; i++)
            {
                var result = successes[i];
                if (result.OutputScripts.Count == 0 || result.OutputScripts.Any(script => !wallets[i].Owns(script) || !signed.Outputs.Any(x => x.ScriptPubKey == script)))
                    throw new InvalidOperationException("Participant output is missing or is not owned by that participant");
                var inputSatoshis = result.Coins.Sum(x => x.Amount.Satoshi);
                var outputSatoshis = signed.Outputs.Where(x => result.OutputScripts.Contains(x.ScriptPubKey)).Sum(x => x.Value.Satoshi);
                if (outputSatoshis <= 0 || outputSatoshis > inputSatoshis) throw new InvalidOperationException("Invalid participant value accounting");
                participantAccounting.Add(new { participant = i, inputSatoshis, outputSatoshis, contributedFeeSatoshis = inputSatoshis - outputSatoshis });
            }
            var fee = inputs.Sum(x => x.Amount.Satoshi) - signed.Outputs.Sum(x => x.Value.Satoshi);
            if (fee <= 0) throw new InvalidOperationException("Invalid mining fee");
            var miningAddress = (await Rpc("getnewaddress", true))!.GetValue<string>();
            await Rpc("generatetoaddress", false, 1, miningAddress);
            var confirmed = (await Rpc("getrawtransaction", false, txid, true))!;
            if (confirmed["confirmations"]!.GetValue<int>() < 1) throw new InvalidOperationException("CoinJoin was not mined");
            foreach (var coin in inputs)
                if (await Rpc("gettxout", false, coin.Outpoint.Hash.ToString(), coin.Outpoint.N, true) is not null) throw new InvalidOperationException("CoinJoin input remains unspent");
            report["transactionId"] = txid;
            report["inputs"] = signed.Inputs.Count;
            report["outputs"] = signed.Outputs.Count;
            report["feeSatoshis"] = fee;
            report["confirmations"] = confirmed["confirmations"]!.GetValue<int>();
            report["clientPhases"] = phases.Distinct().ToArray();
            report["participantAccounting"] = participantAccounting;
            await File.WriteAllTextAsync("/startos/latest-coinjoin.json.tmp", JsonSerializer.Serialize(new { transactionId = txid }), token);
            File.Move("/startos/latest-coinjoin.json.tmp", "/startos/latest-coinjoin.json", true);
        }
        finally { foreach (var wallet in wallets) wallet.Dispose(); }
    }
    else throw new ArgumentException("Unknown scenario");
    report["passed"] = true;
    return 0;
}
catch (Exception exception)
{
    report["errorType"] = exception.GetType().Name;
    report["error"] = exception.Message;
    return 1;
}
finally
{
    if (mode != "prepare")
    {
        report["finished"] = DateTimeOffset.UtcNow;
        Directory.CreateDirectory("/startos/reports");
        var json = JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync("/startos/reports/" + runId + ".json", json);
        Console.WriteLine(json);
    }
}

sealed class LabWallet : IKeyChain, IDestinationProvider, IDisposable
{
    private readonly ExtKey root = new();
    private readonly Key identification = new();
    private readonly Dictionary<Script, (ExtKey Key, KeyPath Path)> keys = new();
    private uint index;
    public BitcoinAddress NewAddress()
    {
        var path = KeyPath.Parse("84'/1'/0'/0/" + index++);
        var key = root.Derive(path);
        var script = key.PrivateKey.PubKey.GetScriptPubKey(ScriptPubKeyType.Segwit);
        keys.Add(script, (key, path));
        return script.GetDestinationAddress(Network.RegTest)!;
    }
    public bool Owns(Script script) => keys.ContainsKey(script);
    public HdPubKey PublicKey(Script script)
    {
        var key = keys[script];
        var result = new HdPubKey(key.Key.PrivateKey.PubKey, key.Path, LabelsArray.Empty, KeyState.Clean);
        result.SetAnonymitySet(1);
        return result;
    }
    public OwnershipProof GetOwnershipProof(IDestination destination, CoinJoinInputCommitmentData committedData) =>
        OwnershipProof.GenerateCoinJoinInputProof(keys[destination.ScriptPubKey].Key.PrivateKey, new OwnershipIdentifier(identification, destination.ScriptPubKey), committedData, ScriptPubKeyType.Segwit);
    public Transaction Sign(Transaction transaction, Coin coin, PrecomputedTransactionData precomputeTransactionData)
    {
        transaction.Sign(keys[coin.ScriptPubKey].Key.PrivateKey.GetBitcoinSecret(Network.RegTest), coin);
        return transaction;
    }
    public IEnumerable<ScriptType> SupportedScriptTypes => [ScriptType.P2WPKH];
    public IEnumerable<IDestination> GetNextDestinations(int count, bool preferTaproot) => Enumerable.Range(0, count).Select(_ => NewAddress());
    public void TrySetScriptStates(KeyState state, IEnumerable<Script> scripts) { }
    public void Dispose()
    {
        foreach (var key in keys.Values) key.Key.PrivateKey.Dispose();
        root.PrivateKey.Dispose();
        identification.Dispose();
    }
}
