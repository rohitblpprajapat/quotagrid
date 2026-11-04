export declare const quotaGridAbi: readonly [{
    readonly type: "constructor";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "operator";
    }, {
        readonly type: "uint16";
        readonly name: "feeBps";
    }];
}, {
    readonly name: "owner";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "operator";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "feeBps";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint16";
    }];
}, {
    readonly name: "RECLAIM_DELAY";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint64";
    }];
}, {
    readonly name: "listingCount";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "requestCount";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "balances";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "address";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "protocolFees";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "getListing";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "id";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "address";
            readonly name: "seller";
        }, {
            readonly type: "string";
            readonly name: "provider";
        }, {
            readonly type: "string";
            readonly name: "model";
        }, {
            readonly type: "uint256";
            readonly name: "pricePerKToken";
        }, {
            readonly type: "uint256";
            readonly name: "quotaTotal";
        }, {
            readonly type: "uint256";
            readonly name: "quotaUsed";
        }, {
            readonly type: "uint256";
            readonly name: "quotaLocked";
        }, {
            readonly type: "bool";
            readonly name: "active";
        }, {
            readonly type: "bytes";
            readonly name: "encryptedKey";
        }];
    }];
}, {
    readonly name: "getRequest";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "id";
    }];
    readonly outputs: readonly [{
        readonly type: "tuple";
        readonly components: readonly [{
            readonly type: "uint256";
            readonly name: "listingId";
        }, {
            readonly type: "address";
            readonly name: "buyer";
        }, {
            readonly type: "uint256";
            readonly name: "tMax";
        }, {
            readonly type: "uint256";
            readonly name: "deposit";
        }, {
            readonly type: "bytes32";
            readonly name: "promptHash";
        }, {
            readonly type: "uint64";
            readonly name: "openedAt";
        }, {
            readonly type: "uint8";
            readonly name: "status";
        }, {
            readonly type: "uint256";
            readonly name: "tUsed";
        }];
    }];
}, {
    readonly name: "quote";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "listingId";
    }, {
        readonly type: "uint256";
        readonly name: "tokens";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "available";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "listingId";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "createListing";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "string";
        readonly name: "provider";
    }, {
        readonly type: "string";
        readonly name: "model";
    }, {
        readonly type: "uint256";
        readonly name: "pricePerKToken";
    }, {
        readonly type: "uint256";
        readonly name: "quota";
    }, {
        readonly type: "bytes";
        readonly name: "encryptedKey";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "updateListing";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "id";
    }, {
        readonly type: "uint256";
        readonly name: "pricePerKToken";
    }, {
        readonly type: "uint256";
        readonly name: "addQuota";
    }, {
        readonly type: "bool";
        readonly name: "active";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "openRequest";
    readonly type: "function";
    readonly stateMutability: "payable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "listingId";
    }, {
        readonly type: "uint256";
        readonly name: "tMax";
    }, {
        readonly type: "bytes32";
        readonly name: "promptHash";
    }];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "settle";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "requestId";
    }, {
        readonly type: "uint256";
        readonly name: "tUsed";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "cancel";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "requestId";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "reclaim";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "requestId";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "withdraw";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [];
    readonly outputs: readonly [];
}, {
    readonly name: "withdrawFees";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "to";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "setOperator";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "op";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "setFeeBps";
    readonly type: "function";
    readonly stateMutability: "nonpayable";
    readonly inputs: readonly [{
        readonly type: "uint16";
        readonly name: "bps";
    }];
    readonly outputs: readonly [];
}, {
    readonly name: "ListingCreated";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "listingId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "seller";
        readonly indexed: true;
    }, {
        readonly type: "string";
        readonly name: "provider";
    }, {
        readonly type: "string";
        readonly name: "model";
    }, {
        readonly type: "uint256";
        readonly name: "pricePerKToken";
    }, {
        readonly type: "uint256";
        readonly name: "quota";
    }];
}, {
    readonly name: "ListingUpdated";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "listingId";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "pricePerKToken";
    }, {
        readonly type: "uint256";
        readonly name: "quotaTotal";
    }, {
        readonly type: "bool";
        readonly name: "active";
    }];
}, {
    readonly name: "RequestOpened";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "requestId";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "listingId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "buyer";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "tMax";
    }, {
        readonly type: "uint256";
        readonly name: "deposit";
    }, {
        readonly type: "bytes32";
        readonly name: "promptHash";
    }];
}, {
    readonly name: "RequestSettled";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "requestId";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "tUsed";
    }, {
        readonly type: "uint256";
        readonly name: "sellerPayout";
    }, {
        readonly type: "uint256";
        readonly name: "fee";
    }, {
        readonly type: "uint256";
        readonly name: "refund";
    }];
}, {
    readonly name: "RequestCancelled";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "requestId";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "refund";
    }];
}, {
    readonly name: "Withdrawn";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "seller";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "amount";
    }];
}];
//# sourceMappingURL=abi.d.ts.map