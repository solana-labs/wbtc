use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{Config, Merchant};

#[derive(Accounts)]
pub struct ToggleMerchantEnabledAccounts<'info> {
    pub merchant_authority: Signer<'info>,

    #[account(has_one = merchant_authority @ ErrorCode::InvalidMerchantAuthority)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub merchant: Account<'info, Merchant>,
}

pub fn handler(ctx: Context<ToggleMerchantEnabledAccounts>) -> Result<()> {
    ctx.accounts.merchant.enabled = !ctx.accounts.merchant.enabled;
    Ok(())
}
