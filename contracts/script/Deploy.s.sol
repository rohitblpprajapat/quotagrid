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
        // D-031: reimburse the operator's settle gas. settle ~139k-180k gas, sent with estimate*1.2 limit, at 102 gwei
        // (live eth_gasPrice 2026-11-04) = 0.017-0.022 MON. Owner can change it with setSettleFee.
        uint256 settleFee = vm.envOr("SETTLE_FEE_WEI", uint256(0.025 ether));
        grid.setSettleFee(settleFee);
        vm.stopBroadcast();

        console2.log("QuotaGrid deployed at:", address(grid));
        console2.log("Operator:", operator);
        console2.log("Fee Bps:", feeBps);
        console2.log("Settle fee (wei):", grid.settleFee());
    }
}
