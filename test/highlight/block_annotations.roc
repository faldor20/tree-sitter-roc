compute = |flag| {
    x : U64
#   ^ variable.roc-special.definition
#     ^ punctuation.delimiter.roc-special.ordinary
#       ^^^ type.builtin
    x = 1
#   ^ variable.roc-special.definition

    helper : U64 -> U64
#   ^^^^^^ function
#          ^ punctuation.delimiter.roc-special.ordinary
#            ^^^ type.builtin
#                ^^ punctuation.delimiter
#                   ^^^ type.builtin
    helper = |n| n + 1
#   ^^^^^^ function

    wrap : a -> List(a)
#   ^^^^ function
#          ^ type.parameter
#               ^^^^ type.builtin
#                    ^ type.parameter
    wrap = |item| [item]
#   ^^^^ function

    status : [Ready, Waiting(U64)]
#   ^^^^^^ variable.roc-special.definition
#             ^^^^^ type.enum.variant.roc-special.builtin
#                    ^^^^^^^ type.enum.variant.roc-special.builtin
#                            ^^^ type.builtin
    status = Ready
#   ^^^^^^ variable.roc-special.definition

    if flag {
        y : U64
#       ^ variable.roc-special.definition
#         ^ punctuation.delimiter.roc-special.ordinary
#           ^^^ type.builtin
        y = helper(x)
#       ^ variable.roc-special.definition
        y
    } else {
        apply = |n| {
            z : U64
#           ^ variable.roc-special.definition
#             ^ punctuation.delimiter.roc-special.ordinary
#               ^^^ type.builtin
            z = n + x
#           ^ variable.roc-special.definition
            z
        }
        apply(x)
    }
}

top : U64
# <- variable.roc-special.definition
#   ^ punctuation.delimiter.roc-special.ordinary
#     ^^^ type.builtin
top = 1
# <- variable.roc-special.definition
