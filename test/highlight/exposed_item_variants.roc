module [Type as Renamed, Outer.Inner.*, Outer.Type!, Outer.foo!bar]
#       ^^^^ special.roc-special.exposed
#               ^^^^^^^ special.roc-special.exposed
#                        ^^^^^ special.roc-special.exposed
#                              ^^^^^ special.roc-special.exposed
#                                   ^^ operator
#                                            ^^^^^ special.roc-special.exposed
#                                                         ^^^^^^^ special.roc-special.exposed

import Foo exposing [Type as Renamed, Outer.Inner.*, Outer.Type!, Outer.foo!bar]
#                    ^^^^ special.roc-special.exposed
#                            ^^^^^^^ special.roc-special.exposed
#                                     ^^^^^ special.roc-special.exposed
#                                           ^^^^^ special.roc-special.exposed
#                                                ^^ operator
#                                                         ^^^^^ special.roc-special.exposed
#                                                                      ^^^^^^^ special.roc-special.exposed

main = 1
