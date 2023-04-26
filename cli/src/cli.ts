import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
//import { PerpetualsClient, PositionSide } from "./client";
import { Command } from "commander";
import { WbtcClient } from "./client";
import { homedir } from "os";
import { createAssociatedTokenAccount } from "@solana/spl-token";

let client;

function initClient(clusterUrl: string, adminKeyPath: string) {
  console.log("Path='", adminKeyPath, "'");
  process.env["ANCHOR_WALLET"] = adminKeyPath;
  client = new WbtcClient(clusterUrl, adminKeyPath);
  console.log("Client Initialized");
}

async function initialize(config) {
  await client.initialize({
    decimals: config.decimals,
    authority: new PublicKey(config.authority),
    merchantAuthority: new PublicKey(config.merchantAuthority),
    custodian: new PublicKey(config.custodian),
    custodianBtcAddress: config.custodianBtcAddress,
    name: config.name,
    symbol: config.symbol,
    uri: config.uri,
  });
}

async function createMintRequest(
  amount: BN,
  clientWallet: PublicKey,
  transaction: string
) {
  console.log(clientWallet);
  let ta = await client.createTokenAccount(clientWallet);

  let res = await client.createMintRequest(ta, amount, transaction);

  console.log("Created mint request, tx = ", res);
  return;
}

async function createRedeemRequest(tokenSource: PublicKey, amount: BN) {
  //var cfgKey = await client.getConfigKey();
  var cfg = await client.getConfig();

  return await client.createRedeemRequest(tokenSource, amount);
}

async function createMerchant(
  merchant: PublicKey,
  merchantBtcAddress: string,
  multisig?: PublicKey,
  approve?: boolean
) {
  console.log("msig: ", multisig);
  if (multisig === undefined) {
    var tx = await client.createMerchant(merchant, merchantBtcAddress);
    console.log("Created merchant, transaction hash: ", tx);
  } else {
    if (approve === undefined) approve = true;
    console.log("Creating merchant using squads multisig transactions...");
    var acc = await client.createMerchantWithSquads(
      merchant,
      merchantBtcAddress,
      multisig,
      approve
    );

    console.log("Created squads transaction, pk:", acc);
  }
}

async function viewMerchant(merchant: PublicKey) {
  var merchantInfo = await client.getMerchant(merchant);

  console.log("Merchant - ", merchant);
  console.log(" authority: ", merchantInfo.authority);
  console.log(" btc_address: ", merchantInfo.btcAddress);
  console.log(" enabled: ", merchantInfo.enabled);
}

async function viewMerchantFromWallet(wallet: PublicKey) {
  var merchant = client.getMerchantKey(wallet);
  return await viewMerchant(merchant);
}

async function deleteMerchant(
  merchant: PublicKey,
  multisig?: PublicKey,
  approve?: boolean
) {
  console.log("msig: ", multisig);
  if (multisig === undefined) {
    var tx = await client.deleteMerchant(merchant);
    console.log("Created merchant, transaction hash: ", tx);
  } else {
    if (approve === undefined) approve = true;
    console.log("Creating merchant using squads multisig transactions...");
    var acc = await client.deleteMerchantWithSquads(
      merchant,
      multisig,
      approve
    );

    console.log("Created squads transaction, pk:", acc);
  }
  var tx = await client.deleteMerchant(merchant);
  console.log("Deleted merchant, transaction hash: ", tx);
}

async function viewConfig() {
  var cfgKey = await client.getConfigKey();
  var cfg = await client.getConfig();

  console.log("Config - ", cfgKey);
  console.log(" authority: ", cfg.authority);
  console.log(" merchant_authority: ", cfg.merchantAuthority);
  console.log(" custodian: ", cfg.custodian);
  console.log(" custodianBtcAddress: ", cfg.custodianBtcAddress);
  console.log(" mint: ", cfg.mint);
  console.log(" mintReqCounter: ", cfg.mintReqCounter);
  console.log(" redeemReqCounter: ", cfg.redeemReqCounter);
  console.log(" mintEnabled: ", cfg.mintEnabled);
  console.log(" redeemEnabled: ", cfg.redeemEnabled);
  console.log(" custodianEnabled: ", cfg.custodianEnabled);
}

