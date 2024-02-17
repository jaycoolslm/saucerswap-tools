const { ContractId, TokenId } = require("@hashgraph/sdk");
const ethers = require("ethers");
const abi = [
  "function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut, uint160[] memory sqrtPriceX96AfterList, uint32[] memory initializedTicksCrossedList, uint256 gasEstimate)",
];

const abiInterfaces = new ethers.Interface(abi);

const message = {
  paths: [
    {
      tokens: ["0.0.731861", "0.0.456858"],
      fees: ["3000"],
    },
    {
      tokens: ["0.0.731861", "0.0.1456986", "0.0.456858"],
      fees: ["3000", "1500"],
    },
  ],
  inputAmount: 70000000,
};

const inputAmount = message.inputAmount;

main()
  .then((bestPathResult) => {
    console.log("Best path result:", bestPathResult);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

async function main() {
  const provider = new ethers.JsonRpcProvider(
    "https://mainnet.hashio.io/api",
    "",
    {
      batchMaxCount: 1, // workaround for V6
    }
  );

  let bestOutputAmount = 0;
  let bestPathIndex = -1;

  for (let i = 0; i < message.paths.length; i++) {
    let path = message.paths[i];
    let pathHexData = createPathHexData(path);
    let encodedPathData = hexStringToUint8Array(pathHexData);
    let quoteExactInputFcnData = abiInterfaces.encodeFunctionData(
      "quoteExactInput",
      [encodedPathData, inputAmount.toString()]
    );

    console.log(`Executing quote function for path ${i + 1}...`);
    let result = await provider.call({
      to: `0x${ContractId.fromString("0.0.3949424").toSolidityAddress()}`,
      data: quoteExactInputFcnData,
    });

    let decoded = abiInterfaces.decodeFunctionResult("quoteExactInput", result);
    let outputAmount = decoded.amountOut;

    console.log(`Output amount for path ${i + 1}: `, outputAmount.toString());

    if (outputAmount > bestOutputAmount) {
      bestOutputAmount = outputAmount;
      bestPathIndex = i;
    }
  }

  return {
    bestPath: message.paths[bestPathIndex],
    bestOutputAmount: bestOutputAmount.toString(),
  };
}

function createPathHexData(path) {
  let pathHexData = "";
  for (let i = 0; i < path.tokens.length; i++) {
    const token = TokenId.fromString(path.tokens[i]);
    pathHexData += token.toSolidityAddress();
    if (i < path.fees.length) {
      const feeHexStr = feeToHexString(path.fees[i]).slice(2);
      pathHexData += feeHexStr;
    }
  }
  return pathHexData;
}

function hexStringToUint8Array(hexString) {
  if (hexString.length % 2 !== 0) {
    throw "Invalid hexString";
  }
  var arrayBuffer = new Uint8Array(hexString.length / 2);

  for (var i = 0; i < hexString.length; i += 2) {
    var byteValue = parseInt(hexString.substr(i, 2), 16);
    if (isNaN(byteValue)) {
      throw "Invalid hexString";
    }
    arrayBuffer[i / 2] = byteValue;
  }

  return arrayBuffer;
}

function feeToHexString(fee) {
  let feeBigNumber = BigInt(fee);
  let hex = ethers.toBeHex(feeBigNumber, 3);
  return hex;
}
