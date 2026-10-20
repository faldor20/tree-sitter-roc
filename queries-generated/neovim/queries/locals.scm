(expr_body) @local.scope
(anon_fun_expr) @local.scope
(match_branch) @local.scope
(body_expression) @local.scope
; Lambda and branch nodes are scopes themselves. Their direct expression bodies
; need a separate scope except when the body is already a lambda or a block.
(anon_fun_expr body: [
  (bin_op_expr) (break_expr) (const) (crash_expr) (dbg_expr)
  (early_return_expr) (field_access_expr) (for_expr) (function_call_pnc_expr)
  (if_expr) (list_expr) (match_expr) (nominal_constructor_expr)
  (nominal_record_expr) (operator_as_function_expr) (parenthesized_expr)
  (prefixed_expression) (record_expr) (suffix_op_expr) (tag_expr)
  (todo_expr) (tuple_access_expr) (tuple_expr) (variable_expr) (while_expr)
] @local.scope)
(match_branch expr: [
  (bin_op_expr) (break_expr) (const) (crash_expr) (dbg_expr)
  (early_return_expr) (field_access_expr) (for_expr) (function_call_pnc_expr)
  (if_expr) (list_expr) (match_expr) (nominal_constructor_expr)
  (nominal_record_expr) (operator_as_function_expr) (parenthesized_expr)
  (prefixed_expression) (record_expr) (suffix_op_expr) (tag_expr)
  (todo_expr) (tuple_access_expr) (tuple_expr) (variable_expr) (while_expr)
] @local.scope)
(expect body: (_) @local.scope)
(var_declaration body: (_) @local.scope)
(value_declaration body: [
  (crash_expr) (early_return_expr) (parenthesized_expr)
  (record_expr) (dbg_expr)
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
