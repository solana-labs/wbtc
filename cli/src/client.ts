import {
  setProvider,
  Program,
  AnchorProvider,
  workspace,
  utils,
  BN,
  ProgramAccount,
  Wallet,
} from "@coral-xyz/anchor";
import { Wbtc } from "../../target/types/wbtc";
import {
  PublicKey,
  TransactionInstruction,
  Transaction,
  SystemProgram,
  AccountMeta,
  Keypair,
  SYSVAR_RENT_PUBKEY,
  sendAndConfirmTransaction,
  Connection,
} from "@solana/web3.js";
import {
  getAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountIdempotent,
} from "@solana/spl-token";
import fetch from "node-fetch";
import { sha256 } from "js-sha256";
import { encode } from "bs58";
import { readFileSync } from "fs";
import Squads, {
  DEFAULT_MULTISIG_PROGRAM_ID,
  getAuthorityPDA,
} from "@sqds/sdk";

import {
  InstructionAccountAddresses,
  TypeDef,
} from "@coral-xyz/anchor/dist/cjs/program/namespace/types";
import { TransactionBuilder } from "@sqds/sdk/lib/sdk/src/tx_builder";

export type Config = TypeDef<Wbtc["accounts"][0], Wbtc>;
export type Merchant = TypeDef<Wbtc["accounts"][1], Wbtc>;
export type MintRequest = TypeDef<Wbtc["accounts"][2], Wbtc>;
export type RedeemRequest = TypeDef<Wbtc["accounts"][3], Wbtc>;

export type InitializeArgs = TypeDef<Wbtc["types"][4], Wbtc>;

export type CreateMerchantKeys = InstructionAccountAddresses<
  Wbtc,
  Wbtc["instructions"][6]
>;

export class WbtcClient {
  provider: AnchorProvider;
  program: Program<Wbtc>;
  admin: Keypair;
  adminWallet: Wallet;

  // pdas
  configKey: PublicKey;
  //config: Config;

  squads: Squads;

  constructor(clusterUrl: string, adminKey: string) {
    this.provider = AnchorProvider.local(clusterUrl, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
    setProvider(this.provider);

    this.program = workspace.Wbtc as Program<Wbtc>;

    this.admin = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(readFileSync(adminKey).toString()))
    );

    this.adminWallet = new Wallet(this.admin);

    this.squads = Squads.endpoint(clusterUrl, this.adminWallet, {
      commitmentOrConfig: "confirmed",
    });

    this.configKey = this.getConfigKey();

