item.Eq : where [item.is_eq : item, item -> Bool]
# <- type.parameter
#    ^^ type
#       ^ operator.roc-special.in-typedef
#         ^^^^^ keyword.control
#                ^^^^ type.parameter
#                     ^^^^^ function.method
#                             ^^^^ type.parameter
#                                   ^^^^ type.parameter
#                                        ^^ punctuation.delimiter
#                                           ^^^^ type.builtin

item.Hash : where [item.to_hash : item, Hasher -> Hasher]
#                  ^^^^ type.parameter
#                       ^^^^^^^ function.method
#                                 ^^^^ type.parameter
#                                       ^^^^^^ type.builtin
#                                              ^^ punctuation.delimiter
#                                                 ^^^^^^ type.builtin
