use anchor_lang::prelude::*;
use anchor_spl::token::{burn, Burn, Mint, Token, TokenAccount};

use crate::constants::REDEEM_REQUEST_SEED_PREFIX;
use crate::error::ErrorCode;
use crate::events::{EventKind, RedeemEvent};
use crate::state::{Config, Merchant, RedeemRequest};

#[derive(Accounts)]
#[instruction(args: CreateRedeemRequestArgs)]
pub struct CreateRedeemRequestAccounts<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(has_one = authority @ ErrorCode::InvalidMerchantAuthority)]
    pub merchant_info: Account<'info, Merchant>,

    #[account(init,
        seeds = [ REDEEM_REQUEST_SEED_PREFIX.as_ref(), config.redeem_req_counter.to_le_bytes().as_ref() ],
        space = 8 + RedeemRequest::LEN,
        bump,
        payer = authority
    )]
    pub redeem_request: Account<'info, RedeemRequest>,

    #[account(mut, has_one = mint @ ErrorCode::InvalidTokenMint)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut, token::mint = config.mint)]
    pub token_source: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,
}

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub struct CreateRedeemRequestArgs {
    pub amount: u64,
}

pub fn handler(
    ctx: Context<CreateRedeemRequestAccounts>,
    args: CreateRedeemRequestArgs,
) -> Result<()> {
    let redeem_request = &mut ctx.accounts.redeem_request;
    let config = &mut ctx.accounts.config;
    let merchant = &ctx.accounts.merchant_info;

    require!(config.redeem_enabled, ErrorCode::RedeemingDisabled);
    require!(merchant.enabled, ErrorCode::MerchantDisabled);
    require!(
        args.amount > 0 && args.amount <= ctx.accounts.token_source.amount,
        ErrorCode::InvalidAmount
    );

    redeem_request.amount = args.amount;
    redeem_request.merchant = ctx.accounts.merchant_info.key();
    redeem_request.timestamp = Clock::get()?.unix_timestamp as u64;
    redeem_request.req_id = config.redeem_req_counter;

    config.redeem_req_counter = config.redeem_req_counter.checked_add(1).unwrap();

    let amount = args.amount;

    let cpi_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
        from: ctx.accounts.token_source.to_account_info(),
    };

    burn(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
        amount,
    )?;

    emit!(RedeemEvent::create(
        redeem_request,
        merchant,
        String::default(),
        EventKind::Created
    )?);

    Ok(())
}
