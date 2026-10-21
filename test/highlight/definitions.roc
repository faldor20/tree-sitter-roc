identity : a -> a
# <- function
identity = |value| value
# <- function
#        ^ operator.roc-special.assignment
#          ^ punctuation.bracket.roc-special.lambda
#                ^ punctuation.bracket.roc-special.lambda

constrained : a -> Str where [a.to_str : a -> Str]
# <- function
constrained = |value| value.to_str()
# <- function

(left, right) = pair
# ^^^^ variable.roc-special.definition
#      ^^^^^ variable.roc-special.definition

Ok(payload) = result
#  ^^^^^^^ variable.roc-special.definition

Wrapper := I64

Wrapper(wrapped) = boxed
#       ^^^^^^^ variable.roc-special.definition

plain = 1
# <- variable.roc-special.definition

update = || {
    var count = 0
#       ^^^^^ variable.roc-special.definition

    count
}