async function viewMintRequest(req: PublicKey) {
  var request = await client.getMintRequest(req);

  console.log("Mint Request - ", req);
  console.log(" req_id", request.reqId);
  console.log(" merchant", request.merchant);
  console.log(" client_token_account", request.clientTokenAccount);
  console.log(" timestamp", request.timestamp);
  console.log(" amount", request.amount);
  console.log(" transactionId", request.transactionId);
}

async function viewMintRequestFromId(reqId: BN) {
  var req = client.getMintRequestKey(reqId);
  return await viewMintRequest(req);
}

async function viewRedeemRequest(req: PublicKey) {
  var request = await client.getRedeemRequest(req);

  console.log("Redeem Request - ", req);
  console.log(" req_id", request.reqId);
  console.log(" merchant", request.merchant);
  console.log(" timestamp", request.timestamp);
  console.log(" amount", request.amount);
}

async function viewRedeemRequestFromId(reqId: BN) {
  var req = client.getRedeemRequestKey(reqId);
  return await viewRedeemRequest(req);
}

async function toggleMerchantEnabled(
  merchant: PublicKey,
  multisig?: PublicKey
) {
  return await client.toggleMerchantEnabledWithSquads(merchant, multisig, true);
}

async function toggleFunctionality(
  custodian,
  mint,
  redeem,
  multisig?: PublicKey
) {
  return await client.toggleFunctionalityEnabledWithSquads(
    custodian,
    mint,
    redeem,
    multisig,
    true
  );
}

async function setCustodian(newCustodian: PublicKey) {
  return await client.setCustodian(newCustodian);
}

async function setCustodianWithMultisig(
  newCustodian: PublicKey,
  multisig: PublicKey
) {
  return await client.setCustodianWithSquads(newCustodian, multisig, true);
}

async function setAuthority(newAuthority: PublicKey, multisig: PublicKey) {
  return await client.setAuthorityWithSquads(newAuthority, multisig, true);
}

async function setMerchantAuthority(
  newAuthority: PublicKey,
  multisig: PublicKey
) {
  return await client.setMerchantAuthorityWithSquads(
    newAuthority,
    multisig,
    true
  );
}

async function approveMintRequest(id: BN) {
  return await client.approveMintRequestId(id);
}

async function rejectMintRequest(id: BN) {
  return await client.rejectMintRequestId(id);
}

async function cancelMintRequest(id: BN) {
  return await client.cancelMintRequestId(id);
}

async function approveRedeemRequest(id: BN, tx: string) {
  return await client.approveRedeemRequestId(id, tx);
}

