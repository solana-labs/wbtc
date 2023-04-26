use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::Merchant;
use crate::utils::validate_btc_address;

#[derive(Accounts)]
pub struct SetMerchantBtcAddressAccounts<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut, has_one = authority @ ErrorCode::InvalidMerchantAuthority)]
    pub merchant: Account<'info, Merchant>,
}

pub fn handler(
    ctx: Context<SetMerchantBtcAddressAccounts>,
    new_merchant_btc_addresss: String,
) -> Result<()> {
    validate_btc_address(&new_merchant_btc_addresss)?;

    ctx.accounts.merchant.btc_address = new_merchant_btc_addresss;

    Ok(())
}
