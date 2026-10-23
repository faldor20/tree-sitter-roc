# The same constraints should have identical captures inline and in where aliases.
# Inline control first: its assertions must pass before the alias assertions.
powerset : List(item) -> Iter(Set(item))
    where [
#   ^^^^^ keyword.control
        item.is_eq : item, item -> Bool,
#       ^^^^ type.parameter
#            ^^^^^ function.method
#                    ^^^^ type.parameter
#                          ^^^^ type.parameter
#                               ^^ punctuation.delimiter
#                                  ^^^^ type.builtin
        item.to_hash : item, Hasher -> Hasher,
#       ^^^^ type.parameter
#            ^^^^^^^ function.method
#                      ^^^^ type.parameter
#                            ^^^^^^ type.builtin
#                                   ^^ punctuation.delimiter
#                                      ^^^^^^ type.builtin
    ]

# Reproductions from advent-2015/24/main.roc.
item.Eq : where [item.is_eq : item, item -> Bool]
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
