function imm(x) {
	return token.immediate(x);
}

const PREC = {
	SEQ_EXPR: 1,
	APP_EXPR: 100,
	APP_EXPR_INNER: 106,
	THEN_EXPR: 198,
	RARROW: 3,
	INFIX_OP: 4,
	NEW_EXPR: 5,
	LET_EXPR: 150,
	LET_DECL: 7,
	FUN_EXPR: 200,
	MATCH_EXPR: 8,
	MATCH_DECL: 9,
	DO_DECL: 10,
	ELSE_EXPR: 199,
	INTERFACE: 12,
	COMMA: 13,
	DOTDOT: 14,
	//these are all tuned together
	SEQ_INFIX: 80,
	SEQ_INFIX_INNER: 81,
	SPECIAL_INFIX: 81,
	// SPECIAL_PREFIX: 85,

	LARROW: 19,
	TUPLE_EXPR: 300,
	DO_EXPR: 20,
	IF_EXPR: 200,
	// DOT: 19,
	DOT: 24,
	INDEX_EXPR: 25,
	PAREN_APP: 27,
	TYPED_EXPR: 28,
	//roc
	TYPE: 0,
	PAREN_EXPR: 25,
	DOTDOT_SLICE: 28,
};

module.exports = grammar({
	name: "roc",

	// The external scanner (scanner.cc) allows us to inject "dummy" tokens into the grammar.
	// These tokens are used to track the indentation-based scoping used in F#
	externals: ($) => [
		$._virtual_open_section, // Signal the external scanner that a new indentation scope should be opened. Add the indetation size to the stack.
		$._virtual_end_section, // end an indentation scope, popping the indentation off the stack.
		$._virtual_end_decl, // end an indentation scope with equal alignment, popping the indentation off the stack.
		$.block_comment_content,
	],

	extras: ($) => [
		$.block_comment,
		$.line_comment,
		/[ \s\f\uFEFF\u2060\u200B]|\\\r?n/,
	],

	conflicts: ($) => [
		[$.identifier_pattern, $.long_identifier_or_op],
		[$.symbolic_op, $.infix_op],
		// [$.prefix_op, $.infix_op],
		[$.long_module_name],
		// [$.application_expression, $.infix_expression],
		// [$.application_expression, $.infix_expression, $._pattern],
		[$._expression_inner, $._pattern],
		[$._type_annotation_paren_fun, $._type_annotation],
		[$._pattern, $.record_field_expr],
		[$.concrete_type, $.tag],
		[$._expression_no_infix_seq, $._expression_inner],
		[$.application_expression, $.infix_expression],
		[$.infix_expression],
		[$.application_args],
		// [$.prefixed_expression, $.infix_expression],
	],

	words: ($) => $.ident,

	inline: ($) => [
		$._assignement_expression,
		$._keyword_expression,
		$._contextual_expression,
		$._atom_expression,
		$._atom_context_expression,
		$._atom_context_fun_expression,
		$._expression_inner,
		$._module_elem,
		$._virtual_open,
		$._virtual_close,
		$._infix_or_prefix_op,
		$._quote_op_left,
		$._quote_op_right,
		$._inner_literal_expressions,
		// $._expression_or_range,
		$._infix_expression_inner,
		$._seq_expressions,
		$._seq_inline,
	],

	supertypes: ($) => [$._module_elem, $._pattern, $._expression_inner],

	rules: {
		//
		// Top-level rules (BEGIN)
		//
		file: ($) =>
			seq(
				optional(seq($._module_header)),
				repeat1(seq($._module_elem, $._virtual_end_decl)),
			),

		_module_elem: ($) =>
			choice(
				$.annotation_type_def,
				$.alias_type_def,
				$.opaque_type_def,
				$.expect,
				$.implements_definition,
				$.value_declaration_top,
			),

		expect: ($) =>
			seq(
				"expect",
				$._virtual_open,
				field("body", $.expression_body),
				$._virtual_close,
			),

		value_declaration: ($) =>
			choice(
				prec.left(
					PREC.LET_EXPR,

					seq(
						optional($.annotation_type_def),
						// $._virtual_end_decl,
						$.value_declaration_left,
						"=",
						$._virtual_open,
						field("body", $.expression_body),
						$._virtual_close,
					),
				),
			),
		expression_body: ($) =>
			seq(
				repeat(
					seq(
						choice($.value_declaration, $.backpassing_expression),
						$._virtual_end_decl,
					),
				),
				$._expression_inner,
			),

		//An expression body that may or may not be indented
		//TODO: use this everywhewe
		_expression_body_maybe_block: ($) =>
			choice(
				seq("\n", $._virtual_open, $.expression_body, $._virtual_close),
				seq($.expression_body),
			),

		value_declaration_top: ($) =>
			choice(
				prec.left(
					PREC.LET_EXPR,

					seq(
						optional($.annotation_type_def),
						$.value_declaration_left,
						"=",
						$._virtual_open,
						field("body", $.expression_body),
						optional($._virtual_close),
					),
				),
			),
		value_declaration_left: ($) => seq($._pattern),

		//
		// Top-level rules (END)
		//

		//
		// Pattern rules (BEGIN)
		_pattern: ($) =>
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

		paren_pattern: ($) => seq("(", $._pattern, ")"),
		range_pattern: ($) => seq(".."),

		repeat_pattern: ($) =>
			prec.right(
				seq(
					$._pattern,
					",",
					repeat(prec.right(seq($._virtual_end_decl, $._pattern, ","))),
					$._pattern,
				),
			),
		tuple_pattern: ($) =>
			prec.right(
				PREC.TUPLE_EXPR,
				seq(
					"(",
					$._pattern,
					",",
					repeat(prec.right(seq($._pattern, ","))),
					$._pattern,
					")",
				),
			),

		identifier_pattern: ($) =>
			prec.left(
				seq(
					$.long_identifier,
					// optional($._pattern_param),
					// optional($._pattern),
				),
			),

		as_pattern: ($) => prec.left(0, seq($._pattern, "as", $.identifier)),
		cons_pattern: ($) => prec.left(0, seq($._pattern, "::", $._pattern)),
		disjunct_pattern: ($) => prec.left(0, seq($._pattern, "|", $._pattern)),
		conjunct_pattern: ($) => prec.left(0, seq($._pattern, "&", $._pattern)),
		tag_pattern: ($) =>
			prec.left(
				3,
				seq(choice($.opaque_tag, $.tag), repeat(prec(-1, $._pattern))),
			),

		argument_patterns: ($) =>
			seq($._atomic_pattern, repeat(seq(",", $._atomic_pattern))),

		// field_pattern: $ => prec(1, seq($.long_identifier, '=', $._pattern)),

		_atomic_pattern: ($) =>
			choice(
				"null",
				"_",
				$.const,
				$.long_identifier,
				$.list_pattern,
				$.tuple_pattern,
				$.record_pattern,
				$.tag_pattern,
				$.range_pattern,
				seq("(", $._pattern, ")"),

				// :? atomic_type
			),

		list_pattern: ($) =>
			prec(
				1,
				choice(
					seq("[", "]"),
					seq("[", $._pattern, repeat(seq(",", $._pattern)), "]"),
				),
			),

		record_pattern: ($) =>
			seq(
				"{",
				sep_tail(
					choice(
						$.record_field_type,
						$.record_field_optional_pattern,
						$.identifier,
					),
					",",
				),
				"}",
			),
		record_field_optional_pattern: ($) =>
			seq($.identifier, "?", $._atom_context_expression),

		// record_pattern: $ =>
		//   prec.left(
		//     seq(
		//       '{', $.field_pattern, repeat(seq(",", $.field_pattern)))),

		_pattern_param: ($) =>
			prec(
				2,
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
				),
			),
		//
		// Pattern rules (END)
		//

		//
		// Expressions (BEGIN)
		//
		//

		//TODO: we should try to bring this back at some point
		seq_infix: ($) =>
			prec.right(
				PREC.SEQ_INFIX,
				seq(
					$._atom_context_expression,
					$._virtual_end_decl,
					repeat(
						prec(
							PREC.SEQ_INFIX_INNER,
							seq(
								$.infix_op,
								$._atom_context_fun_expression,
								//TODO the fact that we sometimes get two is a problem

								optional($._virtual_end_decl),
								$._virtual_end_decl,
							),
						),
					),
					seq(
						$.infix_op,
						$._atom_context_expression,
						optional($._virtual_end_decl),
					),
				),
			),

		// _expressions: ($) =>
		// 	prec.left(
		// 		PREC.SEQ_EXPR,
		// 		// alias($._seq_infix, $.infix_expression),
		// 		seq(
		// 			$._expression_inner,
		// 			repeat(
		// 				seq(
		// 					$._virtual_end_decl,
		// 					choice($._expression_inner, $.infix_newline),
		// 				),
		// 			),
		// 		),
		// 	),

		//If i want to be able to combine these i need to be able to prefferentially match a whole token that is bigger than just the virtual_end_decl. but it's probably not worth my time
		//TODO: try to fix this
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
		// infix_newline: ($) =>
		// 	prec(200, seq($.infix_op, $._atom_context_expression)),
		_atom_expression: ($) =>
			choice(
				// $.identifier_pattern,

				$.dot_expression,
				$.tuple_expression,
				$.const,
				$.paren_expression,
				$.record_update,
				$.record,
				// $.infix_newline,
				$.list_expression,
				// $.prefixed_expression,
				$.index_expression,
				$.long_identifier_or_op,
				$.tag_expression,
				//NOTE: fun is both atomic and a keyword

				// $.long_identifier,
				// $.module_identifier,
			),
		_atom_context_expression: ($) =>
			choice($._atom_expression, $._contextual_expression),
		_atom_context_fun_expression: ($) =>
			choice($._atom_expression, $._contextual_expression, $.fun_expression),
		/**
    * these expressions ruqire parsing over other expressions and finding elments between them
      Something like an application_expression falls into this category because it matches a sequence of independant expressions that are a valid function call 
    */
		_contextual_expression: ($) =>
			choice(
				$.infix_expression,
				$.application_expression,
				// $.seq_infix,
			),
		/**
		 * expressions that perform assignment of variables or types
		 */
		_assignement_expression: ($) =>
			choice(
				// $.backpassing_expression,
				// $.value_declaration,
				// $.annotation_type_def,
				// $.alias_type_def,
				// $.opaque_type_def,
			),

		/**
		 * expressions that are started by a keyword(including \ for function definition), these are mostly control flow expressions
		 */
		_keyword_expression: ($) =>
			choice(
				$.fun_expression,
				// $.while_expression,
				// $.for_expression,
				// $.try_expression,
				$.if_expression,
				$.when_is_expression,
			),
		_expression_no_infix_seq: ($) =>
			choice(
				// $._keyword_expression,
				// $._assignement_expresson,
				$._atom_expression,
				$._contextual_expression,
			),

		_expression_inner: ($) =>
			choice(
				$.seq_infix,
				// $.if_expression,
				// $.long_identifier_or_op,
				$._keyword_expression,
				// $._assignement_expression,
				$._atom_context_expression,
			),

		tag_expression: ($) =>
			prec.left(
				1001,
				seq(choice($.opaque_tag, $.tag), optional($._atom_expression)),
			),
		// discard_expression: $ => '_',
		application_args: ($) =>
			prec(
				PREC.APP_EXPR_INNER,
				seq(
					repeat(prec(PREC.APP_EXPR_INNER, $._atom_expression)),
					choice($._atom_expression, $.fun_expression),
				),
			),
		application_expression: ($) =>
			prec(
				PREC.APP_EXPR,
				seq(field("caller", $._atom_expression), $.application_args),
			),

		tuple_expression: ($) =>
			prec.right(
				PREC.TUPLE_EXPR,
				seq("(", $._expression_inner, ",", sep1($._expression_inner, ","), ")"),
			),

		// prefixed_expression: ($) =>
		// 	prec.left(
		// 		PREC.SPECIAL_PREFIX,
		// 		seq($.infix_op, $._atom_context_expression),
		// 	),

		// yield_expression: $ =>
		//   prec.left(PREC.SPECIAL_PREFIX,
		//     seq(
		//       choice("yield", "yield!"),
		//       $._expression_inner,
		//     )),

		infix_expression: ($) =>
			prec.right(
				PREC.SPECIAL_INFIX,
				seq(
					optional($._atom_context_fun_expression),
					$.infix_op,
					$._atom_context_fun_expression,
				),
			),

		paren_expression: ($) =>
			prec(PREC.PAREN_EXPR, seq("(", $._expression_inner, ")")),

		// for_expression: ($) =>
		// 	prec.left(
		// 		seq(
		// 			"for",
		// 			choice(
		// 				seq($._pattern, "in", $._expression_or_range),
		// 				seq(
		// 					$.identifier,
		// 					"=",
		// 					$._expression_inner,
		// 					choice("to", "downto"),
		// 					$._expression_inner,
		// 				),
		// 			),
		// 			"do",
		// 			$._virtual_open_section,
		// 			$._expression_inner,
		// 			$._virtual_close,
		// 			optional("done"),
		// 		),
		// 	),

		while_expression: ($) =>
			prec.left(
				seq(
					"while",
					$._expression_inner,
					"do",
					$._expression_inner,
					optional("done"),
				),
			),

		_if: ($) => prec(2000, "if"),
		_else: ($) => prec(2000, "else"),
		_then: ($) => prec(2000, "then"),
		// indented_if: ($) =>
		// 	prec(
		// 		PREC.IF_EXPR,
		// 		seq(
		// 			$._if,
		// 			field("guard", $._atom_context_expression),
		// 			$._then,
		// 			$._virtual_open,
		// 			alias(field("then", $.expression_body), $.then),
		// 			$._virtual_close,
		// 			$._else,
		// 			$._virtual_open,
		// 			alias(field("else_branch", $.expression_body), $.else),
		// 			$._virtual_close,
		// 		),
		// 	),

		_else_expression: ($) =>
			prec(
				PREC.ELSE_EXPR,
				seq(
					$._else,
					$._virtual_open,
					alias(field("else_branch", $.expression_body), $.else),
					$._virtual_close,
				),
			),

		_then_expression: ($) =>
			seq(
				$._then,
				optional($._virtual_open),
				alias(field("then", $.expression_body), $.then),
				optional($._virtual_close),
			),
		elif_expression: ($) =>
			prec(
				PREC.ELSE_EXPR,
				seq(
					"elif",
					field("guard", $._expression_inner),
					"then",
					alias(field("then", $._expression_body_maybe_block), $.then),
				),
			),

		if_expression: ($) =>
			prec.left(
				PREC.IF_EXPR,
				seq(
					$._if,
					field("guard", $._expression_inner),
					$._then_expression,
					repeat($.elif_expression),
					$._else_expression,
				),
			),
		// if_expression: ($) =>
		// 	prec.left(PREC.IF_EXPR, choice($.inline_if, $.indented_if)),

		inline_if: ($) =>
			prec(
				PREC.IF_EXPR,
				seq(
					$._if,
					field("guard", $._atom_context_expression),
					$._then,
					alias(field("then", $._atom_context_expression), $.then),
					$._else,
					alias(field("else", $._atom_context_expression), $.else),
				),
			),
		fun_expression: ($) =>
			prec.right(
				PREC.FUN_EXPR,
				seq(
					$.backslash,
					$.argument_patterns,
					$.arrow,
					$._expression_body_maybe_block,
				),
			),

		// try_expression: ($) =>
		// 	prec(
		// 		PREC.MATCH_EXPR,
		// 		seq(
		// 			"try",
		// 			$._expression,
		// 			choice(
		// 				seq("with", $.rules),
		// 				seq("finally",  $._expression, $._virtual_close),
		// 			),
		// 		),
		// 	),

		when_is_expression: ($) =>
			prec(
				PREC.MATCH_EXPR,
				seq(
					alias("when", $.when),
					$._expression_inner,
					alias("is", $.is),
					$.rules,
				),
			),

		rule: ($) =>
			prec.right(
				1000,
				seq(
					$._pattern,
					$.arrow,
					optional($._virtual_open),
					$.expression_body,
					optional($._virtual_close),
				),
			),

		rules: ($) =>
			prec.right(
				PREC.MATCH_EXPR,
				seq($._virtual_open, $.rule, repeat($.rule), $._virtual_close),
			),
		backpassing_expression: ($) =>
			prec.left(
				PREC.LARROW,
				seq(
					field("assignee", $._pattern),
					$.back_arrow,
					field("value", $._atom_context_expression),
					$._virtual_end_decl,
				),
			),

		index_expression: ($) =>
			prec(
				PREC.INDEX_EXPR,
				seq(
					$._expression_inner,
					optional(imm(".")),
					imm("["),
					field("index", $._atom_context_expression),
					"]",
				),
			),

		dot_expression: ($) =>
			prec.right(
				PREC.DOT,
				seq(
					field("base", $._expression_inner),
					imm("."),
					field("field", $.long_identifier_or_op),
				),
			),

		_list_elements: ($) =>
			prec.right(
				PREC.COMMA + 100,
				seq(
					$._expression_inner,
					repeat(prec.right(PREC.COMMA + 100, seq(",", $._expression_inner))),

					optional(","),
					optional($._virtual_end_decl),
				),
			),

		_list_element: ($) => choice($._list_elements),

		list_expression: ($) => prec(10, seq("[", optional($._list_element), "]")),

		// range_expression: ($) =>
		// 	prec.left(
		// 		PREC.DOTDOT,
		// 		seq(
		// 			$._atom_context_expression,
		// 			"..",
		// 			$._atom_context_expression,
		// 			optional(seq("..", $._atom_context_expression)),
		// 		),
		// 	),

		// _expression_or_range: ($) =>
		// 	choice($._expression_inner, $.range_expression),

		//
		// Constants (BEGIN)
		//

		_unicodegraph_short: ($) =>
			seq(
				imm("\\u"),
				$._hex_digit_imm,
				$._hex_digit_imm,
				$._hex_digit_imm,
				$._hex_digit_imm,
			),
		_unicodegraph_long: ($) =>
			seq(
				imm("\\U"),
				$._hex_digit_imm,
				$._hex_digit_imm,
				$._hex_digit_imm,
				$._hex_digit_imm,
				$._hex_digit_imm,
				$._hex_digit_imm,
				$._hex_digit_imm,
				$._hex_digit_imm,
			),
		_trigraph: ($) =>
			seq(imm("\\"), $._digit_char_imm, $._digit_char_imm, $._digit_char_imm),
		_escape_char: ($) => imm(/\\[\\"\'ntbrafv]/),
		escape_char: ($) => imm(/\\[\\"\'ntbrafv]/),
		_non_escape_char: ($) => imm(/\\[^"\'ntbrafv]/),
		// using \u0008 to model \b
		_simple_char_char: ($) => imm(/[^\n\t\r\u0008\a\f\v'\\]/),
		_hex_digit_imm: ($) => imm(/[0-9a-fA-F]/),
		_digit_char_imm: ($) => imm(/[0-9]/),

		_char_char: ($) =>
			choice(
				$._simple_char_char,
				$._escape_char,
				$._trigraph,
				$._unicodegraph_short,
			),

		// note: \n is allowed in strings
		_simple_string_char: ($) => imm(prec(1, /[^\t\r\u0008\a\f\v\\"]/)),
		_string_char: ($) =>
			choice(
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
		char: ($) => seq("'", choice($.escape_char, $._simple_char_char), imm("'")),
		interpolation_char: ($) => seq(imm(/\\\(/), $.ident, ")"),

		//TODO: make escaed chars work
		string: ($) =>
			seq(
				'"',
				repeat(choice(/[^\\"]/, $.interpolation_char, $.escape_char)),
				imm('"'),
			),

		// string_escape: ($) => /\\(u\{[0-9A-Fa-f]{4,6}\}|[nrt\"'\\])/,
		// string_content: $ => repeat1(choice($.string_escape, /[^\"]+|\\/)),
		// string: $ => seq('"', optional($.string_content), '"'),
		// _verbatim_string_char: $ => choice(
		//   $._simple_string_char,
		//   $._non_escape_char,
		//   '\\',
		// ),
		// verbatim_string: $ => seq('@"', repeat($._verbatim_string_char), imm('"')),
		bytechar: ($) => seq("'", $._char_char, imm("'B")),
		// bytearray: $ => seq('"', repeat($._string_char), imm('"B')),
		// verbatim_bytearray: $ => seq('@"', repeat($._verbatim_string_char), imm('"B')),
		// triple_quoted_string: $ => seq('"""', repeat($._string_char), imm('"""')),
		_newline: ($) => /\r?\n/,

		unit: ($) => seq("(", ")"),

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
				$.int,
				"false",
				"true",
				// $.unit,
			),

		// Identifiers:
		long_identifier_or_op: ($) =>
			prec.right(
				1,

				alias(
					choice(
						$.long_identifier,
						seq($.long_identifier, ".", $._op_call),
						$._op_call,
					),
					$.long_identifier,
					// $._virtual_end_decl,
				),
			),

		long_identifier: ($) =>
			prec(
				1,

				seq(
					alias(optional(/[A-Z][A-Za-z_]*(\.[A-Z][A-Za-z_]*)*\./), $.module),
					$.identifier,
				),
			),
		// seq(alias(repeat(prec.right(100,seq($._upper_identifier,'.'))),$.module), $.identifier)),
		// seq(optional(seq($.module,$.dot)), $.identifier)),

		_op_call: ($) => choice(seq("(", $.op_name, ")"), "(*)"),

		op_name: ($) =>
			choice(
				$.symbolic_op,
				// $.range_op_name,
				$.active_pattern_op_name,
			),
		// range_op_name: ($) => choice("..", ".. .."),
		active_pattern_op_name: ($) =>
			choice(
				// full pattern
				seq("|", $.identifier, repeat1(seq("|", $.identifier)), "|"),
				// partial pattern
				seq("|", $.identifier, repeat(seq("|", $.identifier)), "|", "_", "|"),
			),

		_infix_or_prefix_op: ($) => choice("+", "-", "+.", "-.", "%", "&", "&&"),

		// prefix_op: ($) => prec(0, choice($._infix_or_prefix_op, $.symbolic_op)),

		infix_op: ($) =>
			prec(
				PREC.INFIX_OP,
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
				),
			),

		// Symbolic Operators
		_quote_op_left: ($) => choice("<@", "<@@"),
		_quote_op_right: ($) => choice("@>", "@@>"),
		symbolic_op: ($) =>
			choice(
				"?",
				"?<-",
				/[!%&*+-./<>@^|~][!%&*+-./<>@^|~?]*/,
				$._quote_op_left,
				$._quote_op_right,
			),

		// Numbers
		_octaldigit_imm: ($) => imm(/[0-7]/),
		_bitdigit_imm: ($) => imm(/[0-1]/),
		int: ($) => token(seq(/[0-9][0-9_]*/)),

		//ROC
		uint: ($) => token(seq(/[0-9][0-9_]*/, imm(/u(32|8|16|64|128)/))),
		iint: ($) => token(seq(/[0-9][0-9_]*/, imm(/i(32|8|16|64|128)/))),
		decimal: ($) => token(/[0-9]+(\.)?[0-9]*(dec)/),
		natural: ($) => token(/[0-9]+(nat)/),

		float: ($) => token(seq(/[0-9]+(\.)?[0-9]*((f32)|(f64))?/)),
		_hex_int: ($) => token(seq(/0[x][0-9abcdef]*/)),
		_binary_int: ($) => token(seq(/0[b]/, /[01][01_]*/)),
		xint: ($) => choice($._binary_int, $._hex_int),
		//ROC

		bignum: ($) => seq($.int, imm(/[QRZING]/)),

		sbyte: ($) => seq(choice($.int, $.xint), imm("y")),
		byte: ($) => seq(choice($.int, $.xint), imm("uy")),
		int16: ($) => seq(choice($.int, $.xint), imm("s")),

		int32: ($) => seq(choice($.int, $.xint), imm("l")),
		uint32: ($) => seq(choice($.int, $.xint), imm(choice("ul", "u"))),
		nativeint: ($) => seq(choice($.int, $.xint), imm("n")),
		unativeint: ($) => seq(choice($.int, $.xint), imm("un")),
		int64: ($) => seq(choice($.int, $.xint), imm("L")),

		//
		// Constants (END)
		//

		block_comment: ($) => seq("(*", $.block_comment_content, "*)"),
		// line_comment: $ => token(seq('//', /[^\n\r]*/)),

		//   /[_\p{XID_Start}][_'\p{XID_Continue}]*/,
		//   /``([^`\n\r\t])+``/ //TODO: Not quite the spec
		// ),

		identifier: ($) => $._lower_identifier,
		_lower_identifier: ($) => /[a-z][0-9a-zA-Z_]*/,
		_upper_identifier: ($) => /[A-Z][0-9a-zA-Z_]*/,
		long_module_name: ($) =>
			seq($.module, repeat(seq(".", $._upper_identifier))),
		tag: ($) => $._upper_identifier,
		module: ($) => prec(2, $._upper_identifier),
		opaque_tag: ($) => token(seq("@", /[A-Z][0-9a-zA-Z_]*/)),
		dot: ($) => ".",
		dot_curly: ($) => ".{",
		ident: ($) => choice($._lower_identifier, $._upper_identifier),

		///BEGIN roc
		// record_field: $ => prec.left(
		//   seq(
		//     $._lower_identifier, optional(seq(":", $._pattern)
		//     ))
		// ),

		record_field_expr: ($) =>
			prec.right(
				0,
				seq($.identifier, optional(seq(":", $._expression_body_maybe_block))),
			),
		record: ($) => seq("{", sep_tail($.record_field_expr, ","), "}"),

		record_destructure: ($) => seq("{", sep_tail($.ident, ","), "}"),

		record_update: ($) =>
			seq("{", $.identifier, "&", sep1_tail($.record_field_expr, ","), "}"),

		exposes_list: ($) => seq("{", sep_tail($.ident, ","), "}"),
		exposes: ($) => seq("exposes", "[", sep_tail($.ident, ","), "]"),

		imports: ($) => seq("imports", "[", sep_tail($.imports_entry, ","), "]"),
		imports_entry: ($) =>
			seq(
				optional(seq($.identifier, ".")),
				$.long_module_name,
				optional(seq(".", $.exposes_list)),
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

		app_header: ($) =>
			seq(
				"app",
				alias($.string, $.app_name),
				$._virtual_open,
				$.app_header_body,
				$._virtual_close,
			),
		packages: ($) => seq("packages", $.record),
		app_header_body: ($) =>
			sep1(choice($.packages, $.imports, $.provides), $._virtual_end_decl),
		//TODO make this a function for app and platform
		platform_header: ($) =>
			seq(
				"platform",
				alias($.string, $.name),
				$._virtual_open,
				$.platform_header_body,
				$._virtual_close,
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
				$._virtual_end_decl,
			),

		interface_header: ($) =>
			seq(
				"interface",
				alias(sep1($._upper_identifier, "."), $.name),
				$._virtual_open,
				$.interface_header_body,
				$._virtual_close,
			),

		interface_header_body: ($) =>
			sep1_tail(choice($.exposes, $.imports), $._virtual_end_decl),

		_module_header: ($) =>
			seq(
				choice($.app_header, $.platform_header, $.interface_header),
				//sometimes it seems we have an unmatched close which stops this from ending and breaks everything after
				optional($._virtual_end_decl),
			),

		type_annotation: ($) => $._type_annotation,
		_type_annotation: ($) =>
			prec(PREC.TYPE, choice($._type_annotation_no_fun, $.function_type)),

		_type_annotation_paren_fun: ($) =>
			prec.right(
				choice($._type_annotation_no_fun, seq("(", $.function_type, ")")),
			),

		function_type: ($) =>
			seq(
				sep1(field("param", $._type_annotation_paren_fun), ","),
				$.arrow,
				sep1($._type_annotation_paren_fun, $.arrow),
			),

		_type_annotation_no_fun: ($) =>
			prec.right(
				choice(
					seq("(", $._type_annotation, ")"),
					$._type_annotation_no_fun_body,
				),
			),

		_type_annotation_no_fun_body: ($) =>
			choice(
				$.record_type,
				$.record_empty,
				$.apply_type,
				$.where_implements,
				$.implements_implementation,
				$.tags_type,
				$.bound_variable,
				$.inferred,
				$.wildcard,
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

		implements_implementation: ($) =>
			seq(
				$._type_annotation_no_fun,
				$.implements,
				"[",
				$._virtual_open,
				sep1_tail($.apply_type, ","),
				$._virtual_close,
				"]",
			),

		implements_definition: ($) =>
			prec(
				10,
				seq(
					$._upper_identifier,
					$.implements,

					$.record_type,
					// "{",
					//   $._virtual_open,
					//   sep1($.alias, $._virtual_end_decl),
					//   $._virtual_close,
					// "}"
				),
			),
		//    init : {} -> f where f implements InspectFormatter
		_ability: ($) => sep1($._upper_identifier, "."),
		ability_chain: ($) => prec.right(sep1($._ability, "&")),

		tag_union: ($) =>
			choice(
				prec(1, seq("[", "]")),
				seq("[", $.tags, "]", optional($.type_variable)),
			),

		tags: ($) =>
			choice(
				prec(1, $._tags_only),
				seq($._virtual_open, $._tags_only, $._virtual_close),
			),
		tags_type: ($) => prec(PREC.TYPE, seq("[", optional($._tags_only), "]")),

		_tags_only: ($) =>
			seq(
				// optional(T('SameIndent')),
				$.apply_type,
				// optional(T('SameIndent')),
				repeat(seq(",", $.apply_type)),
				optional(","),
				// optional(T('SameIndent'))
			),

		type_variable: ($) => choice("_", $.bound_variable),

		bound_variable: ($) => $._lower_identifier,

		wildcard: ($) => "*",

		inferred: ($) => "_",

		apply_type: ($) =>
			prec.right(PREC.TYPE, seq($.concrete_type, optional($.apply_type_args))),

		concrete_type: ($) =>
			seq($._upper_identifier, repeat(seq(".", $._upper_identifier))),

		//we need a n optional \n to stop this eating the value that follows it
		apply_type_args: ($) => prec.right(seq(repeat1($.apply_type_arg))),

		apply_type_arg: ($) => prec.left(choice($._type_annotation_no_fun)),

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

		record_empty: ($) => prec(1, seq("{", "}")),
		record_type: ($) =>
			seq(
				"{",
				sep_tail(
					choice($.record_field_type, $.record_field_type_optional),
					",",
				),
				"}",
			),

		record_field_type: ($) => seq($.ident, ":", $.type_annotation),
		record_field_type_optional: ($) => seq($.ident, "?", $.type_annotation),
		typed_ident: ($) => seq($.identifier, ":", $.type_annotation),

		annotation_pre_colon: ($) =>
			choice(
				//TODO implimeent apply $.apply,
				$.tag,
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

		/**
		 *The top level entry into type annotations
		 */
		annotation_type_def: ($) =>
			seq($.annotation_pre_colon, ":", $.type_annotation, $._virtual_end_decl),
		alias_type_def: ($) => prec(2, seq($.apply_type, ":", $.type_annotation)),
		opaque_type_def: ($) =>
			seq($.apply_type, alias(":=", $.colon_equals), $.type_annotation),

		line_comment: ($) => token(prec(1, seq(/#/, repeat(/[^\n]/)))),

		_virtual_open: ($) => $._virtual_open_section,
		_virtual_close: ($) => $._virtual_end_section,

		backslash: ($) => "\\",
		arrow: ($) => prec(10, "->"),
		back_arrow: ($) => "<-",
	},
});
function sep1(rule, separator) {
	return seq(rule, repeat(seq(separator, rule)));
}
function sep1_tail(rule, separator) {
	return seq(rule, repeat(seq(separator, rule)), optional(separator));
}
function sep_tail(rule, separator) {
	return optional(sep1_tail(rule, separator));
}
function optional_indent(rule, $) {
	return choice(seq($._virtual_open, rule, $._virtual_close), rule);
}
