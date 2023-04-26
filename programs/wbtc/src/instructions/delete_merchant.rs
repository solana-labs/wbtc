use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{Config, Merchant};

#[derive(Accounts)]
pub struct DeleteMerchantAccounts<'info> {
    #[account(mut)]
    pub merchant_authority: Signer<'info>,

    #[account(has_one = merchant_authority @ ErrorCode::InvalidAuthority)]
    pub config: Account<'info, Config>,

    #[account(mut, close = merchant_authority)]
    pub merchant_info: Account<'info, Merchant>,
}

pub fn handler(_ctx: Context<DeleteMerchantAccounts>) -> Result<()> {
    Ok(())
}
