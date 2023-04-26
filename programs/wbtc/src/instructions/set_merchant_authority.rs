use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::Config;

#[derive(Accounts)]
pub struct SetMerchantAuthorityAccounts<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut, has_one = authority @ ErrorCode::InvalidAuthority)]
    pub config: Account<'info, Config>,

    /// CHECK: nothing to check here, its just the new authority address
    pub new_merchant_authority: AccountInfo<'info>,
}

pub fn handler(ctx: Context<SetMerchantAuthorityAccounts>) -> Result<()> {
    ctx.accounts.config.merchant_authority = ctx.accounts.new_merchant_authority.key();

    Ok(())
}
