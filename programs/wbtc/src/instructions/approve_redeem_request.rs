use anchor_lang::prelude::*;
use anchor_spl::token::Token;

use crate::error::ErrorCode;
use crate::events::{EventKind, RedeemEvent};
use crate::state::{Config, Merchant, RedeemRequest};
use crate::utils::validate_btc_transaction;

#[derive(Accounts)]
pub struct ApproveRedeemRequestAccounts<'info> {
    #[account(mut)]
    pub custodian: Signer<'info>,

    #[account(has_one = custodian @ ErrorCode::InvalidCustodian)]
    pub config: Account<'info, Config>,

    /// CHECK: checked with constraint
    #[account(mut,
        constraint = merchant.authority == merchant_authority.key() @ ErrorCode::InvalidMerchantAuthority
    )]
    pub merchant_authority: AccountInfo<'info>,

    #[account(mut)]
    pub merchant: Account<'info, Merchant>,

    #[account(mut,
        close = merchant,
        has_one = merchant,
    )]
    pub redeem_request: Account<'info, RedeemRequest>,

    pub token_program: Program<'info, Token>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ApproveRedeemRequestArgs {
    pub transaction_id: String,
}

pub fn handler(
    ctx: Context<ApproveRedeemRequestAccounts>,
    args: ApproveRedeemRequestArgs,
) -> Result<()> {
    require!(
        ctx.accounts.config.redeem_enabled,
        ErrorCode::RedeemingDisabled
    );
    require!(
        ctx.accounts.config.custodian_enabled,
        ErrorCode::CustodianDisabled
    );

    validate_btc_transaction(&args.transaction_id)?;

    emit!(RedeemEvent::create(
        &ctx.accounts.redeem_request,
        &ctx.accounts.merchant,
        args.transaction_id,
        EventKind::Approved
    )?);
    Ok(())
}
