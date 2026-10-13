Derived := [A].{
    is_eq : _
#   ^^^^^ function
    to_hash : _
#   ^^^^^^^ function
    parser_for : _
#   ^^^^^^^^^^ function
    encoder_for : _
#   ^^^^^^^^^^^ function
    map : _
#   ^^^ function
    map! : _
#   ^^^^ function
    other = 42
}
Explicit := [B].{
    is_eq : _
#   ^^^^^ variable
    # ordinary definition, even for a recognized derive name
    is_eq = 42
    count : _
#   ^^^^^ variable
    count = 42
}
is_eq : _
# <- variable
is_eq = 42
