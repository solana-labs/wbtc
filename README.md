# Summary
This is the Solana version of the WBTC contracts that enable wrapping the tokens in collaboration between merchants and a custodian 3rd party. The biggest focus of the program is to create a traceable chain of events on-chain to allow anyone to quickly be able to verify if the reserves among the custodian match the expected wrapped issuance along with matching any minting and redemtpions with their respective transactions on the native Token's chain being wrapped.

Unlike in other chains, there will be just a single _smart contract_ capable of handling all the logistics given that we can rely on Solana\`s native `Tokenkeg` program to deal with token minting/burning and `Squads` to handle the intricacies of DAO managament.

This program will have two main authorities: the `authority` is capable of changing the _authorities_ and custodian info, and the `merchant_authority` that is responsible with merchant management.

# Deployment

Devnet

program - 5t659YCpvc9cSMNtZxDY9tpa3WArKpwe1eqPBKBaa8Rx

mint - 7skMX8xAbowPpeahc4Zipgcv3cUbT88Jspz8gfeH8s6D

small dao - 49kUge8LHR6FoYEQqE7fq8UkZTE3ouLDeFeH8NmaxKBN

big dao - BoY4qapYaJpHrbpPDmhRpMwzMTWgYJhx3ZYkViEDYLts

# State

This program has four different accounts:

* Config: contains basic global info regarding the state of the program like the authorities, the token mint, whether certain functionality is enabled or disabled and information related to the custodian. There is only one config per the entire program.
* Merchant: contains wallet address and btc addresses on merchants
* MintRequest: temporary state for mint requests. Stores info on the client, merchant and amounts.
* RedeemRequest: temporary state for redeem requests. Stores info on the merchant and amounts.

# Events

In order to make indexing easier, there are two main events surrouding the main functionality of this program:

* MintEvent - Registers all the information and state changes on a given mint request. All fields are filled from the creation moment and all possible combinations of `EventKind` are used.
* RedeemEvent - Register all the information and state changes on a given redeem request. All fields but `transaction_id` are filled from the moment of creation. `transaction_id` is only filled upon calling `approve_redeem_request` by the custodian after executing the transaction. Only `Created` and `Approved` variants of the `EventKind` are used here.
# Instructions

The following instructions either create or set basic functioning paramethers:

* initialize - creates the `Config` account, and the token mint. Sets the two authorities, custodian info and mint decimals.
* create_merchant - creates a `Merchant`. Requires the merchant wallet and btc address.
* delete_merchant - deletes a `Merchant`.
* set_authority - changes the authority address.
* set_merchant_authority - changes the `merchant_authority` address.
* set_custodian_btc_address - changes the custodian btc address stored in the `Config` account.
* set_custodian - changes the wallet that the custodian can use to interact with the program.
* set_merchant_btc_address - changes the stored btc address for a given `Merchant`.

NOTE: there is no `set_merchant` as it would break the PDA assumptions on account creation. Similar functionality can be easily done by calling `delete_merchant` and `create_merchant`. 

For the intended workflow of the program, the following instructions are used:

* create_mint_request - called by a merchant and creates a `MintRequest` with basic information needed for the custodian to aprove. Issues a `MintEvent` with kind `Created`.
* approve_mint_request - called by the custodian over a given `MintRequest` that is deleted afterwards. This call will mint a number of tokens according to the information provided by the merchant on `create_mint_request`. Issues a `MintEvent` with kind `Approved`.
* cancel_mint_request - called by the merchant that created a given `MintRequest`. This will delete the `MintRequest`. Issues a `MintEvent` with kind `Deleted`.
* reject_mint_request - called by the custodian over a given `MintRequest` to reject the request and delete the account. Issues a `MintEvent` with kind `Rejected`.

* create_redeem_request - called by a merchant and creates a `RedeemRequest` with basic information needed for the custodian to return the native tokens to the merchant. The wrapped tokens are burned immediately during this instruction. Issues a `RedeemEvent` with kind `Created`.
* approve_redeem_request - called by the custodian to approve a given `RedeemRequest` and delete the temporary account afterwards. Issues a `RedeemEvent` with kind `Approved`.

Two more instructions are used to enable/disable certain functionality in the program:

* toggle_merchant_enabled - changes a given `Merchant` `enabled` flag.
* toggle_functionality_enabled - can change the following flags inside the `Config` account that will toggle the respective functionality: `mint_enabled`, `redeem_enabled`, `custodian_enabled`.

NOTE: additional cancel_redeem_request POC provided, but I think it is ultimately non-functional under this workflow.
## Permissions

The following table shows the permissions for calling each instruction:

| instruction                  | authority | merchant_authority | merchant | custodian |
| ---------------------------- | :-------: | :----------------: | :------: | :-------: |
| create_merchant              |           |          x         |          |           |
| delete_merchant              |           |          x         |          |           |
|                              |           |                    |          |           |
| create_mint_request          |           |                    |     x    |           |
| cancel_mint_request          |           |                    |     x    |           |
| approve_mint_request         |           |                    |          |     x     |
| reject_mint_request          |           |                    |          |     x     |
|                              |           |                    |          |           |
| create_redeem_request        |           |                    |     x    |           |
| approve_redeem_request       |           |                    |          |     x     |
|                              |           |                    |          |           |
| set_authority                |     x     |                    |          |           |
| set_merchant_authority       |     x     |                    |          |           |
| set_custodian                |     x     |                    |          |     x     |
| set_custodian_btc_address    |           |                    |          |     x     |
| set_merchant_btc_address     |           |                    |     x    |           |
|                              |           |                    |          |           |
| toggle_functionality_enabled |     x     |                    |          |           |
| toggle_merchant_enabled      |           |          x         |          |           |

The remaining `initialize` instruction can be called by anyone, but ideally by the person who deploys the program to setup the initial accounts properly.

# Audits

TBD