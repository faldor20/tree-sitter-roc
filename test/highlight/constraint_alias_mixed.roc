check : a -> Bool where [
    a.Eq,
#   ^ type.parameter
#     ^^ type
    a.check : a -> Bool,
#     ^^^^^ function.method
    a.Hash,
#     ^^^^ type.builtin
]

a.Both : where [
    a.Eq,
#     ^^ type
    a.check : a => Bool,
#     ^^^^^ function.method
    a.Hash,
#     ^^^^ type.builtin
]
