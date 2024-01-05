import "dotenv/config";

import { JsonRpcProvider, ethers } from "ethers";

import { promises as fs } from "fs";

const keys = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => key.startsWith("RPC")));

const userToSearch = process.argv[2];

const getMetadata = async (provider: JsonRpcProvider, address: string) => {
  const balance = await provider.getBalance(address);
  const transactionCount = await provider.getTransactionCount(address);
  const code = await provider.getCode(address);

  return { balance, transactionCount, code, timestamp: Date.now() };
};

const createCSV = async <T extends {}>(file: string, data: T) => {
  const headers = Object.keys(data);
  await fs.writeFile(file, `${headers.join(",")}`);
};

const writeToCSV = async <T extends {}>(file: string, data: T) => {
  if (!(await fs.stat(file).catch(() => false))) {
    await createCSV(file, data);
  }
  const fileHeaders = (await fs.readFile(file, "utf8")).split("\n")[0].split(",") as unknown as (keyof T)[];

  const headers = Object.keys(data);

  if (fileHeaders.length !== headers.length) {
    throw new Error(`Headers length mismatch. Expected ${fileHeaders.length} got ${headers.length}`);
  }

  if (fileHeaders.some((header, index) => header !== headers[index])) {
    throw new Error(`Headers mismatch. Expected ${fileHeaders} got ${headers}`);
  }

  await fs.appendFile(file, `\n${fileHeaders.map((k) => data[k]).join(",")}`);
};

(async () => {
  for (const key in keys) {
    const provider = new ethers.JsonRpcProvider(keys[key]);
    const metadata = await getMetadata(provider, userToSearch);
    await writeToCSV("output.csv", { ...metadata, chain: key.replace("RPC_", "") });
  }
})();
