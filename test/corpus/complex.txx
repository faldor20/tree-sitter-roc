================================================================================
complex file
================================================================================

app "countdown"
    packages { pf: "cli-platform/main.roc" }
    imports [pf.Stdin, pf.Stdout, pf.Task.{ await, loop, succeed }]
    provides [main] to pf

main =
    _ <- await (Stdout.line "\nLet's count down from 10 together - all you have to do is press <ENTER>.")
    _ <- await Stdin.line
    loop 10 tick

tick = \ n ->
    if n == 0 then
        _ <- await (Stdout.line "SURPRISE! Happy Birthday! ")
        succeed (Done {})
    else
        _ <- await (n |> Num.toStr |> \s -> "\(s)..." |> Stdout.line)
        _ <- await Stdin.line
        succeed (Step (n - 1))

--------------------------------------------------------------------------------

(file
  (app_header
    (app_name)
    (app_header_body
      (packages
        (record_pattern
          (record_field_pattern
            (field_name)
            (const
              (string)))))
      (imports
        (imports_entry
          (identifier)
          (module))
        (imports_entry
          (identifier)
          (module))
        (imports_entry
          (identifier)
          (module)
          (exposes_list
            (ident)
            (ident)
            (ident))))
      (provides
        (ident)
        (to)
        (ident))))
  (value_declaration
    (decl_left
      (identifier_pattern
        (identifier)))
    (expr_body
      (backpassing_expr
        (wildcard_pattern)
        (back_arrow)
        (function_call_expr
          (variable_expr
            (identifier))
          (parenthesized_expr
            (expr_body
              (function_call_expr
                (variable_expr
                  (module)
                  (identifier))
                (const
                  (string
                    (escape_char))))))))
      (backpassing_expr
        (wildcard_pattern)
        (back_arrow)
        (function_call_expr
          (variable_expr
            (identifier))
          (variable_expr
            (module)
            (identifier))))
      (function_call_expr
        (variable_expr
          (identifier))
        (const
          (int))
        (variable_expr
          (identifier)))))
  (value_declaration
    (decl_left
      (identifier_pattern
        (identifier)))
    (expr_body
      (anon_fun_expr
        (backslash)
        (argument_patterns
          (identifier_pattern
            (identifier)))
        (arrow)
        (expr_body
          (if_expr
            (bin_op_expr
              (variable_expr
                (identifier))
              (operator)
              (const
                (int)))
            (then
              (expr_body
                (backpassing_expr
                  (wildcard_pattern)
                  (back_arrow)
                  (function_call_expr
                    (variable_expr
                      (identifier))
                    (parenthesized_expr
                      (expr_body
                        (function_call_expr
                          (variable_expr
                            (module)
                            (identifier))
                          (const
                            (string)))))))
                (function_call_expr
                  (variable_expr
                    (identifier))
                  (parenthesized_expr
                    (expr_body
                      (tag_expr
                        (tag)
                        (record_expr)))))))
            (else
              (expr_body
                (backpassing_expr
                  (wildcard_pattern)
                  (back_arrow)
                  (function_call_expr
                    (variable_expr
                      (identifier))
                    (parenthesized_expr
                      (expr_body
                        (bin_op_expr
                          (variable_expr
                            (identifier))
                          (operator)
                          (variable_expr
                            (module)
                            (identifier))
                          (operator)
                          (anon_fun_expr
                            (backslash)
                            (argument_patterns
                              (identifier_pattern
                                (identifier)))
                            (arrow)
                            (expr_body
                              (bin_op_expr
                                (const
                                  (string
                                    (interpolation_char
                                      (variable_expr
                                        (identifier)))))
                                (operator)
                                (variable_expr
                                  (module)
                                  (identifier))))))))))
                (backpassing_expr
                  (wildcard_pattern)
                  (back_arrow)
                  (function_call_expr
                    (variable_expr
                      (identifier))
                    (variable_expr
                      (module)
                      (identifier))))
                (function_call_expr
                  (variable_expr
                    (identifier))
                  (parenthesized_expr
                    (expr_body
                      (tag_expr
                        (tag)
                        (parenthesized_expr
                          (expr_body
                            (bin_op_expr
                              (variable_expr
                                (identifier))
                              (operator)
                              (const
                                (int)))))))))))))))))

================================================================================
simple_env
================================================================================

main =
  task =
    a "E" 
    |> t (\a -> e "") 
    |> t (\{} -> Env.decode "SHLVL")
  task    
--------------------------------------------------------------------------------

