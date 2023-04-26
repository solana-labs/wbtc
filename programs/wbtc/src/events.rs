use anchor_lang::prelude::*;

use crate::state::{Merchant, MintRequest, RedeemRequest};

#[event]
pub struct MintEvent {
    pub req_id: u64,
    pub merchant: Pubkey,
    pub client: Pubkey,
    pub amount: u64,
    pub transaction_id: String,
    pub deposit_address: String,
    pub timestamp: u64,
    pub kind: EventKind,
}

#[event]
pub struct RedeemEvent {
    pub req_id: u64,
    pub merchant: Pubkey,
    pub amount: u64,
    pub transaction_id: String,
    pub deposit_address: String,
    pub timestamp: u64,
    pub kind: EventKind,
}

#[event]
pub struct MerchantEvent {
    pub merchant: Pubkey,
    pub merchat_info: Pubkey,
    pub state: MerchantState,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub enum MerchantState {
    Created,
    Deleted,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum EventKind {
    Created,
    Cancelled,
    Rejected,
    Approved,
}

impl MintEvent {
    pub fn create(req: &MintRequest, merch: &Merchant, kind: EventKind) -> Result<Self> {
        Ok(MintEvent {
            req_id: req.req_id,
            merchant: req.merchant,
            client: req.client_token_account,
            amount: req.amount,
            transaction_id: req.transaction_id.clone(),
            deposit_address: merch.btc_address.clone(),
            timestamp: Clock::get()?.unix_timestamp as u64,
            kind,
        })
    }
}

impl RedeemEvent {
    pub fn create(
        req: &RedeemRequest,
        merch: &Merchant,
        tx_id: String,
        kind: EventKind,
    ) -> Result<Self> {
        Ok(RedeemEvent {
            req_id: req.req_id,
            merchant: req.merchant,
            amount: req.amount,
            transaction_id: tx_id,
            deposit_address: merch.btc_address.clone(),
            timestamp: Clock::get()?.unix_timestamp as u64,
            kind,
        })
    }
}
