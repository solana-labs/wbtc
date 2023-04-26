use anchor_lang::prelude::*;

use crate::constants::BTC_ADDRESS_MAX_LEN;
use crate::constants::BTC_ADDRESS_MIN_LEN;
use crate::constants::BTC_TRANSACTION_LEN;
use crate::error::ErrorCode;

pub fn validate_btc_address(address: &String) -> Result<()> {
    msg!("len {}", address.len());
    require!(
        address.len() <= BTC_ADDRESS_MAX_LEN,
        ErrorCode::AddressTooLong
    );
    require!(
        address.len() >= BTC_ADDRESS_MIN_LEN,
        ErrorCode::AddressTooShort
    );
    Ok(())
}

pub fn validate_btc_transaction(transaction: &String) -> Result<()> {
    msg!("len {}", transaction.len());
    require!(
        transaction.len() == BTC_TRANSACTION_LEN,
        ErrorCode::InvalidTransactionLength
    );
    Ok(())
}
