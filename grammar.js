/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
const PREC = {
  FIELD_ACCESS_START: 0,
  WHERE_IMPLEMENTS: 1,
  PATTERN: 0,
  TAG: 1,
  FUNCTION_START: 1,
  PART: 1,
  TYPEALIAS: 2,
  CASE_OF_BRANCH: 6,
  FUNC: 10,
  IMPORT: 20,
};

module.exports = grammar({
  name: "roc",

  // The external scanner (scanner.cc) allows us to inject "dummy" tokens into the grammar.
  // These tokens are used to track the indentation-based scoping used in F#

  externals: ($) => [
    $._newline,
    $._end_newline,
    $._indent,
    $._dedent,

    // Mark comments as external tokens so that the external scanner is always
    // invoked, even if no external token is expected. This allows for better
    // error recovery, because the external scanner can maintain the overall
    // structure by returning dedent tokens whenever a dedent occurs, even
    // if no dedent is expected.
    $.comment,

    // Allow the external scanner to check for the validity of closing brackets
    // so that it can avoid returning dedent tokens between brackets.
    "]",
    ")",
    "}",
    "except",
  ],

  extras: ($) => [
    $.line_comment,
    $.doc_comment,
    /[ \s\f\uFEFF\u2060\u200B]|\\\r?n/,
  ],

  conflicts: ($) => [
    [$._function_call_target, $._atom_expr],
    // [$.function_call_expr],
    //Expressions and patterns will always need to be in conflict because we except expressions in the top level so it's impossible to tell if a list is a list experssion or a list destructuring untill you get to the =
    [$._pattern, $._atom_expr],
    [$._atomic_pattern, $._atom_expr],
    [$.tag_pattern, $.tag_expr],
    [$.record_pattern, $.record_expr],
    [$.record_field_pattern, $.record_field_expr],
    [$.identifier_pattern, $.long_identifier],
    [$.spread_pattern, $.long_identifier],
    //TODO: this should be rethought. maybe they can be combined?
    // [$.field_access_expr, $.long_identifier],
    [$.list_pattern, $.list_expr],
    [$._module_elem, $.value_declaration],
    [$._module_elem, $._expr_inner],
    [$._more_when_is_branches],
    [$.operator_identifier, $.suffix_operator_identifier],
    [$.record_type],
    [$.tags_type],
  ],
  words: ($) => /\s+/,
  word: ($) => $._lower_identifier,

  inline: ($) => [
    $._type_annotation_paren_fun,
    $._field_access_start,
    $.module,
    $.tag,
    $.field_name,
    $.bound_variable,
    $.operator,
    $.suffix_operator,
    $.variable_expr,
    $.inferred,
  ],

  // supertypes: ($) => [$._module_elem, $._pattern, $._expr_inner],

  rules: {
    file: ($) =>
      seq(
        optional(seq($._header, $._end_newline)),
        repeat1(seq($._module_elem, $._end_newline)),
      ),
    //TODO i could make a different version of this for when the module is an interface
    _module_elem: ($) =>
      choice(
        $.annotation_type_def,
        $.alias_type_def,
        $.opaque_type_def,
        $.expect,
        $.implements_definition,
        $.value_declaration,
        $.expr_body,
        $.import_expr,
        $.import_file_expr,
      ),

    expect: ($) => prec(1, seq("expect", field("body", $.expr_body))),
    value_declaration: ($) =>
      prec(
        0,
        seq(
          //TODO i should be able to find a better solution that this silly /n
          optional(seq($.annotation_type_def, $._end_newline)),

          // $._newline,
          alias($._assignment_pattern, $.decl_left),
          "=",
          field("body", alias($.expr_body_terminal, $.expr_body)),
        ),
      ),

    /**
      Expressions that can appear anywhere in the body of an expression. 
      */
    _body_expression: ($) =>
      prec(-1, choice($.value_declaration, $.dbg_expr, $.suffix_op_expr)),
    expr_body: ($) =>
      choice(
        seq(
          $._indent,
          field("declarations", repeat($._body_expression)),
          field("result", $._expr_inner),
          $._dedent,
        ),
        seq(repeat($._body_expression), field("result", $._expr_inner)),
      ),

    /**
		An expression body that should contain a newline after, like within a value declaration
		I checked and removing this only improved the parser size by 200k
		*/
    expr_body_terminal: ($) =>
      choice(
        seq(
          $._indent,
          field("declarations", repeat($._body_expression)),
          field("result", $._expr_inner),
          $._dedent,
        ),
        seq(
          repeat($._body_expression),
          field("result", $._expr_inner),
          choice($._dedent, $._end_newline),
        ),
      ),

    /**
		atomic expressions can be used as function args without being wrapped in parens
		*/
    _atom_expr: ($) =>
      choice(
        $.anon_fun_expr,
        $.const,
        $.record_expr,
        $.record_builder_expr,
        $.record_update_expr,
        $.variable_expr,
        $.parenthesized_expr,
        $.operator_as_function_expr,
        $.tag_expr,
        $.tuple_expr,
        $.list_expr,
        $.field_access_expr,
        $.todo_expr,
        $.function_call_pnc_expr,
        $.suffix_op_expr,
        $.prefixed_expression,
      ),

    _expr_inner: ($) =>
      choice(
        $.bin_op_expr,
        $._atom_expr,
        $.import_expr,
        $.import_file_expr,
        $.if_expr,
        $.when_is_expr,
        // $.chain_expr,
      ),

    //orginally this had all operators, but it was making the parser almost twice as large so I cut the list down
    prefixed_expression: ($) =>
      prec(
        10,
        seq(
          choice("!", "*", "-", "^"),
          choice(
            $.const,
            $.parenthesized_expr,
            $.field_access_expr,
            $.variable_expr,
            $.function_call_pnc_expr,
          ),
        ),
      ),
    dbg_expr: ($) => seq("dbg", alias($.expr_body_terminal, $.expr_body)),
    else: ($) => seq("else", $.expr_body),
    // biome-ignore lint/suspicious/noThenProperty: <explanation>
    then: ($) => seq("then", field("then", $.expr_body)),
    else_if: ($) =>
      prec.left(seq("else", "if", field("guard", $._expr_inner), $.then)),

    variable_expr: ($) => alias($.long_identifier, $.variable_expr),
    long_identifier: ($) => seq(repeat(seq($.module, ".")), $.identifier),
    parenthesized_expr: ($) => seq("(", field("expression", $.expr_body), ")"),
    if_expr: ($) =>
      seq(
        "if",
        field("guard", $._expr_inner),
        $.then,
        repeat($.else_if),
        $.else,
      ),

    //Some things, like tags cannot be the start of a field access so we can't just use any expression
    _field_access_start: ($) =>
      // prec(
      // 	PREC.FIELD_ACCESS_START,
      choice(
        $.variable_expr,
        $.parenthesized_expr,
        $.record_expr,
        $.record_builder_expr,
        $.record_update_expr,
        $.function_call_pnc_expr,
      ),
    // ),
    field_access_expr: ($) =>
      seq(
        field("target", $._field_access_start),
        repeat1(prec(1, seq(".", $.identifier))),
      ),
    // chain_expr: ($) =>
    //   prec(
    //     5,
    //     seq(
    //       $.function_call_pnc_expr,
    //       repeat1(prec.right(5, seq(".", $.function_call_pnc_expr))),
    //     ),
    //   ),

    function_call_pnc_expr: ($) =>
      prec.right(
        PREC.FUNC + 1,
        seq(
          field("caller", $._atom_expr),
          "(",
          field("args", sep_tail($._expr_inner, ",")),
          ")",
        ),
      ),

    operator_as_function_expr: ($) => $._operator_as_function_inner,

    _operator_as_function_inner: ($) =>
      seq("(", field("operator", $.operator_identifier), ")"),

    _function_call_target: ($) =>
      choice(
        $.field_access_expr,
        // $.field_accessor_function_expr,
        $.variable_expr,
        $.operator_as_function_expr, //TODO: this is technically not compatible with PNC calling
        $.parenthesized_expr,
        //A function can return a function which can then be called
        $.function_call_pnc_expr,
      ),
    bin_op_expr: ($) =>
      field(
        "part",
        prec(
          PREC.PART,
          seq($._atom_expr, prec.right(repeat1(seq($.operator, $._atom_expr)))),
        ),
      ),
    suffix_op_expr: ($) =>
      field(
        "part",
        prec.left(
          PREC.PART + 1,
          seq($._atom_expr, $.suffix_operator, optional($._end_newline)),
        ),
      ),

    //WHEN_IS
    _when_is_start: ($) =>
      seq(alias("when", $.when), $._expr_inner, alias("is", $.is)),

    when_is_expr: ($) =>
      prec.right(
        seq(
          $._when_is_start,
          choice(
            //when the branches are indented
            seq(
              $._indent,
              $.when_is_branch,
              optional($._more_when_is_branches),
              $._dedent,
            ),
            //when the contents is not indented
            seq(
              $._end_newline,
              $.when_is_branch,
              optional($._more_when_is_branches),
            ),
          ),
        ),
      ),

    _more_when_is_branches: ($) =>
      prec.dynamic(
        PREC.CASE_OF_BRANCH,
        repeat1(seq($._newline, field("branch", $.when_is_branch))),
      ),

    when_is_branch: ($) =>
      seq(
        field("pattern", $._pattern),
        optional(seq("if", alias($._expr_inner, $.if))),
        $.arrow,
        //TODO: evaluate what options can got here
        field("expr", $.expr_body),
      ),
    tag_expr: ($) =>
      prec.left(
        PREC.TAG,
        seq(choice($.opaque_tag, $.tag), repeat($._atom_expr)),
      ),
    anon_fun_expr: ($) =>
      prec.left(
        seq("|", $.argument_patterns, "|", $.expr_body, optional($._newline)),
      ),

    //RECORDS

    record_field_expr: ($) =>
      prec.right(seq($.field_name, optional(seq(":", $.expr_body)))),

    record_expr: ($) =>
      seq("{", sep_tail(choice($.record_field_expr, $.spread_expr), ","), "}"),

    record_builder_expr: ($) =>
      seq("{", $.identifier, "<-", sep1_tail($.record_field_expr, ","), "}"),

    record_update_expr: ($) =>
      seq("{", $.identifier, "&", sep1_tail($.record_field_expr, ","), "}"),

    _list_body: ($) =>
      sep1_tail(field("exprList", choice($._expr_inner, $.spread_expr)), ","),
    list_expr: ($) => seq("[", optional($._list_body), "]"),
    spread_expr: ($) => seq("..", $._expr_inner),
    _tuple_body: ($) =>
      seq(
        field("expr", $._expr_inner),
        ",",
        sep1_tail(field("expr", $._expr_inner), ","),
      ),
    tuple_expr: ($) => seq("(", optional_indent($._tuple_body, $), ")"),
    todo_expr: ($) => "...",

    //####---------###
    //#### PATTERN ###
    //####---------###
    // Pattern rules (BEGIN)
    _pattern: ($) =>
      choice(
        // alias("null", $.null_pattern),
        alias("_", $.wildcard_pattern),
        alias($.const, $.const_pattern),
        $.identifier_pattern,
        $.disjunct_pattern,
        $.conjunct_pattern,
        $.cons_pattern,
        // // $.repeat_pattern,
        $.paren_pattern,
        $.list_pattern,
        $.tag_pattern,
        $.record_pattern,
        $.tuple_pattern,
        $.spread_pattern,
        // $.typed_pattern,
        // $.attribute_pattern,
        // :? atomic-type
        // :? atomic-type as ident
      ),

    identifier_pattern: ($) => $.identifier,
    cons_pattern: ($) => prec.left(0, seq($._pattern, "::", $._pattern)),
    disjunct_pattern: ($) => prec.left(0, seq($._pattern, "|", $._pattern)),
    conjunct_pattern: ($) => prec.left(0, seq($._pattern, "&", $._pattern)),

    paren_pattern: ($) => seq("(", $._pattern, ")"),
    spread_pattern: ($) =>
      prec.left(0, seq("..", optional(seq("as", $.identifier)))),

    tag_pattern: ($) =>
      prec.left(
        PREC.TAG,
        seq(choice($.opaque_tag, $.tag), repeat($._atomic_pattern)),
      ),
    tuple_pattern: ($) =>
      prec.right(
        seq(
          "(",
          $._atomic_pattern,
          ",",
          repeat(prec.right(seq($._atomic_pattern, ","))),
          $._atomic_pattern,
          ")",
        ),
      ),

    argument_patterns: ($) =>
      seq($._atomic_pattern, repeat(seq(",", $._atomic_pattern))),
    _atomic_pattern: ($) =>
      choice(
        "null",
        alias("_", $.wildcard_pattern),
        $.const,
        $.identifier_pattern,
        $.list_pattern,
        $.tuple_pattern,
        $.record_pattern,
        $.tag_pattern,
        //TODO: this shhouldn't realy be here
        $.spread_pattern,
        seq("(", $._pattern, ")"),

        // :? atomic_type
      ),
    _assignment_pattern: ($) =>
      choice(
        alias("_", $.wildcard_pattern),
        $.identifier_pattern,
        $.list_pattern,
        $.tuple_pattern,
        $.record_pattern,
      ),

    list_pattern: ($) =>
      choice(
        seq("[", "]"),
        seq("[", $._atomic_pattern, repeat(seq(",", $._atomic_pattern)), "]"),
      ),

    record_pattern: ($) =>
      seq(
        "{",
        sep_tail(
          choice(
            // $.record_field_type,
            $.spread_pattern,
            $.record_field_pattern,
            // $.identifier_pattern,
          ),
          ",",
        ),
        "}",
      ),

    record_field_pattern: ($) =>
      seq($.field_name, optional(seq(":", $._atomic_pattern))),
    //###--------####
    //### HEADER ####
    //###--------###

    _header: ($) =>
      choice(
        $.app_header,
        $.platform_header,
        $.module_header,
        $.package_header,
      ),
    package_header: ($) => seq("package", $.provides_list, $.packages_list),
    app_header: ($) => seq("app", $.provides_list, $.packages_list),
    //TODO make this a function for app and platform
    platform_header: ($) =>
      seq(
        "platform",
        alias($.string, $.name),
        $._indent,
        $.platform_header_body,
        $._dedent,
      ),
    platform_header_body: ($) =>
      sep1(
        choice(
          $.requires,
          $.exposes,
          $.packages,
          $.imports,
          $.provides,
          $.effects,
        ),
        "\n",
      ),

    module_header: ($) => seq("module", $.exposes_list),

    //TODO: should this actually be a record_pattern?
    packages: ($) => seq("packages", $.record_pattern),

    packages_list: ($) =>
      seq("{", sep_tail(choice($.package_ref, $.platform_ref), ","), "}"),
    package_ref: ($) => seq($.identifier, ":", $.string),
    platform_ref: ($) =>
      seq($.identifier, ":", "platform", alias($.string, $.package_uri)),

    exposed_list: ($) => seq("{", sep_tail($.ident, ","), "}"),
    exposes: ($) => seq("exposes", $.exposes_list),
    exposes_list: ($) => seq("exposing", seq("[", sep_tail($.ident, ","), "]")),
    import_ident: ($) =>
      seq(optional(seq($.identifier, ".")), sep1($.module, ".")),
    _import_body: ($) =>
      seq(
        $.import_ident,
        optional(
          choice(
            alias($.exposes_list, $.exposing),
            seq(alias("as", $.as), $.module),
          ),
        ),
      ),
    import_expr: ($) => prec(PREC.IMPORT, seq("import", $._import_body)),
    import_file_expr: ($) =>
      prec(
        PREC.IMPORT,
        seq("import", $.string, seq("as", $.identifier, ":", $.concrete_type)),
      ),
    imports: ($) => seq("imports", "[", sep_tail($.imports_entry, ","), "]"),
    imports_entry: ($) =>
      seq(
        choice(
          seq(
            optional(seq($.identifier, ".")),
            seq($.module, repeat(seq(".", $.module))),
            optional(seq(".", $.exposed_list)),
          ),
          alias($.string, $.import_path),
        ),
        optional(
          seq(alias("as", $.import_as), $.identifier, ":", $._type_annotation),
        ),
      ),
    //TODO make a function for all these comma separated trailing comma things
    to: ($) => "to",
    provides: ($) =>
      seq(
        "provides",
        "[",
        optional($.ident),
        repeat(seq(",", $.ident)),
        optional(","),
        "]",
        optional(seq($.to, choice($.string, $.ident))),
      ),
    provides_list: ($) =>
      seq(
        "[",
        optional($.ident),
        repeat(seq(",", $.ident)),
        optional(","),
        "]",
      ),
    requires: ($) =>
      seq("requires", $.requires_rigids, "{", $.typed_ident, "}"),

    requires_rigids: ($) =>
      choice(
        seq(
          "{",
          optional(
            seq(
              $.requires_rigid,
              repeat(seq(",", $.requires_rigid)),
              optional(","),
            ),
          ),
          "}",
        ),
      ),

    requires_rigid: ($) =>
      seq($.identifier, optional(seq("=>", $._upper_identifier))),

    //####-------###
    //#### TYPES ###
    //####-------###

    annotation_type_def: ($) =>
      seq($.annotation_pre_colon, ":", $._type_annotation),
    alias_type_def: ($) =>
      seq($.apply_type, ":", field("body", $._type_annotation)),
    opaque_type_def: ($) =>
      seq($.apply_type, alias(":=", $.colon_equals), $._type_annotation),

    _type_annotation: ($) =>
      prec.left(
        choice(
          seq(
            $._indent,
            choice($._type_annotation_no_fun, $.function_type),
            $._dedent,
          ),
          choice($._type_annotation_no_fun, $.function_type),
        ),
      ),

    //TODO i can probably get rid of this, because type_annotation_no_fun can eventually laev to (functio_type)
    _type_annotation_paren_fun: ($) =>
      choice(
        $._type_annotation_no_fun,
        alias(seq("(", $.function_type, ")"), $.type_annotation_paren),
      ),

    function_type: ($) =>
      seq(
        sep1(field("param", $._type_annotation_paren_fun), ","),
        choice($.arrow, $.fat_arrow),
        sep1($._type_annotation_paren_fun, $.arrow),
      ),

    parenthesized_type: ($) => seq("(", $._type_annotation, ")"),
    _type_annotation_no_fun: ($) =>
      choice(
        $.parenthesized_type,
        $.record_type,
        $.apply_type,
        $.where_implements,
        $.implements_implementation,
        $.tags_type,
        $.bound_variable,
        $.inferred,
        "*",
        $.tuple_type,
      ),
    tuple_type: ($) =>
      seq(
        "(",
        $._type_annotation,
        ",",
        sep1_tail($._type_annotation, ","),
        ")",
      ),

    implements: ($) => "implements",

    where_implements: ($) =>
      prec.right(
        seq(
          $._type_annotation_no_fun,
          alias("where", $.where),
          sep1($._implements_body, ","),
        ),
      ),
    _implements_body: ($) => seq($.identifier, $.implements, $.ability_chain),

    ability_implementation: ($) =>
      seq(alias($._upper_identifier, $.ability_name), optional($.record_expr)),
    implements_implementation: ($) =>
      seq(
        $._type_annotation_no_fun,
        $.implements,
        "[",
        sep1_tail($.ability_implementation, ","),
        "]",
      ),

    implements_definition: ($) =>
      seq(
        $._upper_identifier,
        $.implements,
        $.record_type,
        // "{",
        //   $._indent,
        //   sep1($.alias, $._newline),
        //   $._dedent,
        // "}"
      ),
    //    init : {} -> f where f implements InspectFormatter
    _ability: ($) =>
      sep1end($.module, ".", alias($._upper_identifier, $.ability)),
    ability_chain: ($) => prec.right(sep1($._ability, "&")),

    tags_type: ($) =>
      seq("[", optional($._tags_only), "]", optional($.type_variable)),

    _tags_only: ($) => seq(sep1_tail(choice($.tag_type), ",")),

    tag_type: ($) =>
      seq(field("name", $._upper_identifier), optional($._apply_type_args)),
    type_variable: ($) => choice($.bound_variable),

    bound_variable: ($) => alias($._lower_identifier, $.bound_variable),

    inferred: ($) => alias("_", $.inferred),

    apply_type: ($) =>
      prec.right(seq($.concrete_type, optional($._apply_type_args))),

    concrete_type: ($) =>
      prec(
        PREC.TYPEALIAS,
        seq(
          $._upper_identifier,
          repeat(prec(PREC.TYPEALIAS, seq(".", $._upper_identifier))),
        ),
      ),

    //we need a n optional \n to stop this eating the value that follows it
    _apply_type_args: ($) =>
      field("type_args", prec.right(repeat1($.apply_type_arg))),

    apply_type_arg: ($) => prec.left($._type_annotation_no_fun),

    typed_ident: ($) => seq($.identifier, ":", $._type_annotation),

    record_type: ($) =>
      seq(
        "{",
        sep_tail($.record_field_type, ","),
        "}",
        optional($.type_variable),
      ),

    record_field_type: ($) => seq($.field_name, ":", $._type_annotation),
    /** can be used to make tag unions or records open*/

    annotation_pre_colon: ($) =>
      choice(
        //TODO implimeent apply $.apply,
        //tag seems not needed when we have alias
        // $.tag,
        $.identifier,
      ),

    effects: ($) =>
      seq(
        // '__',
        "effects",
        $.effect_name,
        $.record_type,
      ),

    effect_name: ($) => seq($.identifier, ".", $._upper_identifier),
    //##------------##
    //##-- consts --##
    //##------------##

    const: ($) =>
      choice(
        $.float,
        $.xint,
        $.decimal,
        $.natural,
        $.uint,
        $.iint,

        $.char,
        $.string,
        $.multiline_string,
        $.int,
        "false",
        "true",
        // $.unit,
      ),

    //STRINGS
    string: ($) =>
      seq(
        '"',
        repeat(
          choice(imm(prec(0, /[^\n\\"]/)), $.interpolation_char, $.escape_char),
        ),
        '"',
      ),

    multiline_string: ($) =>
      seq(
        '"""',
        repeat(
          choice(imm(prec(0, /[^\\]/)), $.interpolation_char, $.escape_char),
        ),
        '"""',
      ),

    escape_char: ($) => imm(/\\([\\"\'ntbrafv]|(\$\{))/),
    interpolation_char: ($) =>
      seq(
        imm("${"), //This is the new interpolation syntax
        $._expr_inner,
        "}",
      ),
    _simple_string_char: ($) => /[^\t\r\u0008\a\f\v\\"]/,
    _simple_char_char: ($) => imm(/[^\n\t\r\u0008\a\f\v'\\]/),
    char: ($) => seq("'", choice($.escape_char, $._simple_char_char), imm("'")),

    //NUMBERS
    int: ($) => token(seq(/[0-9][0-9_]*/)),

    //ROC
    uint: ($) => token(seq(/[0-9][0-9_]*/, imm(/u(32|8|16|64|128)/))),
    iint: ($) => token(seq(/[0-9][0-9_]*/, imm(/i(32|8|16|64|128)/))),
    decimal: ($) => token(/[0-9]+(\.)?[0-9]*(dec)/),
    natural: ($) => token(/[0-9]+(nat)/),

    float: ($) => token(seq(/[0-9]+(\.)?[0-9]*(e-?[0-9]*)?((f32)|(f64))?/)),
    _hex_int: ($) => token(/0[x][0-9abcdefABCDEF]*/),
    _binary_int: ($) => token(seq(/0[b]/, /[01][01_]*/)),
    xint: ($) => choice($._binary_int, $._hex_int),

    //PRIMATIVES
    back_arrow: ($) => "<-",
    arrow: ($) => "->",
    fat_arrow: ($) => "=>",
    field_name: ($) => alias($.identifier, $.field_name),
    ident: ($) => choice(alias($.identifier, $._), $._upper_identifier),

    identifier: ($) =>
      prec(100, seq(optional("_"), $._lower_identifier, optional(imm("!")))),

    _lower_identifier: ($) => /[\p{Ll}][\p{XID_Continue}]*/,

    _upper_identifier: ($) => /[\p{Lu}][\p{XID_Continue}]*/,
    tag: ($) => alias($._upper_identifier, $.tag),
    opaque_tag: ($) => /@[A-Z][0-9a-zA-Z_]*/,
    module: ($) => alias($._upper_identifier, $.module),
    backslash: ($) => "\\",

    doc_comment: ($) => token(prec(-1, /##[^\n]*/)),
    line_comment: ($) => token(prec(-1, /#[^\n]*/)),

    suffix_operator: ($) =>
      alias($.suffix_operator_identifier, $.suffix_operator),
    suffix_operator_identifier: ($) => choice("?"),
    operator: ($) => alias($.operator_identifier, $.operator),
    operator_identifier: ($) =>
      choice(
        "?",
        "??",
        "+",
        "-",
        "*",
        "/",
        "//",
        "%",
        "^",
        "==",
        "!=",
        "/=",
        "<",
        ">",
        "<=",
        ">=",
        "or",
        "and",
        // "++",
        // "<|",
        "|>",
        // "<<",
        // ">>",
        // "::",
        // "</>",
        // "<?>",
        // "|.",
        // "|=",
      ),
  },
});

function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}
function sep1end(rule, separator, end) {
  return seq(repeat(seq(rule, separator)), end);
}
function sep1_tail(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)), optional(separator));
}
function sep_tail(rule, separator) {
  return optional(sep1_tail(rule, separator));
}
function optional_indent(rule, $) {
  return choice(seq($._indent, rule, $._dedent), rule);
}
function imm(x) {
  return token.immediate(x);
}
