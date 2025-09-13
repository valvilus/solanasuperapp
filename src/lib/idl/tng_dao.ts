/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/tng_dao.json`.
 */
export type TngDao = {
  "address": "HbDYHpNrayUvx5z4m81QRaQR7iLapK5Co7eW27Zn2ZYh",
  "metadata": {
    "name": "tngDao",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "TNG DAO - Decentralized Governance for TNG Ecosystem"
  },
  "instructions": [
    {
      "name": "createProposal",
      "docs": [
        "Create a new governance proposal"
      ],
      "discriminator": [
        132,
        116,
        68,
        174,
        216,
        160,
        198,
        22
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "daoConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  111,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "dao_config.total_proposals",
                "account": "daoConfig"
              }
            ]
          }
        },
        {
          "name": "creatorTngAccount"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "actions",
          "type": {
            "vec": {
              "defined": {
                "name": "proposalAction"
              }
            }
          }
        }
      ]
    },
    {
      "name": "executeAction",
      "docs": [
        "Execute a specific action from a passed proposal"
      ],
      "discriminator": [
        246,
        137,
        105,
        113,
        247,
        6,
        223,
        174
      ],
      "accounts": [
        {
          "name": "executor",
          "signer": true
        },
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "proposal.id",
                "account": "proposal"
              }
            ]
          }
        },
        {
          "name": "daoConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  111,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "actionIndex",
          "type": "u8"
        }
      ]
    },
    {
      "name": "finalizeProposal",
      "docs": [
        "Finalize a proposal after voting period ends"
      ],
      "discriminator": [
        23,
        68,
        51,
        167,
        109,
        173,
        187,
        164
      ],
      "accounts": [
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "proposal.id",
                "account": "proposal"
              }
            ]
          }
        },
        {
          "name": "daoConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  111,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "fundTreasury",
      "docs": [
        "Fund the DAO treasury"
      ],
      "discriminator": [
        71,
        154,
        45,
        220,
        206,
        32,
        174,
        239
      ],
      "accounts": [
        {
          "name": "funder",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasuryTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "funderTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeDao",
      "docs": [
        "Initialize the DAO configuration"
      ],
      "discriminator": [
        128,
        226,
        96,
        90,
        39,
        56,
        24,
        196
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "daoConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  111,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "daoConfig"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tngMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tngMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "votingDuration",
          "type": "u64"
        },
        {
          "name": "executionDelay",
          "type": "u64"
        },
        {
          "name": "quorumThreshold",
          "type": "u64"
        },
        {
          "name": "proposalThreshold",
          "type": "u64"
        }
      ]
    },
    {
      "name": "vote",
      "docs": [
        "Cast a vote on a proposal"
      ],
      "discriminator": [
        227,
        110,
        155,
        23,
        136,
        126,
        172,
        25
      ],
      "accounts": [
        {
          "name": "voter",
          "writable": true,
          "signer": true
        },
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "proposal.id",
                "account": "proposal"
              }
            ]
          }
        },
        {
          "name": "voteRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "voter"
              },
              {
                "kind": "account",
                "path": "proposal"
              }
            ]
          }
        },
        {
          "name": "voterTngAccount"
        },
        {
          "name": "daoConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  111,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "choice",
          "type": {
            "defined": {
              "name": "voteChoice"
            }
          }
        },
        {
          "name": "weight",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "daoConfig",
      "discriminator": [
        213,
        84,
        208,
        52,
        106,
        144,
        215,
        198
      ]
    },
    {
      "name": "proposal",
      "discriminator": [
        26,
        94,
        189,
        187,
        116,
        136,
        53,
        33
      ]
    },
    {
      "name": "voteRecord",
      "discriminator": [
        112,
        9,
        123,
        165,
        234,
        9,
        157,
        167
      ]
    }
  ],
  "events": [
    {
      "name": "actionExecutedEvent",
      "discriminator": [
        26,
        208,
        150,
        242,
        244,
        40,
        227,
        100
      ]
    },
    {
      "name": "proposalCreatedEvent",
      "discriminator": [
        154,
        240,
        33,
        66,
        194,
        233,
        203,
        209
      ]
    },
    {
      "name": "proposalFinalizedEvent",
      "discriminator": [
        228,
        151,
        231,
        28,
        58,
        215,
        17,
        130
      ]
    },
    {
      "name": "treasuryFundedEvent",
      "discriminator": [
        139,
        216,
        173,
        85,
        124,
        204,
        14,
        80
      ]
    },
    {
      "name": "voteCastEvent",
      "discriminator": [
        241,
        151,
        159,
        134,
        250,
        234,
        71,
        234
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAmount",
      "msg": "Invalid amount: must be greater than 0"
    },
    {
      "code": 6001,
      "name": "insufficientTngForProposal",
      "msg": "Insufficient TNG balance to create proposal"
    },
    {
      "code": 6002,
      "name": "titleTooLong",
      "msg": "Proposal title too long (max 100 characters)"
    },
    {
      "code": 6003,
      "name": "descriptionTooLong",
      "msg": "Proposal description too long (max 1000 characters)"
    },
    {
      "code": 6004,
      "name": "noActionsProvided",
      "msg": "No actions provided in proposal"
    },
    {
      "code": 6005,
      "name": "tooManyActions",
      "msg": "Too many actions in proposal (max 10)"
    },
    {
      "code": 6006,
      "name": "proposalNotActive",
      "msg": "Proposal is not active"
    },
    {
      "code": 6007,
      "name": "votingPeriodEnded",
      "msg": "Voting period has ended"
    },
    {
      "code": 6008,
      "name": "votingPeriodNotEnded",
      "msg": "Voting period has not ended yet"
    },
    {
      "code": 6009,
      "name": "insufficientVotingPower",
      "msg": "Insufficient voting power"
    },
    {
      "code": 6010,
      "name": "invalidVoteWeight",
      "msg": "Invalid vote weight"
    },
    {
      "code": 6011,
      "name": "alreadyVoted",
      "msg": "User has already voted on this proposal"
    },
    {
      "code": 6012,
      "name": "proposalNotPassed",
      "msg": "Proposal has not passed"
    },
    {
      "code": 6013,
      "name": "executionDelayNotPassed",
      "msg": "Execution delay has not passed"
    },
    {
      "code": 6014,
      "name": "invalidActionIndex",
      "msg": "Invalid action index"
    },
    {
      "code": 6015,
      "name": "actionAlreadyExecuted",
      "msg": "Action already executed"
    },
    {
      "code": 6016,
      "name": "mathOverflow",
      "msg": "Mathematical overflow occurred"
    }
  ],
  "types": [
    {
      "name": "actionExecutedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proposalId",
            "type": "u64"
          },
          {
            "name": "actionIndex",
            "type": "u8"
          },
          {
            "name": "executor",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "daoConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "tngMint",
            "type": "pubkey"
          },
          {
            "name": "votingDuration",
            "type": "u64"
          },
          {
            "name": "executionDelay",
            "type": "u64"
          },
          {
            "name": "quorumThreshold",
            "type": "u64"
          },
          {
            "name": "proposalThreshold",
            "type": "u64"
          },
          {
            "name": "totalProposals",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "daoConfigUpdate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "votingDuration",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "executionDelay",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "quorumThreshold",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "proposalThreshold",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "poolType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "staking"
          },
          {
            "name": "farming"
          },
          {
            "name": "swap"
          },
          {
            "name": "lending"
          }
        ]
      }
    },
    {
      "name": "proposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "actions",
            "type": {
              "vec": {
                "defined": {
                  "name": "proposalAction"
                }
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "proposalStatus"
              }
            }
          },
          {
            "name": "votesFor",
            "type": "u64"
          },
          {
            "name": "votesAgainst",
            "type": "u64"
          },
          {
            "name": "votesAbstain",
            "type": "u64"
          },
          {
            "name": "votingPowerSnapshot",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "votingEndsAt",
            "type": "i64"
          },
          {
            "name": "executionEta",
            "type": "i64"
          },
          {
            "name": "executedActions",
            "type": {
              "vec": "bool"
            }
          }
        ]
      }
    },
    {
      "name": "proposalAction",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "updateStakingApy",
            "fields": [
              {
                "name": "newApy",
                "type": "u16"
              }
            ]
          },
          {
            "name": "updateFarmingRewardRate",
            "fields": [
              {
                "name": "newRate",
                "type": "u64"
              }
            ]
          },
          {
            "name": "pausePool",
            "fields": [
              {
                "name": "poolType",
                "type": {
                  "defined": {
                    "name": "poolType"
                  }
                }
              }
            ]
          },
          {
            "name": "treasuryTransfer",
            "fields": [
              {
                "name": "recipient",
                "type": "pubkey"
              },
              {
                "name": "amount",
                "type": "u64"
              }
            ]
          },
          {
            "name": "updateDaoConfig",
            "fields": [
              {
                "name": "newConfig",
                "type": {
                  "defined": {
                    "name": "daoConfigUpdate"
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "proposalCreatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proposalId",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "actionsCount",
            "type": "u8"
          },
          {
            "name": "votingEndsAt",
            "type": "i64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "proposalFinalizedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proposalId",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "proposalStatus"
              }
            }
          },
          {
            "name": "votesFor",
            "type": "u64"
          },
          {
            "name": "votesAgainst",
            "type": "u64"
          },
          {
            "name": "votesAbstain",
            "type": "u64"
          },
          {
            "name": "executionEta",
            "type": "i64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "proposalStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "passed"
          },
          {
            "name": "rejected"
          },
          {
            "name": "executed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "treasuryFundedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "funder",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "voteCastEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proposalId",
            "type": "u64"
          },
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "choice",
            "type": {
              "defined": {
                "name": "voteChoice"
              }
            }
          },
          {
            "name": "weight",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "voteChoice",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "for"
          },
          {
            "name": "against"
          },
          {
            "name": "abstain"
          }
        ]
      }
    },
    {
      "name": "voteRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "proposal",
            "type": "pubkey"
          },
          {
            "name": "choice",
            "type": {
              "defined": {
                "name": "voteChoice"
              }
            }
          },
          {
            "name": "weight",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
