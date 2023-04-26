mod constants;
mod error;
mod events;
mod instructions;
mod macros;
mod metadata;
mod state;
mod utils;

pub use instructions::*;

use anchor_lang::prelude::*;

declare_id!("5t659YCpvc9cSMNtZxDY9tpa3WArKpwe1eqPBKBaa8Rx");

#[program]
pub mod wbtc {

    use super::*;

    pub fn initialize(ctx: Context<InitializeAccounts>, args: InitializeArgs) -> Result<()> {
        instructions::initialize::handler(ctx, args)
    }

    pub fn set_authority(ctx: Context<SetAuthorityAccounts>) -> Result<()> {
        instructions::set_authority::handler(ctx)
    }

    pub fn set_merchant_authority(ctx: Context<SetMerchantAuthorityAccounts>) -> Result<()> {
        instructions::set_merchant_authority::handler(ctx)
    }

    pub fn set_custodian(ctx: Context<SetCustodianAccounts>) -> Result<()> {
        instructions::set_custodian::handler(ctx)
    }

    pub fn set_custodian_btc_address(
        ctx: Context<SetCustodianBtcAddressAccounts>,
        new_custodian_btc_address: String,
    ) -> Result<()> {
        instructions::set_custodian_btc_address::handler(ctx, new_custodian_btc_address)
    }

    pub fn set_merchant_btc_address(
        ctx: Context<SetMerchantBtcAddressAccounts>,
        new_merchant_btc_address: String,
    ) -> Result<()> {
        instructions::set_merchant_btc_address::handler(ctx, new_merchant_btc_address)
    }

    pub fn create_merchant(
        ctx: Context<CreateMerchantAccounts>,
        args: CreateMerchantArgs,
    ) -> Result<()> {
        instructions::create_merchant::handler(ctx, args)
    }

    pub fn delete_merchant(ctx: Context<DeleteMerchantAccounts>) -> Result<()> {
        instructions::delete_merchant::handler(ctx)
    }

    pub fn create_mint_request(
        ctx: Context<CreateMintRequestAccounts>,
        args: CreateMintRequestArgs,
    ) -> Result<()> {
        instructions::create_mint_request::handler(ctx, args)
    }

    pub fn cancel_mint_request(ctx: Context<CancelMintRequestAccounts>) -> Result<()> {
        instructions::cancel_mint_request::handler(ctx)
    }

    pub fn approve_mint_request(ctx: Context<ApproveMintRequestAccounts>) -> Result<()> {
        instructions::approve_mint_request::handler(ctx)
    }

    pub fn reject_mint_request(ctx: Context<RejectMintRequestAccounts>) -> Result<()> {
        instructions::reject_mint_request::handler(ctx)
    }

    pub fn create_redeem_request(
        ctx: Context<CreateRedeemRequestAccounts>,
        args: CreateRedeemRequestArgs,
    ) -> Result<()> {
        instructions::create_redeem_request::handler(ctx, args)
    }

    pub fn approve_redeem_request(
        ctx: Context<ApproveRedeemRequestAccounts>,
        args: ApproveRedeemRequestArgs,
    ) -> Result<()> {
        instructions::approve_redeem_request::handler(ctx, args)
    }

    pub fn cancel_redeem_request(ctx: Context<CancelRedeemRequestAccounts>) -> Result<()> {
        instructions::cancel_redeem_request::handler(ctx)
    }

    pub fn toggle_merchant_enabled(ctx: Context<ToggleMerchantEnabledAccounts>) -> Result<()> {
        instructions::toggle_merchant_enabled::handler(ctx)
    }

    pub fn toggle_functionality_enabled(
        ctx: Context<ToggleFunctionalityEnabledAccounts>,
        args: ToggleFunctionalityEnabledArgs,
    ) -> Result<()> {
        instructions::toggle_functionality_enabled::handler(ctx, args)
    }
}