    BN.prototype.toJSON = function () {
      return this.toString(10);
    };
  }

  findProgramAddress = (label: string, extraSeeds = null) => {
    let seeds = [Buffer.from(utils.bytes.utf8.encode(label))];
    if (extraSeeds) {
      for (let extraSeed of extraSeeds) {
        if (typeof extraSeed === "string") {
          seeds.push(Buffer.from(utils.bytes.utf8.encode(extraSeed)));
        } else if (Array.isArray(extraSeed)) {
          seeds.push(Buffer.from(extraSeed));
        } else if (Buffer.isBuffer(extraSeed)) {
          seeds.push(extraSeed);
        } else {
          seeds.push(extraSeed.toBuffer());
        }
      }
    }
    let res = PublicKey.findProgramAddressSync(seeds, this.program.programId);
    return { publicKey: res[0], bump: res[1] };
  };

  async getMerchants(): Promise<ProgramAccount<Merchant>[]> {
    return await this.program.account.merchant.all();
  }

  async getMerchant(merchant: PublicKey): Promise<Merchant> {
    return await this.program.account.merchant.fetch(merchant);
  }

  async getMerchantFromWallet(merchantWallet: PublicKey): Promise<Merchant> {
    const merchantKey = this.getMerchantKey(merchantWallet);
    return this.getMerchant(merchantKey);
  }

  async getMintRequests(): Promise<ProgramAccount<MintRequest>[]> {
    return await this.program.account.mintRequest.all();
  }

  async getMintRequest(request: PublicKey): Promise<MintRequest> {
    return await this.program.account.mintRequest.fetch(request);
  }

  async getRedeemRequests(): Promise<ProgramAccount<RedeemRequest>[]> {
    return await this.program.account.redeemRequest.all();
  }

  async getRedeemRequest(request: PublicKey): Promise<RedeemRequest> {
    return await this.program.account.redeemRequest.fetch(request);
  }

  async getConfig(): Promise<Config> {
    return await this.program.account.config.fetch(this.configKey);
  }

  getConfigKey(): PublicKey {
    return this.findProgramAddress("CONFIG").publicKey;
  }

  getMerchantKey(merchant: PublicKey): PublicKey {
    return this.findProgramAddress("MERCHANT", [merchant]).publicKey;
  }

  getRedeemRequestKey(reqNumber: BN): PublicKey {
    return this.findProgramAddress("REDEEM_REQUEST", [
      reqNumber.toArrayLike(Buffer, "le", 8),
    ]).publicKey;
  }

  getMintRequestKey(reqNumber: BN): PublicKey {
    return this.findProgramAddress("MINT_REQUEST", [
      reqNumber.toArrayLike(Buffer, "le", 8),
    ]).publicKey;
  }

  ///////
  // instructions

  async initialize(config: InitializeArgs) {
    let wbtcProgramData = PublicKey.findProgramAddressSync(
      [this.program.programId.toBuffer()],
      new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
    )[0];

    let TOKEN_METADATA_PROGRAM = new PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

    let programMetas = [
      {
        isSigner: false,
        isWritable: false,
        pubkey: this.program.programId,
      },
      {
        isSigner: false,
        isWritable: false,
        pubkey: wbtcProgramData,
      },
    ];
    console.log("1");
    let keys = await this.program.methods
      .initialize(config)
      .accounts({})
      .remainingAccounts(programMetas)
      .pubkeys();

    let metadata = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM.toBuffer(),
        keys.mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM
    )[0];
    console.log("2");
    let accs = await this.program.methods
      .initialize(config)
      .accounts({ metadata, tokenMetadataProgram: TOKEN_METADATA_PROGRAM })
      .remainingAccounts(programMetas)
      .pubkeys();
    console.log("3");
    console.log(accs);
    await this.program.methods
      .initialize(config)
      .accounts({ metadata, tokenMetadataProgram: TOKEN_METADATA_PROGRAM })
      .remainingAccounts(programMetas)
      .rpc();
  }

  async createMerchant(
    merchant: PublicKey,
    merchantBtcAddress: string
  ): Promise<string> {
    return await this.program.methods
      .createMerchant({ merchant, merchantBtcAddress })
      .accounts({ config: this.configKey })
      .rpc();
  }

  async createMerchantWithSquads(
    merchant: PublicKey,
    merchantBtcAddress: string,
    multisigAddress: PublicKey,
    approve: boolean
  ): Promise<PublicKey> {
    const cfg = await this.getConfig();

    const msTx = await this.squads.createTransaction(multisigAddress, 1);

    const ixBuilder = this.program.methods
      .createMerchant({ merchant, merchantBtcAddress })
      .accounts({
        config: this.configKey,
        merchantAuthority: cfg.merchantAuthority,
      });

    const msIx = await this.squads.addInstruction(
      msTx.publicKey,
      await ixBuilder.instruction()
    );

    const fin = await this.squads.activateTransaction(msTx.publicKey);

    if (approve) await this.squads.approveTransaction(msTx.publicKey);

    console.log("Squads transaction: ", msTx.publicKey);
    console.log("Squads instruction: ", msIx.publicKey);

    return msIx.publicKey;
  }

  async deleteMerchantWithSquads(
    merchant: PublicKey,
    multisigAddress: PublicKey,
    approve: boolean
  ): Promise<PublicKey> {
    const cfg = await this.getConfig();

    const msTx = await this.squads.createTransaction(multisigAddress, 1);

    const ixBuilder = this.program.methods.deleteMerchant().accounts({
      config: this.configKey,
      merchantAuthority: cfg.merchantAuthority,
    });

    const msIx = await this.squads.addInstruction(
      msTx.publicKey,
      await ixBuilder.instruction()
    );

    const fin = await this.squads.activateTransaction(msTx.publicKey);

    if (approve) await this.squads.approveTransaction(msTx.publicKey);

    console.log("Squads transaction: ", msTx.publicKey);
    console.log("Squads instruction: ", msIx.publicKey);

    return msIx.publicKey;
  }

  async deleteMerchant(merchant: PublicKey): Promise<string> {
    let merchantInfo = this.getMerchantKey(merchant);
    return await this.program.methods
      .deleteMerchant()
      .accounts({ merchantInfo })
      .rpc();
  }

  async getCreateMerchantKeys(
    merchant: PublicKey,
    merchantBtcAddress: string
  ): Promise<CreateMerchantKeys> {
    let builder = this.program.methods
      .createMerchant({ merchant, merchantBtcAddress })
      .accounts({ config: this.configKey });

    let keys = await builder.pubkeys();

    return keys as CreateMerchantKeys;
  }

  async createTokenAccount(owner: PublicKey): Promise<PublicKey> {
    let config = await this.getConfig();

    let clientTokenAccount = await createAssociatedTokenAccountIdempotent(
      this.provider.connection,
      this.admin,
      config.mint,
      owner
    );

    return clientTokenAccount;
  }

  async createRedeemRequest(
    tokenSource: PublicKey,
    amount: BN
  ): Promise<string> {
    let config = await this.getConfig();
    let merchantInfo = this.getMerchantKey(this.admin.publicKey);
    let redeemRequest = this.getRedeemRequestKey(config.redeemReqCounter);

    return await this.program.methods
      .createRedeemRequest({ amount })
      .accounts({
        config: this.configKey,
        redeemRequest,
        merchantInfo,
        mint: config.mint,
        tokenSource,
      })
      .rpc();
  }

  async createMintRequest(
    tokenDestination: PublicKey,
    amount: BN,
    transactionId: string
  ): Promise<string> {
    let config = await this.getConfig();
    let merchantInfo = this.getMerchantKey(this.admin.publicKey);
    let mintRequest = this.getMintRequestKey(config.mintReqCounter);

    return await this.program.methods
      .createMintRequest({ amount, transactionId })
      .accounts({
        config: this.configKey,
        mintRequest,
        merchantInfo,
        clientTokenAccount: tokenDestination,
      })
      .rpc();
  }

  async approveMintRequestId(reqNumber: BN): Promise<string> {
    let request = this.getMintRequestKey(reqNumber);
    return this.approveMintRequest(request);
  }

  async approveMintRequest(request: PublicKey): Promise<string> {
    let config = await this.getConfig();
    let req = await this.getMintRequest(request);
    let merchant = await this.getMerchant(req.merchant);
    return await this.program.methods
      .approveMintRequest()
      .accounts({
        config: this.configKey,
        mint: config.mint,
        merchant: req.merchant,
        merchantAuthority: merchant.authority,
        mintRequest: request,
        clientTokenAccount: req.clientTokenAccount,
      })
      .rpc();
  }

  async approveRedeemRequestId(
    reqNumber: BN,
    transactionId: string
  ): Promise<string> {
    let request = this.getRedeemRequestKey(reqNumber);
    return this.approveRedeemRequest(request, transactionId);
  }

  async approveRedeemRequest(
    request: PublicKey,
    transactionId: string
  ): Promise<string> {
    let config = await this.getConfig();
    let req = await this.getRedeemRequest(request);
    let merchant = await this.getMerchant(req.merchant);
    return await this.program.methods
      .approveRedeemRequest({ transactionId })
      .accounts({
        config: this.configKey,
        merchant: req.merchant,
        merchantAuthority: merchant.authority,
        redeemRequest: request,
      })
      .rpc();
  }

  async cancelMintRequestId(reqNumber: BN): Promise<string> {
    let request = this.getMintRequestKey(reqNumber);
    return this.cancelMintRequest(request);
  }

  async cancelMintRequest(request: PublicKey): Promise<string> {
    let config = await this.getConfig();
    let req = await this.getMintRequest(request);
    return await this.program.methods
      .cancelMintRequest()
      .accounts({
        config: this.configKey,
        merchant: req.merchant,
        mintRequest: request,
      })
      .rpc();
  }

  async rejectMintRequestId(reqNumber: BN): Promise<string> {
    let request = this.getMintRequestKey(reqNumber);
    return this.cancelMintRequest(request);
  }

  async rejectMintRequest(request: PublicKey): Promise<string> {
    let config = await this.getConfig();
    let req = await this.getMintRequest(request);
    let merchant = await this.getMerchant(req.merchant);
    return await this.program.methods
      .rejectMintRequest()
      .accounts({
        config: this.configKey,
        merchant: req.merchant,
        mintRequest: request,
        merchantAuthority: merchant.authority,
      })
      .rpc();
  }

  async setAuthority(newAuthority: PublicKey): Promise<string> {
    return await this.program.methods
      .setAuthority()
      .accounts({ config: this.configKey, newAuthority })
      .rpc();
  }

  async setAuthorityWithSquads(
    newAuthority: PublicKey,
    multisigAddress: PublicKey,
    approve: boolean
  ): Promise<PublicKey> {
    const cfg = await this.getConfig();

    const msTx = await this.squads.createTransaction(multisigAddress, 1);

    const ixBuilder = this.program.methods
      .setAuthority()
      .accounts({
        config: this.configKey,
        newAuthority,
        authority: cfg.authority,
      });

    const msIx = await this.squads.addInstruction(
      msTx.publicKey,
      await ixBuilder.instruction()
    );

    const fin = await this.squads.activateTransaction(msTx.publicKey);

    if (approve) await this.squads.approveTransaction(msTx.publicKey);

    console.log("Squads transaction: ", msTx.publicKey);
    console.log("Squads instruction: ", msIx.publicKey);

    return msIx.publicKey;
  }

  async setMerchantAuthority(newMerchantAuthority: PublicKey): Promise<string> {
    return await this.program.methods
      .setMerchantAuthority()
      .accounts({ config: this.configKey, newMerchantAuthority })
      .rpc();
  }

  async setMerchantAuthorityWithSquads(
    newMerchantAuthority: PublicKey,
    multisigAddress: PublicKey,
    approve: boolean
  ): Promise<PublicKey> {
    const cfg = await this.getConfig();

    const msTx = await this.squads.createTransaction(multisigAddress, 1);

    const ixBuilder = this.program.methods
      .setMerchantAuthority()
      .accounts({
        config: this.configKey,
        newMerchantAuthority,
        authority: cfg.authority,
      });

    const msIx = await this.squads.addInstruction(
      msTx.publicKey,
      await ixBuilder.instruction()
    );

    const fin = await this.squads.activateTransaction(msTx.publicKey);

    if (approve) await this.squads.approveTransaction(msTx.publicKey);

    console.log("Squads transaction: ", msTx.publicKey);
    console.log("Squads instruction: ", msIx.publicKey);

    return msIx.publicKey;
  }

  async setCustodian(newCustodian: PublicKey): Promise<string> {
    return await this.program.methods
      .setCustodian()
      .accounts({ config: this.configKey, newCustodian })
      .rpc();
  }

  async setCustodianWithSquads(
    newCustodian: PublicKey,
    multisigAddress: PublicKey,
    approve: boolean
  ): Promise<PublicKey> {
    const cfg = await this.getConfig();

    const msTx = await this.squads.createTransaction(multisigAddress, 1);

    const ixBuilder = this.program.methods
      .setCustodian()
      .accounts({
        config: this.configKey,
        newCustodian,
        authority: cfg.authority,
      });

    const msIx = await this.squads.addInstruction(
      msTx.publicKey,
      await ixBuilder.instruction()
    );

    const fin = await this.squads.activateTransaction(msTx.publicKey);

    if (approve) await this.squads.approveTransaction(msTx.publicKey);

    console.log("Squads transaction: ", msTx.publicKey);
    console.log("Squads instruction: ", msIx.publicKey);

    return msIx.publicKey;
  }

  async setCustodianBtcAddress(newBtcAddress: string): Promise<string> {
    return this.program.methods
      .setCustodianBtcAddress(newBtcAddress)
      .accounts({ config: this.configKey })
      .rpc();
  }

  async setMerchantBtcAddress(newBtcAddress: string): Promise<string> {
    let merchant = this.getMerchantKey(this.admin.publicKey);
    return this.program.methods
      .setMerchantBtcAddress(newBtcAddress)
      .accounts({ merchant })
      .rpc();
  }

  async toggleMerchantEnabled(merchant: PublicKey): Promise<string> {
    return this.program.methods
      .toggleMerchantEnabled()
      .accounts({ config: this.configKey, merchant })
      .rpc();
  }

  async toggleMerchantEnabledWithSquads(
    merchant: PublicKey,
    multisigAddress: PublicKey,
    approve: boolean
  ): Promise<PublicKey> {
    const cfg = await this.getConfig();

    const msTx = await this.squads.createTransaction(multisigAddress, 1);

    const ixBuilder = this.program.methods
      .toggleMerchantEnabled()
      .accounts({
        config: this.configKey,
        merchant,
        merchantAuthority: cfg.merchantAuthority,
      });

    const msIx = await this.squads.addInstruction(
      msTx.publicKey,
      await ixBuilder.instruction()
    );

    const fin = await this.squads.activateTransaction(msTx.publicKey);

    if (approve) await this.squads.approveTransaction(msTx.publicKey);

    console.log("Squads transaction: ", msTx.publicKey);
    console.log("Squads instruction: ", msIx.publicKey);

    //const exec = await this.squads.executeTransaction(msTx.publicKey);

    return msIx.publicKey;
  }

  async toggleFunctionalityEnabled(
    custodianEnabled: boolean,
    mintEnabled: boolean,
    redeemEnabled: boolean
  ): Promise<string> {
    return this.program.methods
      .toggleFunctionalityEnabled({
        custodianEnabled,
        mintEnabled,
        redeemEnabled,
      })
      .accounts({ config: this.configKey })
      .rpc();
  }

  async toggleFunctionalityEnabledWithSquads(
    custodianEnabled: boolean,
    mintEnabled: boolean,
    redeemEnabled: boolean,
    multisigAddress: PublicKey,
    approve: boolean
  ): Promise<PublicKey> {
    const cfg = await this.getConfig();

    const msTx = await this.squads.createTransaction(multisigAddress, 1);
    console.log(custodianEnabled);
    console.log(mintEnabled);
    console.log(redeemEnabled);
    const ixBuilder = this.program.methods
      .toggleFunctionalityEnabled({
        custodianEnabled,
        mintEnabled,
        redeemEnabled,
      })
      .accounts({ config: this.configKey, authority: cfg.authority });

    const msIx = await this.squads.addInstruction(
      msTx.publicKey,
      await ixBuilder.instruction()
    );

    const fin = await this.squads.activateTransaction(msTx.publicKey);

    if (approve) await this.squads.approveTransaction(msTx.publicKey);

    console.log("Squads transaction: ", msTx.publicKey);
    console.log("Squads instruction: ", msIx.publicKey);

    return msIx.publicKey;
  }
}
