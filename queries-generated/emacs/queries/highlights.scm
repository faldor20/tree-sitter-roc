;; feature: strings
(string) @font-lock-string-face

(multiline_string) @font-lock-string-face

(const_pattern (string_pattern_capture)) @font-lock-string-face

(char) @font-lock-string-face

;; feature: variable-use
(identifier) @font-lock-variable-use-face

;; feature: types
(concrete_type) @font-lock-type-face

;; feature: modules
(module) @font-lock-constant-face



;;
;; Lower-priorty queries
;;

;; feature: variable-use
(argument_patterns                (identifier_pattern (identifier) @font-lock-variable-use-face))

(argument_patterns (_             (identifier_pattern (identifier) @font-lock-variable-use-face)))

(argument_patterns (_ (_          (identifier_pattern (identifier) @font-lock-variable-use-face))))

(argument_patterns (_ (_ (_       (identifier_pattern (identifier) @font-lock-variable-use-face)))))

(argument_patterns (_ (_ (_ (_    (identifier_pattern (identifier) @font-lock-variable-use-face))))))

(argument_patterns (_ (_ (_ (_ (_ (identifier_pattern (identifier) @font-lock-variable-use-face)))))))

(spread_pattern                                       (identifier) @font-lock-variable-use-face)

(match_branch pattern: (_       (identifier_pattern (identifier) @font-lock-variable-use-face)))

(tag_pattern
  (_)*
  (identifier_pattern (identifier) @font-lock-variable-use-face))

; Identifier patterns introduce bindings. Plain value declarations are
; overridden back to variables below; function declarations are overridden by
; the later, higher-priority function rule.

(identifier_pattern (identifier) @font-lock-variable-use-face)

(value_declaration
  pattern: (decl_left (identifier_pattern (identifier) @font-lock-variable-use-face)))

; `ident` represents names in exposing/provides lists, not free variables.
; Declaration bindings are refined below after the general parameter captures.

; N/A
; @variable.other.member.private

;; feature: record-field-declaration
(field_name)                         @font-lock-property-name-face
; Note: This query matches the second identifier and all subsequent ones.

;; feature: record-field-access
(field_access_expr      (identifier) @font-lock-property-use-face)
; Note: This query highlights module members as records instead of free variables,
;       which avoids highlighting them as out-of-scope vars.

(variable_expr (module) (identifier) @font-lock-property-use-face)

; N/A
; @variable.other

; N/A
; @variable.builtin

;; feature: variable-use
(record_field_pattern (_ (identifier) @font-lock-variable-use-face))

; Note: See the lower-priority queries below for a `@variable` query.

;; feature: types
(inferred) @font-lock-type-face

;; feature: type-variables
(bound_variable) @font-lock-type-face

;; feature: tag-types
(tag_type name: (tag_name) @font-lock-builtin-face)

; N/A
; @type.enum

; Opinion: Type defs cross into documentation
;          and should be highlighted differently from normal code.

;; feature: types
(opaque_type_def name: (apply_type (concrete_type) @font-lock-type-face))

;; feature: strings
(package_uri) @font-lock-string-face

; N/A
; @string.special.symbol

; N/A
; @string.special.path

; N/A
; @string.special

; N/A
; @string.regexp

; TODO: Differentiate between values, functions, and types.

;; feature: variable-use
(import_expr exposing: (exposes_list (ident) @font-lock-variable-use-face))

(module_header (module_exposes (ident [(identifier) (module)] @font-lock-variable-use-face)))

(app_header (provides_list ((identifier) @font-lock-variable-use-face)))

; N/A
; @special

;; feature: delimiters
[
  ","
  ":"
] @font-lock-delimiter-face

;; feature: arrows
(arrow) @font-lock-misc-punctuation-face

;; feature: brackets
[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
  "|"
] @font-lock-bracket-face

; N/A
; @punctuation

;; feature: operators
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
] @font-lock-operator-face

;; feature: arrows
(fat_arrow) @font-lock-misc-punctuation-face

;; feature: operators
(bin_op_expr (operator "->") @font-lock-operator-face)

;; feature: variable-use
(wildcard_pattern) @font-lock-variable-use-face



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

;; feature: keywords
"return" @font-lock-keyword-face

;; feature: early-return
(try_operator) @roc-ts-question-mark-face

;; feature: keywords
[
  "for"
  "while"
] @font-lock-keyword-face

[
  "import"
] @font-lock-keyword-face

"crash" @roc-ts-crash-face

[
  "else"
  "if"

  "match"
] @font-lock-keyword-face

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
] @font-lock-keyword-face

; N/A
;
; @keyword

[
  "dbg"
] @font-lock-keyword-face

; Definition bindings override general variable and parameter captures.
; Function-specific patterns follow, so callable definitions keep @function.

;; feature: definition-names
(annotation_type_def name: (annotation_pre_colon (identifier) @font-lock-variable-name-face))

(value_declaration pattern: (decl_left (identifier_pattern (identifier) @font-lock-variable-name-face)))

