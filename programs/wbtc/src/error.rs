use anchor_lang::prelude::*;

#[error_code]
#[derive(PartialEq, Eq)]
pub enum ErrorCode {
    #[msg("invalid authority")]
    InvalidAuthority,
    #[msg("invalid custodian")]
    InvalidCustodian,
    #[msg("invalid merchant")]
    InvalidMerchantAuthority,
    #[msg("invalid merchant")]
    InvalidMerchant,
    #[msg("invalid token mint")]
    InvalidTokenMint,
    #[msg("minting has been disabled")]
    MintingDisabled,
    #[msg("redeeming has been disabled")]
    RedeemingDisabled,
    #[msg("the custodian has been disabled")]
    CustodianDisabled,
    #[msg("the merchant has been disabled")]
    MerchantDisabled,
    #[msg("disabled")]
    Disabled,
    #[msg("the length of the transaction is invalid")]
    InvalidTransactionLength,
    #[msg("the given address length is too long for a btc address (>62 characters)")]
    AddressTooLong,
    #[msg("the given address length is too short for a btc address (<26 characters)")]
    AddressTooShort,
    #[msg("invalid reamining accounts on initialise")]
    InvalidInitialiseRemainingAccounts,
    #[msg("invalid token amount")]
    InvalidAmount,
}
