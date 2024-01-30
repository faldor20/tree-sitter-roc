;;----comments----

[
  (line_comment)
  (doc_comment)
] @comment

;;-----Punctuation----
[
"?"
(arrow)
(back_arrow)
(backslash)
] @punctuation.delimiter

[
  ","
  ":"
] @punctuation.delimiter


[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
] @punctuation.bracket

[
  "|" 
  "&"
  (operator)
  (wildcard_pattern)
] @operator

[
  "if"
  "then"
  "else"
] @conditional

[
(implements)
(when)
(is)
"as"
(to)
] @keyword.control.roc

;----headers-----

(interface_header(name)@type.interface)

(imports
  (imports_entry
            (module)@namespace))

(packages
  (record_pattern
    (record_field_pattern
      (field_name)@namespace)))

(app_name) @string
(import_path) @string

[
    "app"
    "packages"
    "imports"
    "provides"
    "interface"
    "exposes"
    "expect"
    (import_as)
 ] @keyword.control

;---annotations----


(annotation_type_def 
 (annotation_pre_colon 
  (identifier)@type)
(#set! "priority" 99)
  )

(annotation_type_def 
 (annotation_pre_colon 
  (identifier)@function )
 (function_type)
  )


;----decleration types----
(value_declaration(decl_left 
  (identifier_pattern 
   (identifier) @parameter.definition))
    (#set! "priority" 99)
)

(backpassing_expr assignee: (identifier_pattern (identifier) @parameter.definition))

(value_declaration(decl_left 
  (identifier_pattern 
   (identifier)@function))(expr_body(anon_fun_expr)))

;----tags----

(tags_type(apply_type(concrete_type)@constructor))

(tag)@constructor
(opaque_tag)@constructor

;-----builtins----

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

[
"dbg"
] @constant.builtin
;----function invocations ----
(function_call_expr
  caller:  (variable_expr
      (identifier)@function.call))

(function_call_expr
  caller: (field_access_expr (identifier)@function.call .))

(bin_op_expr (operator "|>")@operator(variable_expr(identifier)@function))


;----function arguments----

(argument_patterns(identifier_pattern
                (identifier)@parameter))
(argument_patterns(_(identifier_pattern(identifier)@parameter)))
(argument_patterns(_(_(identifier_pattern(identifier)@parameter))))
(argument_patterns(_(_(_(identifier_pattern(identifier)@parameter)))))
(argument_patterns(_(_(_(_(identifier_pattern(identifier)@parameter))))))
(argument_patterns(_(_(_(_(_(identifier_pattern(identifier)@parameter)))))))
;;---records----

(field_name
(#set! "priority" 99)
  )@field
(record_field_pattern (_(identifier) @variable))

;matches the second identifier and all subsequent ones
(field_access_expr (identifier)@field
(#set! "priority" 99)
                    )


;-----consts-----
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

(string)@string
(char) @constant.character


;---Most generic types---
(module
(#set! "priority" 99)
  )@namespace
(module
(#set! "priority" 99)
  )@module

(identifier
(#set! "priority" 98)
  )@variable
(concrete_type
(#set! "priority" 99)
  )@type