(value_declaration pattern: (decl_left (tuple_pattern (identifier_pattern (identifier) @font-lock-variable-name-face))))

(value_declaration pattern: (decl_left (tag_pattern args: (identifier_pattern (identifier) @font-lock-variable-name-face))))

(value_declaration pattern: (decl_left (nominal_constructor_pattern (identifier_pattern (identifier) @font-lock-variable-name-face))))

(var_declaration name: (identifier) @font-lock-variable-name-face)

(value_declaration pattern: (decl_left (identifier_pattern (identifier) @font-lock-function-name-face))
  body: (anon_fun_expr))

(value_declaration pattern: (decl_left (identifier_pattern (identifier) @font-lock-function-name-face))
  body: (function_call_pnc_expr caller: (anon_fun_expr)))

(value_declaration pattern: (decl_left (identifier_pattern (identifier) @font-lock-function-name-face))
  body: (bin_op_expr part: (function_call_pnc_expr caller: (anon_fun_expr))))

;; feature: function-calls
(function_call_pnc_expr caller: (variable_expr (identifier) @font-lock-function-call-face))

(function_call_pnc_expr caller: (field_access_expr (identifier) @font-lock-function-call-face .))

(bin_op_expr (operator "->") (variable_expr (identifier) @font-lock-function-call-face))

; Inferred names have a variable base capture. Editors with predicate support
; refine recognized derived methods; Emacs refines them in the mode instead.

;; feature: definition-names
(inferred_associated_annotation
  name: (annotation_pre_colon (identifier) @font-lock-variable-name-face))

; An underscore annotation in an associated block can request a derived method.
; A matching following definition instead supplies an ordinary value; editors
; that support predicates use the later rule, including intervening comments.

(annotation_type_def name: (annotation_pre_colon (identifier) @font-lock-function-name-face)
  (function_type))

(annotation_type_def name: (annotation_pre_colon (identifier) @font-lock-function-name-face)
  (where_implements type: (function_type)))

;; feature: tags
(tag (identifier)@font-lock-builtin-face)

; Constructor names have a type face only in nominal constructor syntax.

;; feature: types
(nominal_constructor_expr (tag (identifier) @font-lock-type-face))

(nominal_constructor_pattern (tag (identifier) @font-lock-type-face))

;; feature: numbers
(number_with_suffix) @font-lock-number-face

[
  (float)
] @font-lock-number-face

[
  (int)
  (xint)
] @font-lock-number-face

;; feature: string-escapes
(escape_char) @font-lock-escape-face

;; feature: types
[
  (literal_type_suffix)
  (record_builder_suffix)
] @font-lock-type-face

;; feature: comments
(line_comment) @font-lock-comment-face

(doc_comment) @font-lock-comment-face

;; feature: doc-comments
(doc_comment) @font-lock-doc-face

; N/A
; @comment.block

; N/A
; @comment



; N/A
; @attribute

;; feature: record-field-declaration
(record_field_type (field_name) @font-lock-property-name-face)

;; feature: delimiters
(function_type "," @font-lock-delimiter-face)

(record_type   "," @font-lock-delimiter-face)

(tuple_type    "," @font-lock-delimiter-face)

;; feature: brackets
(parenthesized_type ["(" ")"] @font-lock-bracket-face)

(record_type        ["{" "}"] @font-lock-bracket-face)

(tags_type          ["[" "]"] @font-lock-bracket-face)

(tuple_type         ["(" ")"] @font-lock-bracket-face)

;; feature: function-calls
(static_dispatch_target
(identifier)@font-lock-function-call-face)

;; feature: string-escapes
(interpolation_char
  "${" @font-lock-escape-face
  "}" @font-lock-escape-face)

;; feature: brackets
(nominal_methods
  ".{" @font-lock-bracket-face
  "}" @font-lock-bracket-face)

;; feature: types
(alias_type_def name: (apply_type (concrete_type) @font-lock-type-face))

(opaque_type_def name: (apply_type (concrete_type) @font-lock-type-face))

(nominal_type_def name: (apply_type (concrete_type) @font-lock-type-face))

;; feature: operators
(alias_type_def ":" @font-lock-operator-face)

(opaque_type_def (double_colon) @font-lock-operator-face)

(nominal_type_def (colon_equals) @font-lock-operator-face)

;; feature: string-escapes
(string_pattern_capture
  "${" @font-lock-escape-face
  "}" @font-lock-escape-face)



;; Highlight names (like `@comment.block.documentation`) are arbitrary.
;; However, some text editors encourage a standard set in their themes.
;; For consistency and quality, these queries assign the highlight names that Helix uses:
;; see https://docs.helix-editor.com/themes.html#scopes

; An explicit same-name definition wins over a possible derived method.

;; feature: lambdas
(anon_fun_expr "|" @font-lock-misc-punctuation-face)

;; feature: assignments
(value_declaration "=" @font-lock-misc-punctuation-face)

;; feature: errors
(ERROR) @default
