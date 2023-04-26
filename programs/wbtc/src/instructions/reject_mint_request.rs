use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::events::{EventKind, MintEvent};
use crate::state::{Config, Merchant, MintRequest};

#[derive(Accounts)]
pub struct RejectMintRequestAccounts<'info> {
    #[account(mut)]
    pub custodian: Signer<'info>,

    #[account(has_one = custodian @ ErrorCode::InvalidCustodian)]
    pub config: Account<'info, Config>,

    /// CHECK: checked with constraint
    #[account(mut,
        constraint = merchant.authority == merchant_authority.key() @ ErrorCode::InvalidMerchantAuthority
    )]
    pub merchant_authority: AccountInfo<'info>,

    pub merchant: Account<'info, Merchant>,

    #[account(mut,
        close = merchant_authority,
        has_one = merchant,
    )]
    pub mint_request: Account<'info, MintRequest>,
}

pub fn handler(ctx: Context<RejectMintRequestAccounts>) -> Result<()> {
    require!(ctx.accounts.config.mint_enabled, ErrorCode::MintingDisabled);
    require!(
        ctx.accounts.config.custodian_enabled,
        ErrorCode::CustodianDisabled
    );

    emit!(MintEvent::create(
        &ctx.accounts.mint_request,
        &ctx.accounts.merchant,
        EventKind::Rejected
    )?);
    Ok(())
}
