use crate::metadata::MetadataProgram;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{Mint, Token};

use crate::error::ErrorCode;
#[cfg(not(feature = "localnet"))]
use crate::program::Wbtc;

use crate::gen_mint_seeds;
use crate::utils::validate_btc_address;
use crate::{constants::CONFIG_SEED_PREFIX, constants::MINT_SEED_PREFIX, state::Config};

#[derive(Accounts)]
#[instruction(args: InitializeArgs)]
pub struct InitializeAccounts<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(init,
        seeds = [ CONFIG_SEED_PREFIX.as_ref() ],
        bump,
        space = 8 + Config::LEN,
        payer = authority,
    )]
    pub config: Account<'info, Config>,

    #[account(init,
        seeds = [ MINT_SEED_PREFIX.as_ref(), config.key().as_ref() ],
        bump,
        mint::authority = config,
        mint::decimals = args.decimals,
        payer = authority
    )]
    pub mint: Account<'info, Mint>,

    /// CHECK: checked on cpi
    #[account(mut)]
    pub metadata: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,

    pub token_metadata_program: Program<'info, MetadataProgram>,
}

#[derive(Debug, Clone, AnchorDeserialize, AnchorSerialize)]
pub struct InitializeArgs {
    pub decimals: u8,
    pub authority: Pubkey,
    pub merchant_authority: Pubkey,
    pub custodian: Pubkey,
    pub custodian_btc_address: String,
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

pub fn handler(ctx: Context<InitializeAccounts>, args: InitializeArgs) -> Result<()> {
    let cfg = &mut ctx.accounts.config;

    validate_btc_address(&args.custodian_btc_address)?;

    validate_upgrade_authority(ctx.accounts.authority.key(), ctx.remaining_accounts)?;

    require!(
        ctx.accounts.authority.key() != args.custodian,
        ErrorCode::InvalidNewCustodian
    );
    require!(
        args.authority != args.custodian,
        ErrorCode::InvalidNewAuthority
    );

    cfg.authority = ctx.accounts.authority.key();
    cfg.new_authority = args.authority;
    cfg.custodian = args.custodian;
    cfg.custodian_btc_address = args.custodian_btc_address;
    cfg.merchant_authority = args.merchant_authority;
    cfg.mint = ctx.accounts.mint.key();
    cfg.mint_req_counter = 0;
    cfg.redeem_req_counter = 0;
    cfg.bump = ctx.bumps["config"];

    let seeds = gen_mint_seeds!(cfg);

    let ix = mpl_token_metadata::instruction::create_metadata_accounts_v3(
        ctx.accounts.token_metadata_program.key(),
        ctx.accounts.metadata.key(),
        ctx.accounts.mint.key(),
        ctx.accounts.config.key(),
        ctx.accounts.authority.key(),
        ctx.accounts.config.key(),
        args.name,
        args.symbol,
        args.uri,
        None,
        0,
        true,
        true,
        None,
        None,
        None,
    );

    invoke_signed(
        &ix,
        &[
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.config.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.config.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        &[seeds],
    )?;

    Ok(())
}

#[cfg(not(feature = "localnet"))]
fn validate_upgrade_authority(authority: Pubkey, remaining_accounts: &[AccountInfo]) -> Result<()> {
    match remaining_accounts {
        [prog, prog_data] => {
            let program: Program<Wbtc> = Program::try_from(prog)?;
            let program_data: Account<ProgramData> = Account::try_from(prog_data)?;

            require!(
                program.programdata_address()? == Some(program_data.key())
                    && program_data.upgrade_authority_address == Some(authority),
                ErrorCode::InvalidInitialiseRemainingAccounts
            );

            Ok(())
        }
        _ => err!(ErrorCode::InvalidInitialiseRemainingAccounts),
    }
}

#[cfg(feature = "localnet")]
fn validate_upgrade_authority(
    _authority: Pubkey,
    _remaining_accounts: &[AccountInfo],
) -> Result<()> {
    Ok(())
}
