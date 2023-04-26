use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::events::{EventKind, MintEvent};
use crate::state::{Config, Merchant, MintRequest};

#[derive(Accounts)]
pub struct CancelMintRequestAccounts<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub config: Account<'info, Config>,

    #[account(has_one = authority @ ErrorCode::InvalidMerchantAuthority)]
    pub merchant: Account<'info, Merchant>,

    #[account(mut,
        has_one = merchant @ ErrorCode::InvalidMerchant,
        close = authority
    )]
    pub mint_request: Account<'info, MintRequest>,
}

pub fn handler(ctx: Context<CancelMintRequestAccounts>) -> Result<()> {
    require!(ctx.accounts.config.mint_enabled, ErrorCode::MintingDisabled);
    require!(ctx.accounts.merchant.enabled, ErrorCode::MerchantDisabled);

    emit!(MintEvent::create(
        &ctx.accounts.mint_request,
        &ctx.accounts.merchant,
        EventKind::Cancelled
    )?);
    Ok(())
}