(file
  (value_declaration
    (decl_left
      (identifier_pattern
        (identifier)))
    (expr_body
      (value_declaration
        (decl_left
          (identifier_pattern
            (identifier)))
        (expr_body
          (bin_op_expr
            (function_call_expr
              (variable_expr
                (identifier))
              (const
                (string)))
            (operator)
            (function_call_expr
              (variable_expr
                (identifier))
              (parenthesized_expr
                (expr_body
                  (anon_fun_expr
                    (backslash)
                    (argument_patterns
                      (identifier_pattern
                        (identifier)))
                    (arrow)
                    (expr_body
                      (function_call_expr
                        (variable_expr
                          (identifier))
                        (const
                          (string))))))))
            (operator)
            (function_call_expr
              (variable_expr
                (identifier))
              (parenthesized_expr
                (expr_body
                  (anon_fun_expr
                    (backslash)
                    (argument_patterns
                      (record_pattern))
                    (arrow)
                    (expr_body
                      (function_call_expr
                        (variable_expr
                          (module)
                          (identifier))
                        (const
                          (string)))))))))))
      (variable_expr
        (identifier)))))

================================================================================
complex env decode
================================================================================

app "env"
    packages { pf: "cli-platform/main.roc" }
    imports [pf.Stdout, pf.Stderr, pf.Env, pf.Task.{ Task }]
    provides [main] to pf

main : Task {} []
main =
    task =
        Env.decode "EDITOR"
        |> Task.await (\editor -> Stdout.line "Your favorite editor is \(editor)!")
        |> Task.await (\{} -> Env.decode "SHLVL")
        |> Task.await
            (\lvl ->
                when lvl is
                    1u8 -> Stdout.line "You're running this in a root shell!"
                    n ->
                        lvlStr = Num.toStr n

                        Stdout.line "Your current shell level is \(lvlStr)!")
        |> Task.await \{} -> Env.decode "LETTERS"

    Task.attempt task \result ->
        when result is
            Ok letters ->
                joinedLetters = Str.joinWith letters " "

                Stdout.line "Your favorite letters are: \(joinedLetters)"

            Err _ ->
                Stderr.line "I couldn't find your favorite letters in the environment variables!"

--------------------------------------------------------------------------------

(file
  (app_header
    (app_name)
    (app_header_body
      (packages
        (record_pattern
          (record_field_pattern
            (field_name)
            (const
              (string)))))
      (imports
        (imports_entry
          (identifier)
          (module))
        (imports_entry
          (identifier)
          (module))
        (imports_entry
          (identifier)
          (module))
        (imports_entry
          (identifier)
          (module)
          (exposes_list
            (ident))))
      (provides
        (ident)
        (to)
        (ident))))
  (value_declaration
    (annotation_type_def
      (annotation_pre_colon
        (identifier))
      (apply_type
        (concrete_type)
        (apply_type_args
          (apply_type_arg
            (record_type))
          (apply_type_arg
            (tags_type)))))
    (decl_left
      (identifier_pattern
        (identifier)))
    (expr_body
      (value_declaration
        (decl_left
          (identifier_pattern
            (identifier)))
        (expr_body
          (bin_op_expr
            (function_call_expr
              (variable_expr
                (module)
                (identifier))
              (const
                (string)))
            (operator)
            (function_call_expr
              (variable_expr
                (module)
                (identifier))
              (parenthesized_expr
                (expr_body
                  (anon_fun_expr
                    (backslash)
                    (argument_patterns
                      (identifier_pattern
                        (identifier)))
                    (arrow)
                    (expr_body
                      (function_call_expr
                        (variable_expr
                          (module)
                          (identifier))
                        (const
                          (string
                            (interpolation_char
                              (variable_expr
                                (identifier)))))))))))
            (operator)
            (function_call_expr
              (variable_expr
                (module)
                (identifier))
              (parenthesized_expr
                (expr_body
                  (anon_fun_expr
                    (backslash)
                    (argument_patterns
                      (record_pattern))
                    (arrow)
                    (expr_body
                      (function_call_expr
                        (variable_expr
                          (module)
                          (identifier))
                        (const
                          (string))))))))
            (operator)
            (function_call_expr
              (variable_expr
                (module)
                (identifier))
              (parenthesized_expr
                (expr_body
                  (anon_fun_expr
                    (backslash)
                    (argument_patterns
                      (identifier_pattern
                        (identifier)))
                    (arrow)
                    (expr_body
                      (when_is_expr
                        (when)
                        (variable_expr
                          (identifier))
                        (is)
                        (when_is_branch
                          (const_pattern
                            (uint))
                          (arrow)
                          (expr_body
                            (function_call_expr
                              (variable_expr
                                (module)
                                (identifier))
                              (const
                                (string)))))
                        (when_is_branch
                          (identifier_pattern
                            (identifier))
                          (arrow)
                          (expr_body
                            (value_declaration
                              (decl_left
                                (identifier_pattern
                                  (identifier)))
                              (expr_body
                                (function_call_expr
                                  (variable_expr
                                    (module)
                                    (identifier))
                                  (variable_expr
                                    (identifier)))))
                            (function_call_expr
                              (variable_expr
                                (module)
                                (identifier))
                              (const
                                (string
                                  (interpolation_char
                                    (variable_expr
                                      (identifier))))))))))))))
            (operator)
            (function_call_expr
              (variable_expr
                (module)
                (identifier))
              (anon_fun_expr
                (backslash)
                (argument_patterns
                  (record_pattern))
                (arrow)
                (expr_body
                  (function_call_expr
                    (variable_expr
                      (module)
                      (identifier))
                    (const
                      (string)))))))))
      (function_call_expr
        (variable_expr
          (module)
          (identifier))
        (variable_expr
          (identifier))
        (anon_fun_expr
          (backslash)
          (argument_patterns
            (identifier_pattern
              (identifier)))
          (arrow)
          (expr_body
            (when_is_expr
              (when)
              (variable_expr
                (identifier))
              (is)
              (when_is_branch
                (tag_pattern
                  (tag)
                  (identifier_pattern
                    (identifier)))
                (arrow)
                (expr_body
                  (value_declaration
                    (decl_left
                      (identifier_pattern
                        (identifier)))
                    (expr_body
                      (function_call_expr
                        (variable_expr
                          (module)
                          (identifier))
                        (variable_expr
                          (identifier))
                        (const
                          (string)))))
                  (function_call_expr
                    (variable_expr
                      (module)
                      (identifier))
                    (const
                      (string
                        (interpolation_char
                          (variable_expr
                            (identifier))))))))
              (when_is_branch
                (tag_pattern
                  (tag)
                  (wildcard_pattern))
                (arrow)
                (expr_body
                  (function_call_expr
                    (variable_expr
                      (module)
                      (identifier))
                    (const
                      (string))))))))))))

