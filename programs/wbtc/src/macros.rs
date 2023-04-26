#[macro_export]
macro_rules! gen_mint_seeds {
    ($config:expr) => {
        &[CONFIG_SEED_PREFIX.as_bytes(), &[$config.bump]]
    };
}
