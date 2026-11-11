Derived := [A].{
    is_eq : _
#   ^^^^^ function.roc-special.derive
    to_hash : _
#   ^^^^^^^ function.roc-special.derive
    parser_for : _
#   ^^^^^^^^^^ function.roc-special.derive
    encoder_for : _
#   ^^^^^^^^^^^ function.roc-special.derive
    map : _
#   ^^^ function.roc-special.derive
    map! : _
#   ^^^^ function.roc-special.derive
    other = 42
}
Explicit := [B].{
    is_eq : _
#   ^^^^^ variable.roc-special.inferred-definition
    # ordinary definition, even for a recognized derive name
    is_eq = 42
    count : _
#   ^^^^^ variable.roc-special.inferred-definition
    count = 42
}
is_eq : _
# <- variable.roc-special.definition
is_eq = 42
