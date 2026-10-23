# Declaration controls pass; references below reproduce advent-2015/24/main.roc:91.
item.Eq : where [item.is_eq : item, item -> Bool]
#    ^^ type

item.Hash : where [item.to_hash : item, Hasher -> Hasher]
#    ^^^^ type.builtin

powerset : List(item) -> Iter(Set(item))
    where [item.Eq, item.Hash]
#               ^^ type
#                        ^^^^ type.builtin

encode : a -> Str where [a.Encodable(err)]
#                         ^^^^^^^^ type
#                                  ^^^ type.parameter

parse : Str -> Try(a, errs) where [a.Parseable([InvalidJson(Str), ..errs])]
#                                   ^^^^^^^^^ type
#                                              ^^^^^^^^^^^ type.enum.variant.roc-special.builtin
#                                                          ^^^ type.builtin
#                                                                 ^^^^ type.parameter