================================================================================
interface full
================================================================================

interface Dir
    exposes [ReadErr, DeleteErr, DirEntry, deleteEmptyDir, deleteRecursive, list]
    imports [Effect, Task.{ Task }, InternalTask, Path.{ Path }, InternalPath, InternalDir]

ReadErr : InternalDir.ReadErr

DeleteErr : InternalDir.DeleteErr

DirEntry : InternalDir.DirEntry

## Lists the files and directories inside the directory.
list : Path -> Task (List Path) [DirReadErr Path ReadErr]
list = \path ->
    effect = Effect.map (Effect.dirList (InternalPath.toBytes path)) \result ->
        when result is
            Ok entries -> Ok (List.map entries InternalPath.fromOsBytes)
            Err err -> Err (DirReadErr path err)

    InternalTask.fromEffect effect

## Deletes a directory if it's empty.
deleteEmptyDir : Path -> Task {} [DirDeleteErr Path DeleteErr]

## Recursively deletes the directory as well as all files and directories inside it.
deleteRecursive : Path -> Task {} [DirDeleteErr Path DeleteErr]
--------------------------------------------------------------------------------

(file
  (interface_header
    (name)
    (interface_header_body
      (exposes
        (ident)
        (ident)
        (ident)
        (ident)
        (ident)
        (ident))
      (imports
        (imports_entry
          (module))
        (imports_entry
          (module)
          (exposes_list
            (ident)))
        (imports_entry
          (module))
        (imports_entry
          (module)
          (exposes_list
            (ident)))
        (imports_entry
          (module))
        (imports_entry
          (module)))))
  (alias_type_def
    (apply_type
      (concrete_type))
    (apply_type
      (concrete_type)))
  (alias_type_def
    (apply_type
      (concrete_type))
    (apply_type
      (concrete_type)))
  (alias_type_def
    (apply_type
      (concrete_type))
    (apply_type
      (concrete_type)))
  (doc_comment)
  (annotation_type_def
    (annotation_pre_colon
      (identifier))
    (function_type
      (apply_type
        (concrete_type))
      (arrow)
      (apply_type
        (concrete_type)
        (apply_type_args
          (apply_type_arg
            (parenthesized_type
              (apply_type
                (concrete_type)
                (apply_type_args
                  (apply_type_arg
                    (apply_type
                      (concrete_type)))))))
          (apply_type_arg
            (tags_type
              (apply_type
                (concrete_type)
                (apply_type_args
                  (apply_type_arg
                    (apply_type
                      (concrete_type)
                      (apply_type_args
                        (apply_type_arg
                          (apply_type
                            (concrete_type))))))))))))))
  (value_declaration
    (decl_left
      (identifier_pattern
        (identifier)))
    (expr_body
      (anon_fun_expr
        (backslash)
        (argument_patterns
          (identifier_pattern
            (identifier)))
        (arrow)
        (expr_body
          (value_declaration
            (decl_left
              (identifier_pattern
                (identifier)))
            (expr_body
              (function_call_expr
                (variable_expr
                  (module)
                  (identifier))
                (parenthesized_expr
                  (expr_body
                    (function_call_expr
                      (variable_expr
                        (module)
                        (identifier))
                      (parenthesized_expr
                        (expr_body
                          (function_call_expr
                            (variable_expr
                              (module)
                              (identifier))
                            (variable_expr
                              (identifier))))))))
                (anon_fun_expr
                  (backslash)
                  (argument_patterns
                    (identifier_pattern
                      (identifier)))
                  (arrow)
                  (expr_body
                    (when_is_expr
                      (when)
                      (variable_expr
                        (identifier))
                      (is)
                      (when_is_branch
                        (tag_pattern
                          (tag)
                          (identifier_pattern
                            (identifier)))
                        (arrow)
                        (expr_body
                          (tag_expr
                            (tag)
                            (parenthesized_expr
                              (expr_body
                                (function_call_expr
                                  (variable_expr
                                    (module)
                                    (identifier))
                                  (variable_expr
                                    (identifier))
                                  (variable_expr
                                    (module)
                                    (identifier))))))))
                      (when_is_branch
                        (tag_pattern
                          (tag)
                          (identifier_pattern
                            (identifier)))
                        (arrow)
                        (expr_body
                          (tag_expr
                            (tag)
                            (parenthesized_expr
                              (expr_body
                                (tag_expr
                                  (tag)
                                  (variable_expr
                                    (identifier))
                                  (variable_expr
                                    (identifier))))))))))))))
          (function_call_expr
            (variable_expr
              (module)
              (identifier))
            (variable_expr
              (identifier)))))))
  (doc_comment)
  (annotation_type_def
    (annotation_pre_colon
      (identifier))
    (function_type
      (apply_type
        (concrete_type))
      (arrow)
      (apply_type
        (concrete_type)
        (apply_type_args
          (apply_type_arg
            (record_type))
          (apply_type_arg
            (tags_type
              (apply_type
                (concrete_type)
                (apply_type_args
                  (apply_type_arg
                    (apply_type
                      (concrete_type)
                      (apply_type_args
                        (apply_type_arg
                          (apply_type
                            (concrete_type))))))))))))))
  (doc_comment)
  (annotation_type_def
    (annotation_pre_colon
      (identifier))
    (function_type
      (apply_type
        (concrete_type))
      (arrow)
      (apply_type
        (concrete_type)
        (apply_type_args
          (apply_type_arg
            (record_type))
          (apply_type_arg
            (tags_type
              (apply_type
                (concrete_type)
                (apply_type_args
                  (apply_type_arg
                    (apply_type
                      (concrete_type)
                      (apply_type_args
                        (apply_type_arg
                          (apply_type
                            (concrete_type)))))))))))))))

