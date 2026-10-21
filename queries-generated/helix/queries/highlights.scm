; Broad string captures precede identifiers so interpolated names keep their
; variable face when later captures override strings.
(string) @string
(multiline_string) @string
(const_pattern (string_pattern_capture)) @string
(char) @constant.character

(identifier) @variable



(concrete_type) @type



(module) @namespace



;;
;; Lower-priorty queries
;;



(argument_patterns                (identifier_pattern (identifier) @variable.parameter))
(argument_patterns (_             (identifier_pattern (identifier) @variable.parameter)))
(argument_patterns (_ (_          (identifier_pattern (identifier) @variable.parameter))))
(argument_patterns (_ (_ (_       (identifier_pattern (identifier) @variable.parameter)))))
(argument_patterns (_ (_ (_ (_    (identifier_pattern (identifier) @variable.parameter))))))
(argument_patterns (_ (_ (_ (_ (_ (identifier_pattern (identifier) @variable.parameter)))))))
(spread_pattern                                       (identifier) @variable.parameter)
(match_branch pattern: (_       (identifier_pattern (identifier) @variable.parameter)))
(tag_pattern
  (_)*
  (identifier_pattern (identifier) @variable.parameter))

; Identifier patterns introduce bindings. Plain value declarations are
; overridden back to variables below; function declarations are overridden by
; the later, higher-priority function rule.
(identifier_pattern (identifier) @variable.parameter)
(value_declaration
  pattern: (decl_left (identifier_pattern (identifier) @variable)))

; `ident` represents names in exposing/provides lists, not free variables.
; Declaration bindings are refined below after the general parameter captures.

; N/A
; @variable.other.member.private

(field_name)                         @variable.other.member
; Note: This query matches the second identifier and all subsequent ones.
(field_access_expr      (identifier) @variable.other.member)
; Note: This query highlights module members as records instead of free variables,
;       which avoids highlighting them as out-of-scope vars.
(variable_expr (module) (identifier) @variable.other.member)

; N/A
; @variable.other

; N/A
; @variable.builtin

(record_field_pattern (_ (identifier) @variable))

; Note: See the lower-priority queries below for a `@variable` query.



(inferred) @type.roc-special.inferred

(bound_variable) @type.parameter

(tag_type name: (tag_name) @type.enum.variant)

; N/A
; @type.enum

; Opinion: Type defs cross into documentation
;          and should be highlighted differently from normal code.
(opaque_type_def name: (apply_type (concrete_type) @type.definition))

