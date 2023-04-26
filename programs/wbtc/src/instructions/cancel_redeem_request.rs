use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token, MintTo, Mint, mint_to};

use crate::error::ErrorCode;
use crate::constants::CONFIG_SEED_PREFIX;
use crate::events::{RedeemEvent, EventKind};
use crate::gen_mint_seeds;
use crate::state::{Merchant, RedeemRequest, Config};

#[derive(Accounts)]
pub struct CancelRedeemRequestAccounts<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(has_one = authority @ ErrorCode::InvalidMerchantAuthority)]
    pub merchant: Account<'info, Merchant>,

    #[account(mut, 
        has_one = merchant @ ErrorCode::InvalidMerchant,
        close = authority
    )]
    pub mint_request: Account<'info, RedeemRequest>,

    #[account(mut, has_one = mint @ ErrorCode::InvalidTokenMint)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(token::mint = config.mint)]
    pub token_destination: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}


pub fn handler(ctx: Context<CancelRedeemRequestAccounts>) -> Result<()> {
    require!(ctx.accounts.config.redeem_enabled, ErrorCode::RedeemingDisabled);
    require!(ctx.accounts.merchant.enabled, ErrorCode::MerchantDisabled);

/// TODO: DISCUSS IF THIS EVENT MAKES SENSE OR NOT
/// given the asynchronity of the whole process, and how calling `approve_redeem_request`
/// is dependent on the btc transaction being made before
/// means a badly intentioned merchant could cancel redeem after the custodian issued the btc transaction
/// in other words, this instruction requires more trust between custodian & merchant than what is expected
    require!(false, ErrorCode::Disabled);

    let amount = ctx.accounts.mint_request.amount;

    let seeds = gen_mint_seeds!(ctx.accounts.config);

    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.token_destination.to_account_info(),
        authority: ctx.accounts.config.to_account_info(),
    };

    mint_to(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, &[seeds]), amount)?;

    emit!(RedeemEvent::create(&ctx.accounts.mint_request, &ctx.accounts.merchant, String::default(), EventKind::Cancelled)?);
    Ok(())
}
