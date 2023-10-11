import { In } from "typeorm";
import { assertNotNull } from "@subsquid/evm-processor";
import { TypeormDatabase } from "@subsquid/typeorm-store";
import * as erc20 from "./abi/erc20";
import { Account, Transfer } from "./model";
import { Block, Context, Log, Transaction, processor } from "./processor";

processor.run(new TypeormDatabase({ supportHotBlocks: true }), async (ctx) => {
  let transfers: TransferEvent[] = [];

  for (let block of ctx.blocks) {
    for (let log of block.logs) {
      if (log.topics[0] === erc20.events.Transfer.topic) {
        transfers.push(getTransfer(ctx, log));
      }
    }
  }

  await processTransfers(ctx, transfers);
});

interface TransferEvent {
  id: string;
  block: Block;
  transaction: Transaction;
  token: string;
  from: string;
  to: string;
  amount: bigint;
}

function getTransfer(ctx: Context, log: Log): TransferEvent {
  let event = erc20.events.Transfer.decode(log);

  let from = event.from.toLowerCase();
  let to = event.to.toLowerCase();
  let amount = event.value;
  let token = log.address.toLowerCase();

  let transaction = assertNotNull(log.transaction, `Missing transaction`);

  ctx.log.debug(
    { block: log.block, txHash: transaction.hash },
    `Token ${token} transfer from ${from} to ${to} amount ${amount}`
  );

  return {
    id: log.id,
    block: log.block,
    transaction,
    token,
    from,
    to,
    amount
  };
}

async function processTransfers(ctx: Context, transfersData: TransferEvent[]) {
  let accountIds = new Set<string>();
  for (let t of transfersData) {
    accountIds.add(t.from);
    accountIds.add(t.to);
  }

  let accounts = await ctx.store
    .findBy(Account, { id: In([...accountIds]) })
    .then((q) => new Map(q.map((i) => [i.id, i])));

  let transfers: Transfer[] = [];

  for (let t of transfersData) {
    let { id, block, transaction, amount } = t;

    let from = getAccount(accounts, t.from);
    let to = getAccount(accounts, t.to);

    transfers.push(
      new Transfer({
        id,
        blockNumber: block.height,
        timestamp: new Date(block.timestamp),
        txHash: transaction.hash,
        token: t.token,
        from,
        to,
        amount
      })
    );
  }

  await ctx.store.upsert(Array.from(accounts.values()));
  await ctx.store.insert(transfers);
}

function getAccount(m: Map<string, Account>, id: string): Account {
  let acc = m.get(id);
  if (acc == null) {
    acc = new Account();
    acc.id = id;
    m.set(id, acc);
  }
  return acc;
}