((concrete_type) @type.builtin
  (#match? @type.builtin "^(Dec|F(32|64))"))
((concrete_type) @type.builtin
  (#match? @type.builtin "^[IU](8|16|32|64|128)"))
((concrete_type) @type.builtin
  (#match? @type.builtin "^(Bool|Box|Dec|Decode|Dict|Encode|Hash|Inspect|Int|List|Num|Result|Set|Str)"))

; Note: See the lower-priority queries below for a `@type` query.



; N/A
; @tag.builtin

; N/A (We use `@constructor` and `@type.enum.variant` for "tags".)
; @tag



(package_uri) @string.special.url

; N/A
; @string.special.symbol

; N/A
; @string.special.path

; N/A
; @string.special

; N/A
; @string.regexp

; TODO: Differentiate between values, functions, and types.
(import_expr exposing: (exposes_list (ident [(identifier) (module)] @special.roc-special.exposed)))
(module_header (module_exposes (ident [(identifier) (module)] @special.roc-special.exposed)))

(app_header (packages_list ((platform_ref) @special.roc-special.package)))

; TODO: Differentiate between values, functions, and types.
(app_header (provides_list ((identifier) @special.roc-special.provided)))

; N/A
; @special



[
  ","
  ":"
] @punctuation.delimiter

(arrow) @punctuation.delimiter

[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
  "|"
] @punctuation.bracket

; N/A
; @punctuation



[
  "="
  "."
  "&"
  ".."
  "!"
  "*"
  "-"
  "^"
  (operator)
] @operator

(fat_arrow) @operator
(bin_op_expr (operator "->") @operator)

(wildcard_pattern) @variable.builtin



; N/A
; @label



; TODO: Implement this for `var`.
; @keyword.storage.type

; N/A
; @keyword.storage.modifier

; N/A
; @keyword.function

; N/A
; @keyword.directive

"return" @keyword.control.return
(try_operator) @keyword.control.return

[
  "for"
  "while"
] @keyword.control.repeat

[
  "import"
] @keyword.control.import

"crash" @keyword.control.exception

[
  "else"
  "if"

  "match"
] @keyword.control.conditional

[
  "app"
  "as"
  (break_expr)
  "expect"
  "exposing"
  "exposes"
  "hosted"
  "in"
  "module"
  "package"
  "packages"
  "platform"
  "provides"
  "requires"
  "targets"
  "to"
  "var"
  "where"
] @keyword.control

; N/A
;
; @keyword



[
  "dbg"
] @function.builtin

; Definition bindings override general variable and parameter captures.
; Function-specific patterns follow, so callable definitions keep @function.
(annotation_type_def name: (annotation_pre_colon (identifier) @variable))
(value_declaration pattern: (decl_left (identifier_pattern (identifier) @variable)))
(value_declaration pattern: (decl_left (tuple_pattern (identifier_pattern (identifier) @variable))))
(value_declaration pattern: (decl_left (tag_pattern args: (identifier_pattern (identifier) @variable))))
(value_declaration pattern: (decl_left (nominal_constructor_pattern (identifier_pattern (identifier) @variable))))
(var_declaration name: (identifier) @variable)

(value_declaration pattern: (decl_left (identifier_pattern (identifier) @function))
  body: (anon_fun_expr))
(value_declaration pattern: (decl_left (identifier_pattern (identifier) @function))
  body: (function_call_pnc_expr caller: (anon_fun_expr)))
(value_declaration pattern: (decl_left (identifier_pattern (identifier) @function))
  body: (bin_op_expr part: (function_call_pnc_expr caller: (anon_fun_expr))))
(function_call_pnc_expr caller: (variable_expr (identifier) @function))
(function_call_pnc_expr caller: (field_access_expr (identifier) @function .))
(bin_op_expr (operator "->") (variable_expr (identifier) @function))

; Inferred names have a variable base capture. Editors with predicate support
; refine recognized derived methods; Emacs refines them in the mode instead.
(inferred_associated_annotation
  name: (annotation_pre_colon (identifier) @variable))

; An underscore annotation in an associated block can request a derived method.
; A matching following definition instead supplies an ordinary value; editors
; that support predicates use the later rule, including intervening comments.
((inferred_associated_annotation
  name: (annotation_pre_colon (identifier) @function))
  (#match? @function "^(is_eq|to_hash|parser_for|encoder_for|map|map!)$"))

(annotation_type_def name: (annotation_pre_colon (identifier) @function)
  (function_type))
(annotation_type_def name: (annotation_pre_colon (identifier) @function)
  (where_implements type: (function_type)))



  (tag (identifier)@constructor)

; Constructor names have a type face only in nominal constructor syntax.
(nominal_constructor_expr (tag (identifier) @type))
(nominal_constructor_pattern (tag (identifier) @type))




(number_with_suffix) @constant.numeric

[
  (float)
] @constant.numeric.float

((number_with_suffix) @constant.numeric.float
  (#match? @constant.numeric.float "^[+-]?[0-9][0-9_]*(\\.[0-9]|[eE])"))

[
  (int)
  (xint)
] @constant.numeric.integer

((number_with_suffix) @constant.numeric.integer
  (#not-match? @constant.numeric.integer "^[+-]?[0-9][0-9_]*(\\.[0-9]|[eE])"))

; N/A
; @constant.numeric

(escape_char) @constant.character.escape

[
  (literal_type_suffix)
  (record_builder_suffix)
] @type

(tag_expr(tag (module) @ignoreme.module "." (identifier)@constant.builtin.boolean)
  (#eq? @constant.builtin.boolean "True") (#eq? @ignoreme.module "Bool"))
(tag_expr (tag(module) @module "." (identifier)@constant.builtin.boolean)
  (#eq? @constant.builtin.boolean "False") (#eq? @module "Bool"))

; N/A
; @constant.builtin

; N/A
; @constant



(line_comment) @comment.line

(doc_comment) @comment.line
(doc_comment) @comment.block.documentation

; N/A
; @comment.block

; N/A
; @comment



; N/A
; @attribute



(record_field_type (field_name) @variable.other.member.roc-special.in-typedef)


(function_type "," @punctuation.delimiter.roc-special.in-typedef)
(record_type   "," @punctuation.delimiter.roc-special.in-typedef)
(tuple_type    "," @punctuation.delimiter.roc-special.in-typedef)

(parenthesized_type ["(" ")"] @punctuation.bracket.roc-special.in-typedef)
(record_type        ["{" "}"] @punctuation.bracket.roc-special.in-typedef)
(tags_type          ["[" "]"] @punctuation.bracket.roc-special.in-typedef)
(tuple_type         ["(" ")"] @punctuation.bracket.roc-special.in-typedef)

(static_dispatch_target
(identifier)@function.method)


((module) @namespace.roc-special.builtin
  (#match? @namespace.roc-special.builtin "^(Bool|Box|Decode|Dict|Encode|Hash|Inspect|List|Num|Result|Set|Str)"))
; TODO(bugfix): `Set` yields an ERROR in `expect Set.from_list(paths_as_str) == Set.from_list(["nested-dir/a", "nested-dir/child"])`



;;
;; Higher-priorty queries
;;

(interpolation_char
  "${" @punctuation.special
  "}" @punctuation.special)
(nominal_methods
  ".{" @punctuation.bracket
  "}" @punctuation.bracket)

(alias_type_def name: (apply_type (concrete_type) @type))
(opaque_type_def name: (apply_type (concrete_type) @type))
(nominal_type_def name: (apply_type (concrete_type) @type))
(alias_type_def ":" @operator)
(opaque_type_def (double_colon) @operator)
(nominal_type_def (colon_equals) @operator)
(string_pattern_capture
  "${" @punctuation.special
  "}" @punctuation.special)



;; Highlight names (like `@comment.block.documentation`) are arbitrary.
;; However, some text editors encourage a standard set in their themes.
;; For consistency and quality, these queries assign the highlight names that Helix uses:
;; see https://docs.helix-editor.com/themes.html#scopes

; An explicit same-name definition wins over a possible derived method.
((nominal_methods
  (inferred_associated_annotation
    name: (annotation_pre_colon (identifier) @variable))
  . [(line_comment) (doc_comment)]*
  . (value_declaration
      pattern: (decl_left (identifier_pattern (identifier) @_definition))))
  (#eq? @variable @_definition))

(anon_fun_expr "|" @punctuation.bracket)
(value_declaration "=" @operator)

(ERROR)
