-- make .roc files have the correct filetype
vim.filetype.add({
    extension = {
        roc = function(path, bufnr)
            return 'roc', function(bufnr)
                vim.api.nvim_buf_set_option(bufnr, "commentstring", "# %s")
                vim.api.nvim_buf_set_option(bufnr, "shiftwidth", 4)
                vim.api.nvim_buf_set_option(bufnr, "tabstop", 4)
            end
        end
    }
})

-- add roc tree-sitter
local parsers = require("nvim-treesitter.parsers").get_parser_configs()

parsers.roc = {
  install_info = {
    url = "https://github.com/faldor20/tree-sitter-roc",
    files = { "src/parser.c", "src/scanner.c" },
  },
}
