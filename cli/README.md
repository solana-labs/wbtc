# CLI APP

This is a small CLI to initialise and interact with the wbtc contract.

# Instructions

## Installation

To install run `yarn install`.

To open the app `ts-node src/cli.ts` 

## Commands

Commands are trivially executed just following the CLI `ts-node src/cli.ts --help` output.
Be mindful when a given command can only be executed using a given authority or authorised merchant.

Important note: on initialize, the authorities that are related to the small and big DAOs (authority and merchant authority), those are the signing authorities of the Squads multisigs. If initialized with the multisig account instead, access is lost to the contract and an upgrade is necessary to fix. Everywhere else, the multisig address expected is the actual multisig account hidden on the squads info menu.