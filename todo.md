- [ ] fix naming
	- [ ] long_identifier_or_op

- [ ] remove old fsharp code
- [ ] test for parsing invalid code
- [ ] unify the patterns and expressions
	- [ ] make a shared subcollection for things that are in both 
- [ ] dotexpression seems weird and we should try to fix that 
- [ ] tighten up cases from fsharp

	- [ ] long_identifier
		roc has strict naming for module name vs function names 
	- [ ] also should be able to parse tags and make a tag pattern type

	- [ ] i believe tags is getting matched incorrectly



Something about my whole setup is a bit messed up. i had to add else to the list of expressions because it wouldn't ever get passed when it was inside if... maybe i should try restarting this and basing it more off python, they seem to be very well set up

I think better use of precidence would help a lot

If i make use of inlining i can split up my expressions better, infact i should be using it more generally
I can probably fix a bunch of my issues using the conflicts field, which should make tree-sitter explore the next token;w
 b

