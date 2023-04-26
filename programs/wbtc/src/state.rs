use anchor_lang::prelude::*;

static_assertions::const_assert!(Config::LEN > std::mem::size_of::<Config>());
#[account]
#[derive(Debug)]
pub struct Config {
    pub authority: Pubkey,
    pub merchant_authority: Pubkey,
    pub custodian: Pubkey,
    pub custodian_btc_address: String,
    pub mint: Pubkey,
    pub mint_req_counter: u64,
    pub redeem_req_counter: u64,
    pub mint_enabled: bool,
    pub redeem_enabled: bool,
    pub custodian_enabled: bool,
    pub bump: u8,
}

static_assertions::const_assert!(Merchant::LEN > std::mem::size_of::<Merchant>());
#[account]
#[derive(Debug)]
pub struct Merchant {
    pub authority: Pubkey,
    pub btc_address: String,
    pub enabled: bool,
}

static_assertions::const_assert!(MintRequest::LEN > std::mem::size_of::<MintRequest>());
#[account]
#[derive(Debug)]
pub struct MintRequest {
    pub req_id: u64,
    pub merchant: Pubkey,
    pub client_token_account: Pubkey,
    pub timestamp: u64,
    pub amount: u64,
    pub transaction_id: String,
}

static_assertions::const_assert_eq!(RedeemRequest::LEN, std::mem::size_of::<RedeemRequest>());
#[account]
#[derive(Debug)]
pub struct RedeemRequest {
    pub req_id: u64,
    pub merchant: Pubkey,
    pub amount: u64,
    pub timestamp: u64,
}

impl Config {
    pub const LEN: usize = 4 * 32 + 128 + 2 * 8 + 3;
}

impl Merchant {
    pub const LEN: usize = 32 + 128 + 1;
}

impl MintRequest {
    pub const LEN: usize = 3 * 32 + 128 + 3 * 8 + 128;
}

impl RedeemRequest {
    pub const LEN: usize = 32 + 3 * 8;
}
