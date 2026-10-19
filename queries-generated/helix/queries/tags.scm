; Function calls
(function_call_pnc_expr
    caller: (variable_expr (identifier)@name ))@reference.call

(function_call_pnc_expr
  caller: (field_access_expr (identifier)@name .))@reference.call

; Function definitions
(value_declaration
  pattern: (decl_left (identifier_pattern (identifier) @name))
  body: (expr_body (anon_fun_expr))) @definition.function

; Type definitions
(alias_type_def name: (apply_type (concrete_type) @name)) @definition.type
(opaque_type_def name: (apply_type (concrete_type) @name)) @definition.type
(nominal_type_def name: (apply_type (concrete_type) @name)) @definition.type
