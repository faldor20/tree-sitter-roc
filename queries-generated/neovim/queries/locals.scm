(expr_body) @local.scope
(anon_fun_expr) @local.scope
(match_branch) @local.scope
(body_expression) @local.scope
; Lambda and branch nodes are scopes themselves. Direct expression bodies also
; need their old ranges, except lambdas and blocks already captured above.
(anon_fun_expr body: (bin_op_expr) @local.scope)
(anon_fun_expr body: (break_expr) @local.scope)
(anon_fun_expr body: (const) @local.scope)
(anon_fun_expr body: (crash_expr) @local.scope)
(anon_fun_expr body: (dbg_expr) @local.scope)
(anon_fun_expr body: (early_return_expr) @local.scope)
(anon_fun_expr body: (field_access_expr) @local.scope)
(anon_fun_expr body: (for_expr) @local.scope)
(anon_fun_expr body: (function_call_pnc_expr) @local.scope)
(anon_fun_expr body: (if_expr) @local.scope)
(anon_fun_expr body: (list_expr) @local.scope)
(anon_fun_expr body: (match_expr) @local.scope)
(anon_fun_expr body: (nominal_constructor_expr) @local.scope)
(anon_fun_expr body: (nominal_record_expr) @local.scope)
(anon_fun_expr body: (operator_as_function_expr) @local.scope)
(anon_fun_expr body: (parenthesized_expr) @local.scope)
(anon_fun_expr body: (prefixed_expression) @local.scope)
(anon_fun_expr body: (record_expr) @local.scope)
(anon_fun_expr body: (suffix_op_expr) @local.scope)
(anon_fun_expr body: (tag_expr) @local.scope)
(anon_fun_expr body: (todo_expr) @local.scope)
(anon_fun_expr body: (tuple_access_expr) @local.scope)
(anon_fun_expr body: (tuple_expr) @local.scope)
(anon_fun_expr body: (variable_expr) @local.scope)
(anon_fun_expr body: (while_expr) @local.scope)
(match_branch expr: (bin_op_expr) @local.scope)
(match_branch expr: (break_expr) @local.scope)
(match_branch expr: (const) @local.scope)
(match_branch expr: (crash_expr) @local.scope)
(match_branch expr: (dbg_expr) @local.scope)
(match_branch expr: (early_return_expr) @local.scope)
(match_branch expr: (field_access_expr) @local.scope)
(match_branch expr: (for_expr) @local.scope)
(match_branch expr: (function_call_pnc_expr) @local.scope)
(match_branch expr: (if_expr) @local.scope)
(match_branch expr: (list_expr) @local.scope)
(match_branch expr: (match_expr) @local.scope)
(match_branch expr: (nominal_constructor_expr) @local.scope)
(match_branch expr: (nominal_record_expr) @local.scope)
(match_branch expr: (operator_as_function_expr) @local.scope)
(match_branch expr: (parenthesized_expr) @local.scope)
(match_branch expr: (prefixed_expression) @local.scope)
(match_branch expr: (record_expr) @local.scope)
(match_branch expr: (suffix_op_expr) @local.scope)
(match_branch expr: (tag_expr) @local.scope)
(match_branch expr: (todo_expr) @local.scope)
(match_branch expr: (tuple_access_expr) @local.scope)
(match_branch expr: (tuple_expr) @local.scope)
(match_branch expr: (variable_expr) @local.scope)
(match_branch expr: (while_expr) @local.scope)
(expect body: (_) @local.scope)
(var_declaration body: (_) @local.scope)
(value_declaration body: [
  (bin_op_expr) (break_expr) (const) (crash_expr) (dbg_expr)
  (early_return_expr) (field_access_expr) (for_expr) (function_call_pnc_expr)
  (if_expr) (list_expr) (match_expr) (nominal_constructor_expr)
  (nominal_record_expr) (operator_as_function_expr) (parenthesized_expr)
  (prefixed_expression) (record_expr) (suffix_op_expr) (tag_expr)
  (todo_expr) (tuple_access_expr) (tuple_expr) (variable_expr) (while_expr)
] @local.scope)
(crash_expr message: (_) @local.scope)
(early_return_expr body: (_) @local.scope)
(parenthesized_expr expression: (_) @local.scope)
(file) @local.scope
(provides_list (identifier)@local.reference)


; (value_declaration(decl_left 
;   (identifier_pattern 
;    (identifier)@local.definition)))

;;This would make parameters that are functions not get highlighted as functions but as parameters.. not sure if that's something we ever want 
; (argument_patterns(identifier_pattern
;             (identifier)@local.definition))

(argument_patterns(identifier_pattern
                (identifier)@local.definition))
(argument_patterns(_(identifier_pattern(identifier)@local.definition)))
(argument_patterns(_(_(identifier_pattern(identifier)@local.definition))))
(argument_patterns(_(_(_(identifier_pattern(identifier)@local.definition)))))
(argument_patterns(_(_(_(_(identifier_pattern(identifier)@local.definition))))))
(argument_patterns(_(_(_(_(_(identifier_pattern(identifier)@local.definition)))))))

; (exposes_list(ident)@local.reference)
; (import_expr "as" (module) @local.definition)

; (opaque_type_def(apply_type(concrete_type)@local.definition))
; (alias_type_def(apply_type(concrete_type)@local.definition))

; (match_branch pattern: (_ (identifier_pattern (identifier) @local.definition)))
; (spread_pattern (identifier) @local.definition)

(identifier)@local.reference
; (tag_expr(tag))@local.reference
