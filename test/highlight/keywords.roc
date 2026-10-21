platform ""
    requires {}
    exposes []
    packages {}
    provides [main] to pf
#                   ^^ keyword.control

import pf.Stdout as Output exposing [line!]
#                ^^ keyword.control
#                          ^^^^^^^^ keyword.control

stringify : a -> Str where [a.to_str : a -> Str]
#                    ^^^^^ keyword.control
stringify = |value| value.to_str()

main = || {
    var count = 0
#   ^^^ keyword.control
    expect count == 0
#   ^^^^^^ keyword.control
    dbg count
#   ^^^ function.builtin
    for item in items {
#   ^^^ keyword.control.repeat
#            ^^ keyword.control
        dbg item
    }
    while condition {
#   ^^^^^ keyword.control.repeat
        break
#       ^^^^^ keyword.control
    }
    if condition { 1 } else { 0 }
#   ^^ keyword.control.conditional
#                      ^^^^ keyword.control.conditional

    match value {
#   ^^^^^ keyword.control.conditional
        Ok(inner) => inner
        Err => 0
    }
}