(async function main() {
  const program = new Command();
  program
    .name("cli.ts")
    .description("CLI to Solana Perpetuals Exchange Program")
    .version("0.1.0")
    .option(
      "-u, --url <string>",
      "URL for Solana's JSON RPC",
      "https://api.devnet.solana.com"
    )
    .option(
      "-k, --keypair <path>",
      "Filepath to the admin keypair (default: ~/.config/solana/id.json)",
      homedir() + "/.config/solana/id.json"
    )
    .hook("preSubcommand", (thisCommand, subCommand) => {
      console.log(program.opts());
      initClient(program.opts().url, program.opts().keypair);
      console.log(`Processing command '${thisCommand.args[0]}'`);
    })
    .hook("postAction", () => {
      console.log("Done");
    });

  program
    .command("init")
    .description("Initialize the on-chain program")
    .requiredOption("-a, --authority <pubkey>", "authority address")
    .requiredOption(
      "-b, --custodian-btc-address <string>",
      "custodian btc address"
    )
    .requiredOption("-c, --custodian <pubkey>", "custodian address")
    .requiredOption("-d, --decimals <int>", "decimals for the token mint")
    .requiredOption(
      "-m, --merchant-authority <pubkey>",
      "merchant authority address"
    )
    .requiredOption("-n, --name <string>", "Token name")
    .requiredOption("-s, --symbol <string>", "Token symbol")
    .requiredOption("-t, --uri <string>", "Token metadata uri")
    .action(async (options) => {
      console.log(options);
      await initialize(options);
    });

  program
    .command("view-config")
    .description("Views the on-chain config of the contract")
    .action(async () => {
      await viewConfig();
    });

  program
    .command("view-merchant")
    .description("Views the on-chain data associated with a merchant")
    .argument("<pubkey>", "The merchant wallet public key")
    .option(
      "-i",
      "Fetch the merchant directly instead of deriving from wallet address."
    )
    .action(async (pk, opts) => {
      if (opts.i) {
        await viewMerchantFromWallet(new PublicKey(pk));
      } else {
        await viewMerchant(new PublicKey(pk));
      }
    });

  program
    .command("view-mint-request")
    .description("Views the on-chain data associated with a mint request")
    .option("-i, --request-id <number>", "The id to fetch the request")
    .option("-a, --address <pubkey>", "The address to fetch the request.")
    .action(async (opts) => {
      if (opts.address) {
        await viewMintRequest(new PublicKey(opts.address));
      } else {
        await viewMintRequestFromId(new BN(opts.requestId));
      }
    });

  program
    .command("view-redeem-request")
    .description("Views the on-chain data associated with a redeem request")
    .option("-i, --request-id <number>", "The id to fetch the request")
    .option("-a, --address <pubkey>", "The address to fetch the request.")
    .action(async (opts) => {
      if (opts.address) {
        await viewRedeemRequest(new PublicKey(opts.address));
      } else {
        await viewRedeemRequestFromId(new BN(opts.requestId));
      }
    });

  program
    .command("create-mint-request")
    .description("Creates a mint request")
    .argument("<Pubkey>", "The client wallet to receive the wrapped tokens")
    .argument("<string>", "The transaction of btc into the custodian")
    .argument("<number>", "The amount of tokens to mint")
    .action(async (pk, tx, amount) => {
      await createMintRequest(new BN(amount), new PublicKey(pk), tx);
    });

  program
    .command("create-redeem-request")
    .description("Creates a redeem request")
    .argument("<Pubkey>", "The token account to redeem from")
    .argument("<number>", "The amount of tokens to redeem")
    .action(async (pk, amount) => {
      await createRedeemRequest(new PublicKey(pk), new BN(amount));
    });

  program
    .command("create-merchant")
    .description("Creates a merchant")
    .argument("<pubkey>", "The merchant wallet public key")
    .argument("<btc address>", "The merchant btc address")
    .option("-m, --multisig <pubkey>", "The multisig account address ")
    .option(
      "-N, --no--approve",
      "Don't auto approve transaction after creation"
    )
    .action(async (pk, btcAddress, opts) => {
      console.log("pk ", pk);
      console.log("btcAddress ", btcAddress);
      console.log("opts ", opts);
      if (opts.multisig) {
        await createMerchant(
          new PublicKey(pk),
          btcAddress,
          new PublicKey(opts.multisig)
        );
      } else {
        await createMerchant(new PublicKey(pk), btcAddress);
      }
    });

  program
    .command("toggle-enable-merchant")
    .description("Toggles a merchant enabled or disabled")
    .argument("<pubkey>", "The merchant wallet public key")
    .option(
      "-i",
      "Fetch the merchant directly instead of deriving from wallet address."
    )
    .option("-m, --multisig <pubkey>", "The multisig account address ")
    .option(
      "-N, --no--approve",
      "Don't auto approve transaction after creation"
    )
    .action(async (pk, opts) => {
      let merchant;
      if (opts.i) {
        merchant = client.getMerchantKey(new PublicKey(pk));
      } else {
        merchant = new PublicKey(pk);
      }
      if (opts.multisig) {
        await toggleMerchantEnabled(merchant, new PublicKey(opts.multisig));
      } else {
        await toggleMerchantEnabled(merchant);
      }
    });

  program
    .command("toggle-functionality")
    .description("Toggles a functionality enabled or disabled")
    .option(
      "-c, --custodian",
      "Toggles the functionality flag for the custodian"
    )
    .option("-t, --mint", "Toggles the functionality flag for minting")
    .option("-r, --redeem", "Toggles the functionality flag for redeeming")

    .option("-m, --multisig <pubkey>", "The multisig account address ")
    .option(
      "-N, --no--approve",
      "Don't auto approve transaction after creation"
    )
    .action(async (opts) => {
      let mint = null,
        redeem = null,
        custodian = null;

      if (opts.custodian) custodian = true;
      if (opts.redeem) redeem = true;
      if (opts.mint) mint = true;

      if (opts.multisig) {
        await toggleFunctionality(
          custodian,
          mint,
          redeem,
          new PublicKey(opts.multisig)
        );
      } else {
        await toggleFunctionality(custodian, mint, redeem);
      }
    });

  program
    .command("delete-merchant")
    .description("Deletes a merchant")
    .argument("<pubkey>", "The merchant wallet public key")
    .option("-m, --multisig <pubkey>", "The multisig account address ")
    .option(
      "-N, --no--approve",
      "Don't auto approve transaction after creation"
    )
    .action(async (pk, opts) => {
      console.log("pk ", pk);
      console.log("opts ", opts);
      if (opts.multisig) {
        await deleteMerchant(new PublicKey(pk), new PublicKey(opts.multisig));
      } else {
        await deleteMerchant(new PublicKey(pk));
      }
    });

  program
    .command("set-authority")
    .description("Changes the current authority (big DAO)")
    .argument("<pubkey>", "The new authority address")
    .argument("<pubkey>", "The current multisig address (big DAO)")
    .action(async (auth, msig) => {
      await setAuthority(new PublicKey(auth), new PublicKey(msig));
    });

  program
    .command("set-merchant-authority")
    .description("Changes the current merchant authority (small DAO)")
    .argument("<pubkey>", "The new authority address")
    .argument("<pubkey>", "The current multisig address (big DAO)")
    .action(async (auth, msig) => {
      await setMerchantAuthority(new PublicKey(auth), new PublicKey(msig));
    });

  program
    .command("set-custodian")
    .description(
      "Changes the current custodian address, either from the current custodian wallet or from the big DAO authority"
    )
    .argument("<pubkey>", "The new custodian wallet address")
    .option("-m, --multisig <pubkey>", "The multisig address (big DAO)")
    .action(async (auth, opts) => {
      if (opts.multisig) {
        await setCustodianWithMultisig(
          new PublicKey(auth),
          new PublicKey(opts.multisig)
        );
      } else {
        await setCustodian(new PublicKey(auth));
      }
    });

  program
    .command("approve-mint-request")
    .description("Approves a mint request")
    .argument("<number>", "The mint request ID")
    .action(async (id) => {
      await approveMintRequest(new BN(id));
    });

  program
    .command("approve-redeem-request")
    .description("Approves a mint request")
    .argument("<number>", "The mint request ID")
    .argument("<string>", "The transaction hash")
    .action(async (id, tx) => {
      await approveRedeemRequest(new BN(id), tx);
    });

  program
    .command("reject-mint-request")
    .description("Rejects a mint request")
    .argument("<number>", "The mint request ID")
    .action(async (id) => {
      await rejectMintRequest(id);
    });

  program
    .command("cancel-mint-request")
    .description("Cancels a mint request")
    .argument("<number>", "The mint request ID")
    .action(async (id) => {
      await cancelMintRequest(id);
    });

  await program.parseAsync(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
})();
