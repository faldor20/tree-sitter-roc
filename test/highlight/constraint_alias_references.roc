# Declaration controls pass; references below reproduce advent-2015/24/main.roc:91.
item.Eq : where [item.is_eq : item, item -> Bool]
#    ^^ type

item.Hash : where [item.to_hash : item, Hasher -> Hasher]
#    ^^^^ type.builtin

powerset : List(item) -> Iter(Set(item))
    where [item.Eq, item.Hash]
#               ^^ type
#                        ^^^^ type.builtin
