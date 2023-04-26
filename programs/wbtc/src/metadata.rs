use anchor_lang::prelude::*;

use mpl_token_metadata::ID;

#[derive(Clone)]
pub struct MetadataProgram;

impl anchor_lang::Id for MetadataProgram {
    fn id() -> Pubkey {
        ID
    }
}
