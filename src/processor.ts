import { lookupArchive } from "@subsquid/archive-registry";
import {
  BlockHeader,
  DataHandlerContext,
  EvmBatchProcessor,
  EvmBatchProcessorFields,
  Log as _Log,
  Transaction as _Transaction
} from "@subsquid/evm-processor";
import { Store } from "@subsquid/typeorm-store";
import * as erc20 from "./abi/erc20";

export const CONTRACT_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

export const processor = new EvmBatchProcessor()
  .setDataSource({
    archive: lookupArchive("polygon"),
    chain: "https://rpc.ankr.com/polygon"
  })
  .setFinalityConfirmation(10)
  .setFields({
    log: {
      topics: true,
      data: true
    },
    transaction: {
      hash: true
    }
  })
  .addLog({
    range: { from: 47854776 },
    address: [CONTRACT_ADDRESS],
    topic0: [erc20.events.Transfer.topic],
    transaction: true
  });

export type Fields = EvmBatchProcessorFields<typeof processor>;
export type Context = DataHandlerContext<Store, Fields>;
export type Block = BlockHeader<Fields>;
export type Log = _Log<Fields>;
export type Transaction = _Transaction<Fields>;
