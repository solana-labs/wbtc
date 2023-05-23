import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { Wbtc } from "../target/types/wbtc";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccount,
  transferChecked,
} from "@solana/spl-token";

//import { Metadata, parseMetadataAccount } from "@metaplex-foundation/js";
import {
  Metadata,
  TokenStandard,
  UseMethod,
  PROGRAM_ID,
  PROGRAM_ADDRESS,
} from "@metaplex-foundation/mpl-token-metadata";
import { findNftByMintOperation } from "@metaplex-foundation/js";

describe("wbtc", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const connection = anchor.getProvider().connection;
  const program = anchor.workspace.Wbtc as Program<Wbtc>;
  const authority = anchor.web3.Keypair.generate();
  const merchantAuthority = anchor.web3.Keypair.generate();
  const merchant = anchor.web3.Keypair.generate();
  const merchant2 = anchor.web3.Keypair.generate();

  const client = anchor.web3.Keypair.generate();
  let clientTokenAccount: PublicKey;
  let merchantTokenAccount: PublicKey;

  const custodian = anchor.web3.Keypair.generate();

  const validBtcAddress = "3Mue5W8CcHBS53JSHUpQoJyAbqfCUBqjFC";
  const tooLongAddress =
    "verylongaddythatissupposedtobeinvalidverylongaddythatissupposedtobeinvalid";
  const tooShortAddress = "shortaddy";
  const validBtcTransaction =
    "a2e62d55f27d033ca8e5e296f1637517fdec92e48b51eb7eb64a9beb500a88bb";

  const wbtcProgram = program.programId;
  const wbtcProgramData = PublicKey.findProgramAddressSync(
    [program.programId.toBuffer()],
    new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
  )[0];

  const TOKEN_METADATA_PROGRAM = new PublicKey(PROGRAM_ADDRESS);

  const getMetadata = (mint: PublicKey): PublicKey => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), PROGRAM_ID.toBuffer(), mint.toBuffer()],
      PROGRAM_ID
    )[0];
  };

  let config: PublicKey;
  let mint: PublicKey;

  let merchantInfo: PublicKey;

  let merchantInfo2: PublicKey;

  before(async () => {
    let p = anchor.getProvider();

    await p.connection.requestAirdrop(authority.publicKey, 10_000_000_000);
    await p.connection.requestAirdrop(merchant.publicKey, 10_000_000_000);
    await p.connection.requestAirdrop(
      merchantAuthority.publicKey,
      10_000_000_000
    );
    await p.connection.requestAirdrop(merchant2.publicKey, 10_000_000_000);
    await p.connection.requestAirdrop(custodian.publicKey, 10_000_000_000);
    await p.connection.requestAirdrop(client.publicKey, 10_000_000_000);
  });

  it("Is initialized!", async () => {
    // const con2 = new anchor.web3.Connection("https://api.mainnet-beta.solana.com")
    // var meta = await Metadata.fromAccountAddress(con2, new PublicKey("F4zNPXoqasVow544cKMQTPaVW4kmxaJXiN9PG9vqcjDt"));

    // console.log(meta);
    // var meta = await Metadata.fromAccountAddress(con2, new PublicKey("3gn71W4d26qqnVrL4FdEjRY6cEQBxS2LHX5SndNjaBcn"));

    // console.log(meta);
    // var meta = await Metadata.fromAccountAddress(con2, new PublicKey("FDZZbyY9XGpL3CNKUZxLk3wFTTQYL3TkDiDzqxrizcPN"));

    // console.log(meta);

    let keys = await program.methods
      .initialize({
        decimals: 9,
        authority: authority.publicKey,
        merchantAuthority: merchantAuthority.publicKey,
        custodian: custodian.publicKey,
        name: "Wrapped BTC",
        symbol: "wBTC",
        uri: "",
      })
      .pubkeys();

    mint = keys.mint;
    config = keys.config;

    let metadata = getMetadata(mint);

    const tx = await program.methods
      .initialize({
        decimals: 9,
        authority: authority.publicKey,
        merchantAuthority: merchantAuthority.publicKey,
        custodian: custodian.publicKey,
        name: "Wrapped BTC",
        symbol: "wBTC",
        uri: "",
      })
      .accounts({ metadata, tokenMetadataProgram: TOKEN_METADATA_PROGRAM })
      .rpcAndKeys();

    await program.methods
      .claimAuthority()
      .accounts({ config, newAuthority: authority.publicKey })
      .signers([authority])
      .rpc();
  });

  it("creates merchant", async () => {
    try {
      const aa = await program.methods
        .createMerchant({
          merchant: merchantAuthority.publicKey,
          merchantBtcAddress: tooShortAddress,
        })
        .accounts({ merchantAuthority: merchantAuthority.publicKey, config })
        .signers([merchantAuthority])
        .rpc();
      assert.ok(false);
    } catch (e) {
      assert.strictEqual(e.error.errorCode.code, "AddressTooShort");
    }
    try {
      const tx = await program.methods
        .createMerchant({
          merchant: merchantAuthority.publicKey,
          merchantBtcAddress: tooLongAddress,
        })
        .accounts({ merchantAuthority: merchantAuthority.publicKey, config })
        .signers([merchantAuthority])
        .rpc();
      assert.ok(false);
    } catch (e) {
      assert.strictEqual(e.error.errorCode.code, "AddressTooLong");
    }

    let tx = await program.methods
      .createMerchant({
        merchant: merchant.publicKey,
        merchantBtcAddress: validBtcAddress,
      })
      .accounts({ merchantAuthority: merchantAuthority.publicKey, config })
      .signers([merchantAuthority])
      .rpcAndKeys();
    merchantInfo = tx.pubkeys.merchantInfo;

    await anchor
      .getProvider()
      .connection.requestAirdrop(merchantAuthority.publicKey, 1_000_000_000);

    tx = await program.methods
      .createMerchant({
        merchant: merchant2.publicKey,
        merchantBtcAddress: validBtcAddress,
      })
      .accounts({
        merchantAuthority: merchantAuthority.publicKey,
        config,
      })
      .signers([merchantAuthority])
      .rpcAndKeys({ skipPreflight: true });
    merchantInfo2 = tx.pubkeys.merchantInfo;
  });

  it("creates mint request", async () => {
    clientTokenAccount = await createAssociatedTokenAccount(
      connection,
      client,
      mint,
      client.publicKey
    );

    try {
      const mintReq = await program.methods
        .createMintRequest({
          amount: new BN(100000),
          transactionId: "dummytxid",
        })
        .accounts({
          config,
          merchantInfo,
          authority: merchant.publicKey,
          clientTokenAccount,
        })
        .signers([merchant])
        .rpc();
    } catch (e) {
      console.log(e);
      assert.strictEqual(e.error.errorCode.code, "MintingDisabled");
    }

    await program.methods
      .toggleFunctionalityEnabled({
        mintEnabled: true,
        redeemEnabled: null,
        custodianEnabled: null,
      })
      .accounts({ config, authority: authority.publicKey })
      .signers([authority])
      .rpc();

    let cfgAccount = await program.account.config.fetch(config);

    assert.isTrue(cfgAccount.mintEnabled);
    assert.isFalse(cfgAccount.redeemEnabled);
    assert.isFalse(cfgAccount.custodianEnabled);

    try {
      const mintReq = await program.methods
        .createMintRequest({
          amount: new BN(100000),
          transactionId: "dummytxid",
        })
        .accounts({
          config,
          merchantInfo,
          authority: merchant.publicKey,
          clientTokenAccount,
        })
        .signers([merchant])
        .rpc();
    } catch (e) {
      assert.strictEqual("MerchantDisabled", e.error.errorCode.code);
    }

    await program.methods
      .toggleMerchantEnabled()
      .accounts({
        config,
        merchantAuthority: merchantAuthority.publicKey,
        merchant: merchantInfo,
      })
      .signers([merchantAuthority])
      .rpc();

    try {
      const mintReq = await program.methods
        .createMintRequest({
          amount: new BN(100000),
          transactionId: "dummytxid",
        })
        .accounts({
          config,
          merchantInfo,
          authority: merchant.publicKey,
          clientTokenAccount,
        })
        .signers([merchant])
        .rpc();
    } catch (e) {
      assert.strictEqual("InvalidCustodianBtcAddress", e.error.errorCode.code);
    }


    await assertInvalidTransaction(
      program.methods
      .setCustodianBtcAddress(validBtcAddress)
      .accounts({
        custodian: custodian.publicKey,
        config,
        merchant: merchantInfo,
      })
      .signers([custodian])
      .rpc(),
      "CustodianDisabled"
    );

    await program.methods
      .toggleFunctionalityEnabled({
        mintEnabled: null,
        redeemEnabled: null,
        custodianEnabled: true,
      })
      .accounts({ config, authority: authority.publicKey })
      .signers([authority])
      .rpc();

    await program.methods
      .setCustodianBtcAddress(validBtcAddress)
      .accounts({
        custodian: custodian.publicKey,
        config,
        merchant: merchantInfo,
      })
      .signers([custodian])
      .rpc();

    try {
      const mintReq = await program.methods
        .createMintRequest({
          amount: new BN(100000),
          transactionId: "dummytxid",
        })
        .accounts({
          config,
          merchantInfo,
          authority: merchant.publicKey,
          clientTokenAccount,
        })
        .signers([merchant])
        .rpc();
    } catch (e) {
      assert.strictEqual("InvalidTransactionLength", e.error.errorCode.code);
    }

    try {
      const mintReq = await program.methods
        .createMintRequest({
          amount: new BN(100000),
          transactionId:
            "!2e62d55f27d033ca8e5e296f1637517fdec92e48b51eb7eb64a9beb500a88bb",
        })
        .accounts({
          config,
          merchantInfo,
          authority: merchant.publicKey,
          clientTokenAccount,
        })
        .signers([merchant])
        .rpc();
    } catch (e) {
      assert.strictEqual(
        e.error.errorCode.code,
        "InvalidTransactionCharacters"
      );
    }

    const mintReq = await program.methods
      .createMintRequest({
        amount: new BN(100000),
        transactionId:
          "a2e62d55f27d033ca8e5e296f1637517fdec92e48b51eb7eb64a9beb500a88bb",
      })
      .accounts({
        config,
        merchantInfo: merchantInfo,
        authority: merchant.publicKey,
        clientTokenAccount,
      })
      .signers([merchant])
      .rpc();
  });

  it("cancel mint request", async () => {
    const res = await program.methods
      .createMintRequest({
        amount: new BN(100000),
        transactionId:
          "a2e62d55f27d033ca8e5e296f1637517fdec92e48b51eb7eb64a9beb500a88bb",
      })
      .accounts({
        config,
        merchantInfo: merchantInfo,
        authority: merchant.publicKey,
        clientTokenAccount,
      })
      .signers([merchant])
      .rpcAndKeys();

    let mintReq = res.pubkeys.mintRequest;

    try {
      let r = await program.methods
        .cancelMintRequest()
        .accounts({
          config,
          mintRequest: mintReq,
          merchant: merchantInfo2,
          authority: merchant2.publicKey,
        })
        .signers([merchant2])
        .rpc();
    } catch (e) {
      assert.strictEqual(e.error.errorCode.code, "InvalidMerchant");
    }

    try {
      let r = await program.methods
        .cancelMintRequest()
        .accounts({
          config,
          mintRequest: mintReq,
          merchant: merchantInfo,
          authority: merchant2.publicKey,
        })
        .signers([merchant2])
        .rpc();
    } catch (e) {
      assert.strictEqual(e.error.errorCode.code, "InvalidMerchantAuthority");
    }

    await assertInvalidTransaction(
      program.methods
        .cancelMintRequest()
        .accounts({
          config,
          mintRequest: mintReq,
          merchant: merchantInfo,
          authority: merchant2.publicKey,
        })
        .signers([merchant2])
        .rpc(),
      "InvalidMerchantAuthority"
    );

    await program.methods
      .cancelMintRequest()
      .accounts({
        config,
        mintRequest: mintReq,
        merchant: merchantInfo,
        authority: merchant.publicKey,
      })
      .signers([merchant])
      .rpc();

    try {
      let acc = await program.account.mintRequest.fetch(mintReq);
      assert.fail("should blow up");
    } catch (e) {
      assert.isTrue(
        e.toString().startsWith("Error: Account does not exist or has no data")
      );
    }

  });

  it("approve mint request", async () => {

    const res = await program.methods
      .createMintRequest({
        amount: new BN(100000),
        transactionId:
          "a2e62d55f27d033ca8e5e296f1637517fdec92e48b51eb7eb64a9beb500a88bb",
      })
      .accounts({
        config,
        merchantInfo: merchantInfo,
        authority: merchant.publicKey,
        clientTokenAccount,
      })
      .signers([merchant])
      .rpcAndKeys();

    let mintReq = res.pubkeys.mintRequest;

    console.log("custodian: ", custodian.publicKey.toString());
    console.log("mintReq: ", mintReq.toString());
    console.log("merchantInfo: ", merchantInfo.toString());
    console.log("merchant: ", merchant.publicKey.toString());
    console.log("clientTokenAccount: ", clientTokenAccount.toString());
    console.log("client: ", client.publicKey.toString());


    await assertInvalidTransaction(
      program.methods
        .approveMintRequest()
        .accounts({
          config,
          mintRequest: mintReq,
          merchant: merchantInfo,
          merchantAuthority: merchant.publicKey,
          custodian: merchant.publicKey,
          clientTokenAccount,
        })
        .signers([merchant])
        .rpc(),
      "InvalidCustodian"
    );

    await program.methods
      .approveMintRequest()
      .accounts({
        config,
        mintRequest: mintReq,
        merchant: merchantInfo,
        merchantAuthority: merchant.publicKey,
        custodian: custodian.publicKey,
        clientTokenAccount,
      })
      .signers([custodian])
      .rpc({ skipPreflight: true });

    try {
      let acc = await program.account.mintRequest.fetch(mintReq);
      assert.fail("should blow up");
    } catch (e) {
      console.log(e);
      assert.isTrue(
        e.toString().startsWith("Error: Account does not exist or has no data")
      );
    }

  });

  it("reject mint request", async () => {

    const res = await program.methods
      .createMintRequest({
        amount: new BN(100000),
        transactionId:
          "a2e62d55f27d033ca8e5e296f1637517fdec92e48b51eb7eb64a9beb500a88bb",
      })
      .accounts({
        config,
        merchantInfo: merchantInfo,
        authority: merchant.publicKey,
        clientTokenAccount,
      })
      .signers([merchant])
      .rpcAndKeys();

    let mintReq = res.pubkeys.mintRequest;

    console.log("custodian: ", custodian.publicKey.toString());
    console.log("mintReq: ", mintReq.toString());
    console.log("merchantInfo: ", merchantInfo.toString());
    console.log("merchant: ", merchant.publicKey.toString());
    console.log("clientTokenAccount: ", clientTokenAccount.toString());
    console.log("client: ", client.publicKey.toString());

    await assertInvalidTransaction(
      program.methods
        .rejectMintRequest()
        .accounts({
          config,
          mintRequest: mintReq,
          merchant: merchantInfo,
          merchantAuthority: merchant.publicKey,
          custodian: merchant.publicKey,
        })
        .signers([merchant])
        .rpc(),
      "InvalidCustodian"
    );

    await program.methods
      .toggleFunctionalityEnabled({
        mintEnabled: null,
        redeemEnabled: null,
        custodianEnabled: true,
      })
      .accounts({ config, authority: authority.publicKey })
      .signers([authority])
      .rpc();

    await program.methods
      .rejectMintRequest()
      .accounts({
        config,
        mintRequest: mintReq,
        merchant: merchantInfo,
        merchantAuthority: merchant.publicKey,
        custodian: custodian.publicKey,
      })
      .signers([custodian])
      .rpc({ skipPreflight: true });

    try {
      let acc = await program.account.mintRequest.fetch(mintReq);
      assert.fail("should blow up");
    } catch (e) {
      console.log(e);
      assert.isTrue(
        e.toString().startsWith("Error: Account does not exist or has no data")
      );
    }

  });

  it("creates redeem request", async () => {
    merchantTokenAccount = await createAssociatedTokenAccount(
      connection,
      merchant,
      mint,
      merchant.publicKey
    );

    await assertInvalidTransaction(
      program.methods
        .createRedeemRequest({
          amount: new BN(100000),
        })
        .accounts({
          config,
          merchantInfo,
          mint,
          //authority: merchant.publicKey,
          authority: merchant.publicKey,
          tokenSource: merchantTokenAccount,
        })
        .signers([merchant])
        .rpc(),
      "RedeemingDisabled"
    );

    await program.methods
      .toggleFunctionalityEnabled({
        redeemEnabled: true,
        mintEnabled: null,
        custodianEnabled: null,
      })
      .accounts({ config, authority: authority.publicKey })
      .signers([authority])
      .rpc();

    await assertInvalidTransaction(
      program.methods
        .createRedeemRequest({
          amount: new BN(0),
        })
        .accounts({
          config,
          merchantInfo,
          mint,
          //authority: merchant.publicKey,
          authority: merchant.publicKey,
          tokenSource: merchantTokenAccount,
        })
        .signers([merchant])
        .rpc(),
      "InvalidAmount"
    );

    await assertInvalidTransaction(
      program.methods
        .createRedeemRequest({
          amount: new BN(100000),
        })
        .accounts({
          config,
          merchantInfo,
          mint,
          //authority: merchant.publicKey,
          authority: merchant.publicKey,
          tokenSource: merchantTokenAccount,
        })
        .signers([merchant])
        .rpc(),
      "InvalidAmount"
    );

    await transferChecked(
      connection,
      client,
      clientTokenAccount,
      mint,
      merchantTokenAccount,
      client,
      100000,
      9
    );

    let keys = await program.methods
      .createRedeemRequest({
        amount: new BN(100000),
      })
      .accounts({
        config,
        merchantInfo,
        mint,
        //authority: merchant.publicKey,
        authority: merchant.publicKey,
        tokenSource: merchantTokenAccount,
      })
      .signers([merchant])
      .rpcAndKeys();

    console.log("after create redeem");

    let redeemRequest = keys.pubkeys.redeemRequest;

    await assertInvalidTransaction(
      program.methods
        .approveRedeemRequest({
          transactionId: validBtcTransaction,
        })
        .accounts({
          config,
          merchantAuthority: merchant.publicKey,
          custodian: client.publicKey,
          redeemRequest,
        })
        .signers([client])
        .rpc(),
      "InvalidCustodian"
    );

    await assertInvalidTransaction(
      program.methods
        .approveRedeemRequest({
          transactionId: "invalidbtctx",
        })
        .accounts({
          config,
          merchantAuthority: merchant.publicKey,
          custodian: custodian.publicKey,
          redeemRequest,
        })
        .signers([custodian])
        .rpc(),
      "InvalidTransactionLength"
    );

    await assertInvalidTransaction(
      program.methods
        .approveRedeemRequest({
          transactionId: validBtcTransaction,
        })
        .accounts({
          config,
          merchantAuthority: merchant2.publicKey,
          custodian: custodian.publicKey,
          redeemRequest,
        })
        .signers([custodian])
        .rpc(),
      "InvalidMerchantAuthority"
    );

    await program.methods
      .approveRedeemRequest({
        transactionId: validBtcTransaction,
      })
      .accounts({
        config,
        merchantAuthority: merchant.publicKey,
        custodian: custodian.publicKey,
        redeemRequest,
      })
      .signers([custodian])
      .rpc();
  });

  it("deletes merchant", async () => {
    await assertInvalidTransaction(
      program.methods
        .deleteMerchant()
        .accounts({
          merchantAuthority: client.publicKey,
          merchantInfo: merchantInfo,
          config,
        })
        .signers([client])
        .rpc(),
      "InvalidAuthority"
    );
    await program.methods
      .deleteMerchant()
      .accounts({
        merchantAuthority: merchantAuthority.publicKey,
        merchantInfo: merchantInfo,
        config,
      })
      .signers([merchantAuthority])
      .rpc();
  });
});

async function assertInvalidTransaction(p: Promise<string>, code: String) {
  try {
    await p;
    assert.fail("Expected to throw");
  } catch (e) {
    //console.log(e);
    assert.strictEqual(code, e.error.errorCode.code);
  }
}
