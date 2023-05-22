use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::Config;

#[derive(Accounts)]
pub struct SetCustodianAccounts<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut,
        constraint = config.authority == authority.key()
            || config.custodian == authority.key() @ ErrorCode::InvalidAuthority
    )]
    pub config: Account<'info, Config>,

    /// CHECK: nothing to check here, its just the new authority address
    #[account(
        constraint = new_custodian.key() != config.authority 
        && new_custodian.key() != config.new_authority @ ErrorCode::InvalidNewCustodian
    )]
    pub new_custodian: AccountInfo<'info>,
}

pub fn handler(ctx: Context<SetCustodianAccounts>) -> Result<()> {
    // rationale: custodian should only be able to change its address if its flag is enabled
    require!(
        ctx.accounts.config.custodian_enabled
            || ctx.accounts.authority.key() != ctx.accounts.config.custodian,
        ErrorCode::CustodianDisabled
    );

    ctx.accounts.config.custodian = ctx.accounts.new_custodian.key();

    Ok(())
}