================================================================================
lists_complex
================================================================================
view : NavLink, Str -> Html.Node
view = \currentNavLink, htmlContent ->
    html [lang "en"] [
        head [] [
            meta [httpEquiv "content-type", content "text/html; charset=utf-8"],
            Html.title [] [text currentNavLink.title],
            link [rel "stylesheet", href "style.css"],
        ],
        body [] [
            div [class "main"] [
                div [class "navbar"] [
                    viewNavbar currentNavLink,
                ],
                div [class "article"] [
                    text htmlContent,
                ],
            ],
        ],
    ]

--------------------------------------------------------------------------------

(file
  (value_declaration
    (annotation_type_def
      (annotation_pre_colon
        (identifier))
      (function_type
        (apply_type
          (concrete_type))
        (apply_type
          (concrete_type))
        (arrow)
        (apply_type
          (concrete_type))))
    (decl_left
      (identifier_pattern
        (identifier)))
    (expr_body
      (anon_fun_expr
        (backslash)
        (argument_patterns
          (identifier_pattern
            (identifier))
          (identifier_pattern
            (identifier)))
        (arrow)
        (expr_body
          (function_call_expr
            (variable_expr
              (identifier))
            (list_expr
              (function_call_expr
                (variable_expr
                  (identifier))
                (const
                  (string))))
            (list_expr
              (function_call_expr
                (variable_expr
                  (identifier))
                (list_expr)
                (list_expr
                  (function_call_expr
                    (variable_expr
                      (identifier))
                    (list_expr
                      (function_call_expr
                        (variable_expr
                          (identifier))
                        (const
                          (string)))
                      (function_call_expr
                        (variable_expr
                          (identifier))
                        (const
                          (string)))))
                  (function_call_expr
                    (variable_expr
                      (module)
                      (identifier))
                    (list_expr)
                    (list_expr
                      (function_call_expr
                        (variable_expr
                          (identifier))
                        (field_access_expr
                          (variable_expr
                            (identifier))
                          (identifier)))))
                  (function_call_expr
                    (variable_expr
                      (identifier))
                    (list_expr
                      (function_call_expr
                        (variable_expr
                          (identifier))
                        (const
                          (string)))
                      (function_call_expr
                        (variable_expr
                          (identifier))
                        (const
                          (string)))))))
              (function_call_expr
                (variable_expr
                  (identifier))
                (list_expr)
                (list_expr
                  (function_call_expr
                    (variable_expr
                      (identifier))
                    (list_expr
                      (function_call_expr
                        (variable_expr
                          (identifier))
                        (const
                          (string))))
                    (list_expr
                      (function_call_expr
                        (variable_expr
                          (identifier))
                        (list_expr
                          (function_call_expr
                            (variable_expr
                              (identifier))
                            (const
                              (string))))
                        (list_expr
                          (function_call_expr
                            (variable_expr
                              (identifier))
                            (variable_expr
                              (identifier)))))
                      (function_call_expr
                        (variable_expr
                          (identifier))
                        (list_expr
                          (function_call_expr
                            (variable_expr
                              (identifier))
                            (const
                              (string))))
                        (list_expr
                          (function_call_expr
                            (variable_expr
                              (identifier))
                            (variable_expr
                              (identifier))))))))))))))))

