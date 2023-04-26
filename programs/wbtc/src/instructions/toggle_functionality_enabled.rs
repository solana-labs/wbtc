use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::Config;

#[derive(Accounts)]
pub struct ToggleFunctionalityEnabledAccounts<'info> {
    pub authority: Signer<'info>,

    #[account(mut, has_one = authority @ ErrorCode::InvalidAuthority)]
    pub config: Account<'info, Config>,
}

#[derive(Debug, Copy, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ToggleFunctionalityEnabledArgs {
    pub custodian_enabled: Option<bool>,
    pub mint_enabled: Option<bool>,
    pub redeem_enabled: Option<bool>,
}

pub fn handler(
    ctx: Context<ToggleFunctionalityEnabledAccounts>,
    args: ToggleFunctionalityEnabledArgs,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    if args.custodian_enabled.is_some() {
        config.custodian_enabled = args.custodian_enabled.unwrap();
    }

    if args.mint_enabled.is_some() {
        config.mint_enabled = args.mint_enabled.unwrap();
    }

    if args.redeem_enabled.is_some() {
        config.redeem_enabled = args.redeem_enabled.unwrap();
    }
    Ok(())
}
