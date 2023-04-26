use anchor_lang::prelude::*;

use crate::constants::MERCHANT_SEED_PREFIX;
use crate::error::ErrorCode;
use crate::state::{Config, Merchant};
use crate::utils::validate_btc_address;

#[derive(Accounts)]
#[instruction(args: CreateMerchantArgs)]
pub struct CreateMerchantAccounts<'info> {
    #[account(mut)]
    pub merchant_authority: Signer<'info>,

    #[account(has_one = merchant_authority @ ErrorCode::InvalidAuthority)]
    pub config: Account<'info, Config>,

    #[account(init,
        seeds = [ MERCHANT_SEED_PREFIX.as_ref(), args.merchant.as_ref()],
        space = 8 + Merchant::LEN,
        bump,
        payer = merchant_authority
    )]
    pub merchant_info: Account<'info, Merchant>,

    pub system_program: Program<'info, System>,
}

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub struct CreateMerchantArgs {
    pub merchant: Pubkey,
    pub merchant_btc_address: String,
}

pub fn handler(ctx: Context<CreateMerchantAccounts>, args: CreateMerchantArgs) -> Result<()> {
    let merchant = &mut ctx.accounts.merchant_info;

    validate_btc_address(&args.merchant_btc_address)?;

    merchant.authority = args.merchant;
    merchant.btc_address = args.merchant_btc_address;

    Ok(())
}
