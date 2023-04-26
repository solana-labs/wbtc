use anchor_lang::prelude::*;
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

use crate::constants::CONFIG_SEED_PREFIX;
use crate::error::ErrorCode;
use crate::events::{EventKind, MintEvent};
use crate::gen_mint_seeds;
use crate::state::{Config, Merchant, MintRequest};

#[derive(Accounts)]
pub struct ApproveMintRequestAccounts<'info> {
    pub custodian: Signer<'info>,

    #[account(has_one = custodian @ ErrorCode::InvalidCustodian,
        has_one = mint @ ErrorCode::InvalidTokenMint,
    )]
    pub config: Account<'info, Config>,

    /// CHECK: checked with constraint
    #[account(mut,
        constraint = merchant.authority == merchant_authority.key() @ ErrorCode::InvalidMerchantAuthority
    )]
    pub merchant_authority: AccountInfo<'info>,

    pub merchant: Account<'info, Merchant>,

    #[account(mut,
        close = merchant_authority,
        has_one = merchant,
        has_one = client_token_account
    )]
    pub mint_request: Account<'info, MintRequest>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut, token::mint = config.mint)]
    pub client_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ApproveMintRequestAccounts>) -> Result<()> {
    require!(ctx.accounts.config.mint_enabled, ErrorCode::MintingDisabled);
    require!(
        ctx.accounts.config.custodian_enabled,
        ErrorCode::CustodianDisabled
    );

    let amount = ctx.accounts.mint_request.amount;

    let seeds = gen_mint_seeds!(ctx.accounts.config);

    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.client_token_account.to_account_info(),
        authority: ctx.accounts.config.to_account_info(),
    };

    msg!("before mint");
    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            &[seeds],
        ),
        amount,
    )?;
    msg!("after mint");
    emit!(MintEvent::create(
        &ctx.accounts.mint_request,
        &ctx.accounts.merchant,
        EventKind::Approved
    )?);
    Ok(())
}
