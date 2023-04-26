use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::constants::MINT_REQUEST_SEED_PREFIX;
use crate::error::ErrorCode;
use crate::events::{EventKind, MintEvent};
use crate::state::{Config, Merchant, MintRequest};
use crate::utils::validate_btc_transaction;

#[derive(Accounts)]
#[instruction(args: CreateMintRequestArgs)]
pub struct CreateMintRequestAccounts<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(has_one = authority @ ErrorCode::InvalidMerchantAuthority)]
    pub merchant_info: Account<'info, Merchant>,

    #[account(init,
        seeds = [ MINT_REQUEST_SEED_PREFIX.as_ref(), config.mint_req_counter.to_le_bytes().as_ref()],
        space = 8 + MintRequest::LEN,
        bump,
        payer = authority
    )]
    pub mint_request: Account<'info, MintRequest>,

    #[account(mut)]
    pub config: Account<'info, Config>,

    #[account(token::mint = config.mint)]
    pub client_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub struct CreateMintRequestArgs {
    pub transaction_id: String,
    pub amount: u64,
}

pub fn handler(ctx: Context<CreateMintRequestAccounts>, args: CreateMintRequestArgs) -> Result<()> {
    let mint_request = &mut ctx.accounts.mint_request;
    let config = &mut ctx.accounts.config;
    let merchant = &ctx.accounts.merchant_info;

    require!(config.mint_enabled, ErrorCode::MintingDisabled);
    require!(merchant.enabled, ErrorCode::MerchantDisabled);

    validate_btc_transaction(&args.transaction_id)?;

    mint_request.merchant = merchant.key();
    mint_request.amount = args.amount;
    mint_request.transaction_id = args.transaction_id;
    mint_request.client_token_account = ctx.accounts.client_token_account.key();
    mint_request.req_id = config.mint_req_counter;

    config.mint_req_counter = config.mint_req_counter.checked_add(1).unwrap();

    emit!(MintEvent::create(
        mint_request,
        merchant,
        EventKind::Created
    )?);

    Ok(())
}