================================================================================
if else
================================================================================
viewNavLink = \isCurrent, navlink ->
    if isCurrent then
        li [class "nav-link nav-link--current"] [
            text navlink.text,
        ]
    else
        li [class "nav-link"] [
            a
                [href navlink.url, title navlink.title]
                [text navlink.text],
        ]
--------------------------------------------------------------------------------

(file
  (value_declaration
    (decl_left
      (identifier_pattern
        (identifier)))
    (expr_body
      (anon_fun_expr
        (backslash)
        (argument_patterns
          (identifier_pattern
            (identifier))
          (identifier_pattern
            (identifier)))
        (arrow)
        (expr_body
          (if_expr
            (variable_expr
              (identifier))
            (then
              (expr_body
                (function_call_expr
                  (variable_expr
                    (identifier))
                  (list_expr
                    (function_call_expr
                      (variable_expr
                        (identifier))
                      (const
                        (string))))
                  (list_expr
                    (function_call_expr
                      (variable_expr
                        (identifier))
                      (field_access_expr
                        (variable_expr
                          (identifier))
                        (identifier)))))))
            (else
              (expr_body
                (function_call_expr
                  (variable_expr
                    (identifier))
                  (list_expr
                    (function_call_expr
                      (variable_expr
                        (identifier))
                      (const
                        (string))))
                  (list_expr
                    (function_call_expr
                      (variable_expr
                        (identifier))
                      (list_expr
                        (function_call_expr
                          (variable_expr
                            (identifier))
                          (field_access_expr
                            (variable_expr
                              (identifier))
                            (identifier)))
                        (function_call_expr
                          (variable_expr
                            (identifier))
                          (field_access_expr
                            (variable_expr
                              (identifier))
                            (identifier))))
                      (list_expr
                        (function_call_expr
                          (variable_expr
                            (identifier))
                          (field_access_expr
                            (variable_expr
                              (identifier))
                            (identifier)))))))))))))))

================================================================================
if func
================================================================================
viewNavLink = \isCurrent, navlink ->
    if isCurrent then
      a b
    else
      a p

--------------------------------------------------------------------------------

(file
  (value_declaration
    (decl_left
      (identifier_pattern
        (identifier)))
    (expr_body
      (anon_fun_expr
        (backslash)
        (argument_patterns
          (identifier_pattern
            (identifier))
          (identifier_pattern
            (identifier)))
        (arrow)
        (expr_body
          (if_expr
            (variable_expr
              (identifier))
            (then
              (expr_body
                (function_call_expr
                  (variable_expr
                    (identifier))
                  (variable_expr
                    (identifier)))))
            (else
              (expr_body
                (function_call_expr
                  (variable_expr
                    (identifier))
                  (variable_expr
                    (identifier)))))))))))
