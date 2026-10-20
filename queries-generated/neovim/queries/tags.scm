; Function calls
(function_call_pnc_expr
    caller: (variable_expr (identifier) ))

(function_call_pnc_expr
  caller: (field_access_expr (identifier) .))

; Function definitions
(value_declaration
  pattern: (decl_left (identifier_pattern (identifier) ))
  (anon_fun_expr))

; Type definitions
(alias_type_def name: (apply_type (concrete_type) ))
(opaque_type_def name: (apply_type (concrete_type) ))
(nominal_type_def name: (apply_type (concrete_type) ))
