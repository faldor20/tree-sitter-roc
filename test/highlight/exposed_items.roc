module [Outer.Inner, value as renamed, Type.*, Outer.value as Alias]
#       ^^^^^ special.roc-special.exposed
#            ^ operator
#             ^^^^^ special.roc-special.exposed
#                    ^^^^^ special.roc-special.exposed
#                          ^^ keyword.control
#                             ^^^^^^^ special.roc-special.exposed
#                                      ^^^^ special.roc-special.exposed
#                                          ^^ operator
#                                              ^^^^^ special.roc-special.exposed
#                                                    ^^^^^ special.roc-special.exposed
#                                                             ^^^^^ special.roc-special.exposed

import Foo as Bar exposing [Outer.Inner, value as renamed, Type.*, Outer.value as Alias]
#      ^^^ namespace
#             ^^^ namespace
#                           ^^^^^ special.roc-special.exposed
#                                ^ operator
#                                 ^^^^^ special.roc-special.exposed
#                                        ^^^^^ special.roc-special.exposed
#                                              ^^ keyword.control
#                                                 ^^^^^^^ special.roc-special.exposed
#                                                          ^^^^ special.roc-special.exposed
#                                                              ^^ operator
#                                                                  ^^^^^ special.roc-special.exposed
#                                                                        ^^^^^ special.roc-special.exposed
#                                                                                 ^^^^^ special.roc-special.exposed

main = 1
