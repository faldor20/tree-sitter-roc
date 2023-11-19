
function imm(x) {
  return token.immediate(x);
}

const PREC = {
  SEQ_EXPR: 1,
  APP_EXPR: 2,
  THEN_EXPR: 2,
  RARROW: 3,
  INFIX_OP: 4,
  NEW_EXPR: 5,
  LET_EXPR: 20,
  LET_DECL: 7,
  DO_EXPR: 8,
  FUN_EXPR: 30,
  MATCH_EXPR: 8,
  MATCH_DECL: 9,
  DO_DECL: 10,
  ELSE_EXPR: 11,
  INTERFACE: 12,
  COMMA: 13,
  DOTDOT: 14,
  PREFIX_EXPR: 0,
  SPECIAL_INFIX: 22,
  LARROW: 19,
  TUPLE_EXPR: 19,
  SPECIAL_PREFIX: 20,
  DO_EXPR: 20,
  IF_EXPR: 80,
  // DOT: 19,
  DOT: 24,
  INDEX_EXPR: 25,
  PAREN_APP: 27,
  TYPED_EXPR: 28,
  //roc
  TYPE: 28,
  PAREN_EXPR: 25,
  DOTDOT_SLICE: 28,
}

module.exports = grammar({
  name: 'roc',

  // The external scanner (scanner.cc) allows us to inject "dummy" tokens into the grammar.
  // These tokens are used to track the indentation-based scoping used in F#
  externals: $ => [
    $._virtual_open_section, // Signal the external scanner that a new indentation scope should be opened. Add the indetation size to the stack.
    $._virtual_end_section, // end an indentation scope, popping the indentation off the stack.
    $._virtual_end_decl, // end an indentation scope with equal alignment, popping the indentation off the stack.
    $.block_comment_content
  ],

  extras: $ => [
    $.block_comment,
    $.line_comment,
    /[ \s\f\uFEFF\u2060\u200B]|\\\r?n/,
  ],

  conflicts: $ => [
    [$.identifier_pattern, $.long_identifier_or_op],
    [$.symbolic_op, $.infix_op],
    [$.long_module_name],
    // [$.application_expression, $.infix_expression],
    // [$.application_expression, $.infix_expression, $._pattern],
    [$._expression_inner, $._pattern]
  ],

  words: $ => $.ident,

  inline: $ => [
    $._assignement_expression,
    $._keyword_expression,
    $._contextual_expression,
    $._atom_expression,
    $._atom_context_expression,
    $._module_elem, $._infix_or_prefix_op, $._quote_op_left, $._quote_op_right, $._inner_literal_expressions, $._expression_or_range, $._infix_expression_inner, $._seq_expressions, $._seq_inline],

  supertypes: $ => [$._module_elem, $._pattern, $._expression_inner],

  rules: {
    //
    // Top-level rules (BEGIN)
    //
    file: $ =>

      seq(
        optional(seq($._module_header)),
        repeat1(seq($._module_elem,
          $._virtual_end_decl
        )),
      ),

    _module_elem: $ =>
      choice(
        $.annotation,
        $.alias,
        $.opaque,
        $.expect,
        $.value_declaration,
      ),


    expect: $ =>
      seq(
        "expect",
        $._virtual_open_section,
        field("body", $._expressions),
        $._virtual_end_section,
      ),
    value_declaration: $ =>
      choice(
        prec.right(100, seq(
          $.value_declaration_left,
          "=",
          $._virtual_open_section,
          field("body",$._expressions ),
          $._virtual_end_section,

        ),
        ),
      ),
    value_declaration_left: $ =>
      prec.left(10, seq(
        $._pattern,
      )),


    //
    // Top-level rules (END)
    //

    //
    // Pattern rules (BEGIN)
    _pattern: $ =>
      choice(
        // alias("null", $.null_pattern),
        alias("_", $.wildcard_pattern),
        alias($.const, $.const_pattern),
        $.identifier_pattern,
        $.as_pattern,
        $.disjunct_pattern,
        $.conjunct_pattern,
        $.cons_pattern,
        // $.repeat_pattern,
        $.paren_pattern,
        $.list_pattern,
        $.list_pattern,
        $.list_pattern,
        $.tag_pattern,
        $.record,
        $.tuple_pattern,
        $.range_pattern,
        // $.typed_pattern,
        // $.attribute_pattern,
        // :? atomic-type
        // :? atomic-type as ident
      ),

    // attribute_pattern: $ => prec.left(seq($.attributes, $._pattern)),

    paren_pattern: $ => seq("(", $._virtual_open_section, $._pattern, $._virtual_end_section, ")"),
    range_pattern: $ => seq(".."),

    repeat_pattern: $ =>
      prec.right(
        seq(
          $._pattern, ",",
          repeat(prec.right(seq($._virtual_end_decl, $._pattern, ","))),
          $._pattern
        )),
    tuple_pattern: $ =>
      prec.right(5,
        seq(
          '(',
          $._virtual_open_section,
          $._pattern, ",",
          repeat(prec.right(5, seq($._pattern, ","))),
          $._pattern,
          $._virtual_end_section,
          ')'
        )),

    identifier_pattern: $ =>
      prec.left(5,
        seq($.long_identifier, optional($._pattern_param), optional($._pattern)),
      ),

    as_pattern: $ => prec.left(0, seq($._pattern, "as", $.identifier)),
    cons_pattern: $ => prec.left(0, seq($._pattern, "::", $._pattern)),
    disjunct_pattern: $ => prec.left(0, seq($._pattern, "|", $._pattern)),
    conjunct_pattern: $ => prec.left(0, seq($._pattern, "&", $._pattern)),
    tag_pattern: $ => prec.left(3, seq(choice($.opaque_tag, $.tag), optional($._pattern,))),

    argument_patterns: $ => seq($._atomic_pattern, repeat(seq(",", $._atomic_pattern))),

    // field_pattern: $ => prec(1, seq($.long_identifier, '=', $._pattern)),

    _atomic_pattern: $ =>
      choice(
        "null",
        "_",
        $.const,
        $.long_identifier,
        $.list_pattern,
        $.tuple_pattern,
        $.record_pattern,
        $.tag_pattern,
        seq("(", $._virtual_open_section, $._pattern, $._virtual_end_section, ")"),

        // :? atomic_type
      ),

    list_pattern: $ =>
      prec(1,
        choice(
          seq('[', ']'),
          seq('[', $._pattern, repeat(prec(2, seq(",", $._pattern))), ']'))
      ),

    record_pattern: $ => $.record,
    record_destructure_pattern: $ => $.record_destructure,

    // record_pattern: $ =>
    //   prec.left(
    //     seq(
    //       '{', $.field_pattern, repeat(seq(";", $.field_pattern)))),

    _pattern_param: $ =>
      prec(2,
        choice(
          $.const,
          $.long_identifier,
          // seq($.long_identifier, $._pattern_param),
          // seq($._pattern_param, ":", $.type),
          // seq(
          //   "[",
          //   $._pattern_param,
          //   repeat(seq($._seperator, $._pattern_param)),
          //   "]",
          // ),
          // seq(
          //   "(",
          //   $._pattern_param,
          //   repeat(seq($._seperator, $._pattern_param)),
          //   ")",
          // ),
          // seq("<@", $._expression_inner, "@>"),
          // seq("<@@", $._expression_inner, "@@>"),
          // "null",
        )
      ),
    //
    // Pattern rules (END)
    //

    //
    // Expressions (BEGIN)
    //
    //

    //TODO: we should try to bring this back at some point
    // _seq_infix: $ =>
    //   prec.right(
    //     seq(
    //       $._expression_inner,
    //       repeat1(
    //         seq(
    //           $._virtual_end_decl,
    //           $.infix_op,
    //         ),
    //       ),
    //     )),


    _expressions: $ =>
      prec.left(PREC.SEQ_EXPR,
          // alias($._seq_infix, $.infix_expression),
      seq(
        $._expression_inner,
        repeat(seq($._virtual_end_decl, choice($._expression_inner, $.infix_newline))),
      ),
      ),


    //If i want to be able to combine these i need to be able to prefferentially match a whole token that is bigger than just the virtual_end_decl. but it's probably not worth my time  
    infix_newline: $ => seq($.infix_op, $._atom_context_expression),

    // _expressions: $ =>
    //   prec.left(PREC.SEQ_EXPR,
    //     choice(
    //       seq(
    //         $._expression_inner,
    //         repeat(
    //           seq($._virtual_end_decl, $._expressions)
    //         ))),
    //   ),


    /**
      *These expressions are all self contained and don't require any state before or after
      *this means these can be the start of a function call, or a function argument 
      *Note: This contains paren_expression meaning we could theoretically have anything be an atomic expression as long as it is wrapped in parens 
      */
    _atom_expression: $ => choice(

      // $.identifier_pattern,

      $.dot_expression,
      $.tuple_expression,
      $.const,
      $.paren_expression,
      $.record_update,
      $.record,
      // $.infix_newline,
      $.list_expression,
      $.prefixed_expression,
      $.index_expression,
      $.long_identifier_or_op,
      $.tag_expression,
      //NOTE: fun is both atomic and a keyword
      $.fun_expression,

      // $.long_identifier,
      // $.module_identifier,

    ),
    _atom_context_expression: $ => choice(

      $._atom_expression,
      $._contextual_expression,
      ),
    /**
    * these expressions ruqire parsing over other expressions and finding elments between them
      Something like an application_expression falls into this category because it matches a sequence of independant expressions that are a valid function call 
    */
    _contextual_expression: $ =>
      choice(
        $.infix_expression,
        $.application_expression,
      ),
    /**
    * expressions that perform assignment of variables 
    */
    _assignement_expression: $ =>
      choice(
        $.backpassing_expression,
        $.value_declaration,
      ),

    /**
    * expressions that are started by a keyword(including \ for function definition), these are mostly control flow expressions
    */
    _keyword_expression: $ =>
      choice(
        $.fun_expression,
        $.while_expression,
        $.for_expression,
        $.try_expression,
        $.if_expression,
        $.when_is_expression,
      ),

    _expression_inner: $ =>
      choice(
        $._keyword_expression,
        $._assignement_expression,
        $._atom_expression,
        $._contextual_expression,
      ),

    tag_expression: $ => prec.left(1001, seq(choice($.opaque_tag, $.tag), optional($._atom_expression))),
    // discard_expression: $ => '_',

    application_expression: $ =>
      prec.right(100,
        seq(
          field("caller", $._atom_expression
          ),
          alias(
            repeat1(
              prec.right(101,
                $._atom_expression
              ),
            ),
            $.args
          ),
        )
      ),


    tuple_expression: $ =>
      prec.left(PREC.TUPLE_EXPR,
        seq(
          "(",
          $._atom_context_expression,
          repeat1(prec.left(PREC.TUPLE_EXPR, seq(",", $._atom_context_expression))),
          ")",
        )
      ),

    prefixed_expression: $ =>
      prec.left(-1,
        seq(
          $.prefix_op,
          $._atom_context_expression,
        )),

    // yield_expression: $ =>
    //   prec.left(PREC.SPECIAL_PREFIX,
    //     seq(
    //       choice("yield", "yield!"),
    //       $._expression_inner,
    //     )),


    infix_expression: $ =>
      prec.right(PREC.SPECIAL_INFIX,
        seq(
          $._atom_context_expression,
          $.infix_op,
          $._atom_context_expression,
        )),

    paren_expression: $ => prec(PREC.PAREN_EXPR, seq("(", $._virtual_open_section, $._expressions, $._virtual_end_section, ")")),

    for_expression: $ =>
      prec.left(
        seq(
          "for",
          choice(
            seq($._pattern, "in", $._expression_or_range),
            seq($.identifier, "=", $._expression_inner, choice("to", "downto"), $._expression_inner),
          ),
          "do",
          $._virtual_open_section,
          $._expressions,
          $._virtual_end_section,
          optional("done"),
        )),

    while_expression: $ =>
      prec.left(
        seq(
          "while",
          $._expression_inner,
          "do",
          $._virtual_open_section,
          $._expressions,
          $._virtual_end_section,
          optional("done"),
        )),

    else_expression: $ =>
      prec(PREC.ELSE_EXPR,
        seq(
          "else",
          $._virtual_open_section,
          field("else_branch", $._expressions),
          $._virtual_end_section,
        )),
    then_expression:$=>
      seq(
          "then",
          $._virtual_open_section,
          field("then", $._expressions),
          $._virtual_end_section,
        ),
    elif_expression: $ =>
      prec(PREC.ELSE_EXPR,
        seq(
          "elif",
          field("guard", $._expression_inner),
        $.then_expression
        )),

    if_expression: $ =>
      prec.left(PREC.IF_EXPR,
        seq(
          "if",
          field("guard", $._atom_context_expression),
          $.then_expression,
          repeat($.elif_expression),
          $.else_expression,
        )),
    fun_expression: $ =>
      prec.right(PREC.FUN_EXPR,
        seq(
          $.backslash,
          $.argument_patterns,
          $.arrow,
          $._virtual_open_section,
          $._expressions,
          $._virtual_end_section,
        )),

    try_expression: $ =>
      prec(PREC.MATCH_EXPR,
        seq(
          "try",
          $._virtual_open_section,
          $._expressions,
          $._virtual_end_section,
          choice(
            seq("with", $.rules),
            seq("finally", $._virtual_open_section, $._expressions, $._virtual_end_section),
          ),
        )),

    when_is_expression: $ =>
      prec(PREC.MATCH_EXPR,
        seq(
          alias("when", $.when),
          $._expression_inner,
          alias("is", $.is),
          $.rules,
        )),

    backpassing_expression: $ =>
      prec.right(PREC.LARROW,
        seq(
          field("assignee", $._pattern),
          $.back_arrow,
          field("value", $._expression_inner),

        )),

    index_expression: $ =>
      prec(PREC.INDEX_EXPR,
        seq(
          $._expression_inner,
          optional(imm(".")),
          imm("["),
          $._virtual_open_section,
          field("index", $._expressions),
          $._virtual_end_section,
          "]",
        )),

    dot_expression: $ =>
      prec.right(PREC.DOT,
        seq(
          field("base", $._expression_inner),
          imm("."),
          field("field", $.long_identifier_or_op),
        )),

    _list_elements: $ =>
      prec.right(PREC.COMMA + 100,
        seq(
          $._virtual_open_section,
          $._expression_inner,
          repeat(prec.right(PREC.COMMA + 100, seq(',', $._expression_inner))),

          optional(','),
          $._virtual_end_section,
        ),
      ),

    _list_element: $ =>
      choice(
        $._list_elements,
      ),

    list_expression: $ =>
      prec(10,
        seq(
          "[",
          optional($._list_element),
          "]",
        )),

    range_expression: $ =>
      prec.left(PREC.DOTDOT,
        seq(
          $._expressions,
          "..",
          $._expressions,
          optional(seq(
            "..",
            $._expressions,
          )))),

    _expression_or_range: $ =>
      choice(
        $._expression_inner,
        $.range_expression,
      ),

    rule: $ =>
      prec.right(
        seq(
          $._pattern,
          $.arrow,
          $._virtual_open_section,
          $._expressions,
          $._virtual_end_section,
        )),

    rules: $ =>
      prec.right(PREC.MATCH_EXPR,
        seq(
          $._virtual_open_section,
          $.rule,
          repeat($.rule),
          $._virtual_end_section,
        )),

    //
    // Constants (BEGIN)
    //
    _escape_char: $ => imm(/\\["\'ntbrafv]/),
    escape_char: $ => imm(/\\["\'ntbrafv]/),
    _non_escape_char: $ => imm(/\\[^"\'ntbrafv]/),
    // using \u0008 to model \b
    _simple_char_char: $ => imm(/[^\n\t\r\u0008\a\f\v'\\]/),
    _hex_digit_imm: $ => imm(/[0-9a-fA-F]/),
    _digit_char_imm: $ => imm(/[0-9]/),

    _unicodegraph_short: $ => seq(
      imm('\\u'),
      $._hex_digit_imm,
      $._hex_digit_imm,
      $._hex_digit_imm,
      $._hex_digit_imm,
    ),
    _unicodegraph_long: $ => seq(
      imm('\\U'),
      $._hex_digit_imm,
      $._hex_digit_imm,
      $._hex_digit_imm,
      $._hex_digit_imm,
      $._hex_digit_imm,
      $._hex_digit_imm,
      $._hex_digit_imm,
      $._hex_digit_imm,
    ),
    _trigraph: $ => seq(imm('\\'), $._digit_char_imm, $._digit_char_imm, $._digit_char_imm),

    _char_char: $ => choice(
      $._simple_char_char,
      $._escape_char,
      $._trigraph,
      $._unicodegraph_short
    ),

    // note: \n is allowed in strings
    _simple_string_char: $ => imm(prec(1, /[^\t\r\u0008\a\f\v\\"]/)),
    _string_char: $ => choice(
      $._simple_string_char,
      $._non_escape_char,
      $._trigraph,
      $._unicodegraph_short,
      $._unicodegraph_long,
    ),

    // _string_elem: $ => choice(
    //   $._string_char,
    //   seq('\\', $._string_elem)
    // ),
    char: $ => seq("'", $._char_char, imm("'")),
    interpolation_char: $ => seq(imm(/\\\(/), $.ident, ')'),

    //TODO: make escaed chars work 
    string: $ => seq('"', repeat(choice(/[^\\"]/, $.interpolation_char, $.escape_char)), imm('"')),

    // string_escape: ($) => /\\(u\{[0-9A-Fa-f]{4,6}\}|[nrt\"'\\])/,
    // string_content: $ => repeat1(choice($.string_escape, /[^\"]+|\\/)),
    // string: $ => seq('"', optional($.string_content), '"'),
    // _verbatim_string_char: $ => choice(
    //   $._simple_string_char,
    //   $._non_escape_char,
    //   '\\',
    // ),
    // verbatim_string: $ => seq('@"', repeat($._verbatim_string_char), imm('"')),
    bytechar: $ => seq("'", $._char_char, imm("'B")),
    // bytearray: $ => seq('"', repeat($._string_char), imm('"B')),
    // verbatim_bytearray: $ => seq('@"', repeat($._verbatim_string_char), imm('"B')),
    // triple_quoted_string: $ => seq('"""', repeat($._string_char), imm('"""')),
    _newline: $ => /\r?\n/,

    unit: $ => seq("(", optional(seq($._virtual_open_section, $._virtual_end_section)), ")"),

    const: $ => choice(
      //       $.sbyte, $.int16, $.int32, $.int64, $.byte, $.uint16, $.uint32, 
      //       $.nativeint, $.unativeint, $.decimal,
      //       $.uint64, $.ieee32, $.ieee64, $.bignum, 

      // $.bytechar,       // $.verbatim_string, 
      // $.triple_quoted_string, 
      // $.bytearray,
      // $.verbatim_bytearray

      $.float,
      $.xint,
      $.decimal,
      $.natural,
      $.uint,
      $.iint,

      $.char, $.string,
      $.int,
      "false", "true", $.unit),

    // Identifiers:
    long_identifier_or_op: $ => prec.right(30,

      alias(
        choice(
          $.long_identifier,
          seq($.long_identifier, ".", $._op_call),
          $._op_call
        ),
        $.long_identifier)
    ),

    long_identifier: $ =>
      prec(100,

        seq(alias(optional(/[A-Z][A-Za-z_]*(\.[A-Z][A-Za-z_]*)*\./), $.module), $.identifier)),
    // seq(alias(repeat(prec.right(100,seq($._upper_identifier,'.'))),$.module), $.identifier)),
    // seq(optional(seq($.module,$.dot)), $.identifier)),

    _op_call: $ => choice(
      seq('(', $.op_name, ')'),
      "(*)"
    ),

    op_name: $ => choice(
      $.symbolic_op,
      $.range_op_name,
      $.active_pattern_op_name
    ),
    range_op_name: $ => choice(
      "..",
      ".. .."
    ),
    active_pattern_op_name: $ => choice(
      // full pattern
      seq("|", $.identifier, repeat1(seq("|", $.identifier)), "|"),
      // partial pattern
      seq("|", $.identifier, repeat(seq("|", $.identifier)), "|", "_", "|"),
    ),

    _infix_or_prefix_op: $ =>
      choice(
        "+",
        "-",
        "+.",
        "-.",
        "%",
        "&",
        "&&",
      ),

    prefix_op: $ =>
      prec.left(
        choice(
          $._infix_or_prefix_op,
          repeat1("~"),
          $.symbolic_op,
        )),

    infix_op: $ =>
      prec(PREC.INFIX_OP,
        choice(
          $._infix_or_prefix_op,
          $.symbolic_op,
          "||",
          "==",
          ">=",
          "<=",
          "!=",
          ":=",
          "::",
          "$",
          "or",
          "?",
        )),

    // Symbolic Operators
    _quote_op_left: $ => choice("<@", "<@@"),
    _quote_op_right: $ => choice("@>", "@@>"),
    symbolic_op: $ => choice(
      "?",
      "?<-",
      /[!%&*+-./<>@^|~][!%&*+-./<>@^|~?]*/,
      $._quote_op_left,
      $._quote_op_right),

    // Numbers
    _octaldigit_imm: $ => imm(/[0-7]/),
    _bitdigit_imm: $ => imm(/[0-1]/),
    int: $ => token(seq(/[0-9][0-9_]*/,)),

    //ROC
    uint: $ => token(seq(/[0-9][0-9_]*/, imm(/u(32|8|16|64|128)/))),
    iint: $ => token(seq(/[0-9][0-9_]*/, imm(/i(32|8|16|64|128)/))),
    decimal: $ => token(/[0-9]+(\.)?[0-9]*(dec)/),
    natural: $ => token(/[0-9]+(nat)/),

    float: $ => token(
      seq(/[0-9]+(\.)?[0-9]*((f32)|(f64))?/)),
    _hex_int: $ =>
      token(seq(/0[x][0-9abcdef]*/,)),
    _binary_int: $ =>
      token(seq(/0[b]/, /[01][01_]*/)),
    xint: $ => choice(
      $._binary_int,
      $._hex_int
    ),
    //ROC

    bignum: $ => seq($.int, imm(/[QRZING]/)),

    sbyte: $ => seq(choice($.int, $.xint), imm('y')),
    byte: $ => seq(choice($.int, $.xint), imm('uy')),
    int16: $ => seq(choice($.int, $.xint), imm('s')),

    int32: $ => seq(choice($.int, $.xint), imm('l')),
    uint32: $ => seq(choice($.int, $.xint), imm(choice('ul', 'u'))),
    nativeint: $ => seq(choice($.int, $.xint), imm('n')),
    unativeint: $ => seq(choice($.int, $.xint), imm('un')),
    int64: $ => seq(choice($.int, $.xint), imm('L')),


    //
    // Constants (END)
    //

    block_comment: $ => seq("(*", $.block_comment_content, "*)"),
    // line_comment: $ => token(seq('//', /[^\n\r]*/)),


    //   /[_\p{XID_Start}][_'\p{XID_Continue}]*/,
    //   /``([^`\n\r\t])+``/ //TODO: Not quite the spec
    // ),



    identifier: $ => $._lower_identifier,
    _lower_identifier: $ =>
      /[a-z][0-9a-zA-Z_]*/,
    _upper_identifier: $ => /[A-Z][0-9a-zA-Z_]*/,
    long_module_name: $ =>
      seq($.module,
        repeat(seq('.', $._upper_identifier)
        ))
    ,
    tag: $ => $._upper_identifier,
    module: $ => prec(2, $._upper_identifier),
    opaque_tag: $ => token(seq('@', /[A-Z][0-9a-zA-Z_]*/)),
    dot: $ => ("."),
    dot_curly: $ => (".{"),
    ident: $ => choice($._lower_identifier, $._upper_identifier),



    ///BEGIN roc
    // record_field: $ => prec.left(
    //   seq(
    //     $._lower_identifier, optional(seq(":", $._pattern)
    //     ))
    // ),
    record_field_expr: $ => prec.left(
      seq(
        $.identifier, optional(seq(":", repeat1($._expression_inner))
        ))
    ),
    record: ($) => seq("{", sep_tail($.record_field_expr, ","), "}"),

    record_destructure: $ => seq('{', sep_tail($.ident, ","), '}'),

    record_update: $ => seq('{', $.identifier, "&", sep1_tail($.record_field_expr, ","), '}'),




    exposes_list: $ => seq('{', sep_tail($.ident, ','), '}'),
    exposes: $ => seq("exposes", "[", sep_tail($.ident, ","), ']'),

    imports: $ => seq(
      "imports",
      '[',
      sep_tail($.imports_entry, ','),
      ']'),
    imports_entry: $ => seq(
      optional(seq($.identifier, ".")),
      $.long_module_name,
      optional(seq('.', $.exposes_list))
    )
    ,




    //TODO make a function for all these comma separated trailing comma things
    to: $ => "to",
    provides: $ => seq("provides", '[', optional($.ident), repeat(seq(",", $.ident)), optional(","), ']', optional(seq($.to, choice($.string, $.ident)))),


    app_header: $ => seq("app", alias($.string, $.app_name), $._virtual_open_section, $.app_header_body, $._virtual_end_section),
    packages: $ => seq("packages", $.record),
    app_header_body: $ => sep1(choice($.packages, $.imports, $.provides), $._virtual_end_decl),
    //TODO make this a function for app and platform
    platform_header: $ => seq("platform", alias($.string, $.name), $._virtual_open_section, $.platform_header_body, $._virtual_end_section),

    platform_header_body: $ => sep1(choice(
      $.requires,
      $.exposes,
      $.packages,
      $.imports,
      $.provides,
      $.effects), $._virtual_end_decl),

    interface_header: $ => seq(
      "interface",
      alias(sep1($._upper_identifier, "."), $.name),
      $._virtual_open_section,
      $.interface_header_body,
      $._virtual_end_section
    ),

    interface_header_body: $ => sep1_tail(choice(
      $.exposes,
      $.imports,
    ), $._virtual_end_decl),


    _module_header: $ =>
      seq(choice(
        $.app_header,
        $.platform_header,
        $.interface_header),
        //sometimes it seems we have an unmatched close which stops this from ending and breaks everything after
        optional($._virtual_end_decl)),

    type_annotation: $ =>
      prec(PREC.TYPE,
        choice(
          $._type_annotation_no_fun,
          $.function_type,
        )),

    _type_annotation_paren_fun: $ => prec.right(choice(
      $._type_annotation_no_fun,
      seq('(', $.function_type, ')'))
    ),

    function_type: $ => seq(sep1(field("param", $._type_annotation_paren_fun), ","), $.arrow, repeat(seq($._type_annotation_paren_fun, $.arrow)), $._type_annotation_paren_fun),

    _type_annotation_no_fun: $ => prec.right(choice(
      seq('(', $._type_annotation_no_fun_body, ')'),
      $._type_annotation_no_fun_body,
    )),

    _type_annotation_no_fun_body: $ => choice(
      $.apply_type,
      $.implements,
      $.tags_type,
      $.bound_variable,
      $.record_type,
      $.inferred,
      $.wildcard
    ),

    implements: $ => prec.right(seq($.identifier, "where", sep1($._implements_body, ","))),
    _implements_body: $ => seq($.identifier, "implements", $.ability_chain),
    _ability: $ => sep1($._upper_identifier, "."),
    ability_chain: $ => sep1($._ability, "&"),



    tag_union: $ => choice(
      prec(1, seq('[', ']')),
      seq('[', $.tags, ']',
        optional($.type_variable))
    ),

    tags: $ => choice(
      prec(1, $._tags_only),
      seq($._virtual_open, $._tags_only, $._virtual_close),
    ),
    tags_type: $ => prec(PREC.TYPE, seq('[', optional($._tags_only), ']')),

    _tags_only: $ => seq(
      // optional(T('SameIndent')),
      $.apply_type,
      // optional(T('SameIndent')),
      repeat(
        seq(",", $.apply_type)
      )
      ,
      optional(",")
      // optional(T('SameIndent'))
    ),

    type_variable: $ => choice(
      "_",
      $.bound_variable
    ),

    bound_variable: $ => $._lower_identifier,

    wildcard: $ => '*',

    inferred: $ => '_',

    apply_type: $ => prec.right(PREC.TYPE, seq(
      $.concrete_type,
      optional($.apply_type_args)
    )),

    concrete_type: $ => prec(1, seq(
      $._upper_identifier,
      repeat(seq('.', $._upper_identifier))
    )),

    //we need a n optional \n to stop this eating the value that follows it 
    apply_type_args: $ => prec.right(seq(repeat1($.apply_type_arg), optional('\n'))),

    apply_type_arg: $ => prec.left(choice(
      $._type_annotation_no_fun,
    )),

    requires: $ => seq(
      "requires",
      $.requires_rigids,
      '{',
      $.typed_ident,
      '}',

    ),

    requires_rigids: $ => choice(
      seq('{', optional(seq($.requires_rigid, repeat(seq(',', $.requires_rigid)), optional(','))), '}')
    ),

    requires_rigid: $ => seq(
      $.identifier,
      optional(seq('=>', $._upper_identifier))
    ),

    record_empty: $ => prec(1, seq('{', '}')),
    record_type: $ => seq('{',
      sep_tail($.record_field_type, ','),
      '}'),

    record_field_type: $ => seq(
      $.ident,
      ":",
      $.type_annotation
    ),
    typed_ident: $ => seq(
      $.identifier,
      ':',
      $.type_annotation
    ),


    annotation_pre_colon: $ =>
      choice(
        //TODO implimeent apply $.apply,
        $.tag,
        $.identifier
      ),
    /**
    *The top level entry into type annotations 
    */
    annotation: $ =>
      seq(
        $.annotation_pre_colon, ':', $.type_annotation
      ),
    alias: $ =>
      seq($.apply_type, ":", $.type_annotation, $._virtual_end_decl),
    opaque: $ =>
      seq($.apply_type, ":=", $.type_annotation, $._virtual_end_decl),

    effects: $ => seq(
      // '__',
      'effects',
      $.effect_name,
      $.record_type
    ),

    effect_name: $ => seq(
      $.identifier,
      '.',
      $._upper_identifier
    ),

    line_comment: ($) => token(prec(1, seq(/#/, repeat(/[^\n]/)))),


    _virtual_open: $ => $._virtual_open_section,
    _virtual_close: $ => $._virtual_end_section,


    backslash: $ => '\\',
    arrow: $ => '->',
    back_arrow: $ => '<-',


  }

});
function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}
function sep1_tail(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)), optional(separator));
}
function sep_tail(rule, separator) {
  return optional(sep1_tail(rule, separator))
}
