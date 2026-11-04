// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {QuotaGrid} from "../src/QuotaGrid.sol";

contract DeployScript is Script {
    function run() external returns (QuotaGrid grid) {
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        uint16 feeBps = 250; // 2.5% protocol fee

        vm.startBroadcast();
        grid = new QuotaGrid(operator, feeBps);
        vm.stopBroadcast();

        console2.log("QuotaGrid deployed at:", address(grid));
        console2.log("Operator:", operator);
        console2.log("Fee Bps:", feeBps);
    }
}
