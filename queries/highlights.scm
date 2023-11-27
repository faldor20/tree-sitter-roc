
[
"?"
(arrow)
(back_arrow)
(backslash)
] @punctuation.delimiter



;;from fsharp

;; ----------------------------------------------------------------------------
;; Literals and comments

[
  (line_comment)
] @comment


;; ----------------------------------------------------------------------------
;; Punctuation

[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
] @punctuation.bracket

[
  "," 
] @punctuation.delimiter

[
  "|" 
  (operator)
] @operator


[
  "if"
  "then"
  "else"

] @keyword.control.conditional

(interface_header(name)@type.interface)

[
    "app"
    "packages"
    "imports"
    "provides"
    "interface"
    "exposes"
    "expect"
 ] @keyword.control

  (implements)@keyword.control.roc
 (when) @keyword.control.roc
 (is) @keyword.control.roc
[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  ","
] @punctuation.delimiter


;----things that could be functions----

(value_declaration(decl_left 
  (identifier_pattern 
   (identifier)@function))(expr_body(anon_fun_expr)))


(function_call_expr
  caller:  (variable_expr
      (identifier)@function))
(function_call_expr
  caller: (field_access_expr (identifier)@function .))

; (anon_fun_expr
;   (argument_patterns
;     (long_identifier
;       (identifier)@variable.parameter))
;      )

(annotation_type_def 
 (annotation_pre_colon 
  (identifier)@function )
 (type_annotation (function_type)))




(imports
  (imports_entry
            (module)@namespace))

(packages
  (record_pattern
    (record_field_pattern
      (field_name)@namespace)))



(tags_type(apply_type(concrete_type)@constructor))

(tag)@constructor
(opaque_tag)@constructor

(string)@string
(char) @constant.character

; (boolean_literal) @constant.builtin.boolean
(variable_expr
  (module)@module
  (identifier)@constant.builtin.boolean
  (#eq? @constant.builtin.boolean "true" )
  (#eq? @module "Bool" )
  )
(variable_expr
  (module)@module
  (identifier)@constant.builtin.boolean
  (#eq? @constant.builtin.boolean "false" )
  (#eq? @module "Bool" )
  )

(bin_op_expr (operator "|>")@operator(variable_expr(identifier)@function))

; (anon_fun_expr
;   (argument_patterns)@variable.parameter)
(argument_patterns(identifier_pattern
                (identifier)@variable.parameter))
(argument_patterns(_(identifier_pattern(identifier)@variable.parameter)))
(argument_patterns(_(_(identifier_pattern(identifier)@variable.parameter))))
(argument_patterns(_(_(_(identifier_pattern(identifier)@variable.parameter)))))
(argument_patterns(_(_(_(_(identifier_pattern(identifier)@variable.parameter))))))
(argument_patterns(_(_(_(_(_(identifier_pattern(identifier)@variable.parameter)))))))

(field_name)@variable.other.member

;matches the second identifier and all subsequent ones
(field_access_expr (identifier) @variable.other.member)

(wildcard_pattern)@operator
[
  (int)
  (uint)
  (iint)
  (xint)
  (natural)
] @constant.numeric.integer
[
  (decimal)
  (float)
] @constant.numeric.float

(module)@namespace
(module)@module

(identifier)@variable
(concrete_type)@type
