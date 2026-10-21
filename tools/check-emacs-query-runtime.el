;;; check-emacs-query-runtime.el --- Generated Roc query runtime checks -*- lexical-binding: t; -*-

;; Run in a disposable Emacs daemon with the current grammar installed:
;; emacsclient --socket-name=SOCKET --alternate-editor=false --eval '
;; (progn (add-to-list (quote treesit-extra-load-path) GRAMMAR-DIR)
;;        (load-file "/home/danknutson/Projects/tree-sitter-roc/tools/check-emacs-query-runtime.el")
;;        (ert-run-tests-batch "^roc-query-runtime-"))'
;; Check the returned ERT counts; a successful client exit is not enough.

(require 'ert)
(require 'cl-lib)
(require 'treesit)

;; Local faces stand in for the mode's capture identities, not its styling.
(defface roc-ts-crash-face
  '((t :inherit font-lock-warning-face))
  "Face for the Roc crash keyword in generated queries.")
(defface roc-ts-question-mark-face
  '((t :inherit font-lock-keyword-face))
  "Face for the Roc early-return operator in generated queries.")

(defconst roc-query-runtime--query-file
  (expand-file-name "../queries-generated/emacs/queries/highlights.scm"
                    (file-name-directory (or load-file-name buffer-file-name))))

(defun roc-query-runtime--sections ()
  "Read ordered feature sections from the generated highlights query."
  (with-temp-buffer
    (insert-file-contents roc-query-runtime--query-file)
    (goto-char (point-min))
    (let (sections)
      (while (re-search-forward "^;; feature: \\([^\n]+\\)$" nil t)
        (let* ((feature (intern (match-string 1)))
               (begin (line-beginning-position 2))
               (end (if (save-excursion
                          (re-search-forward "^;; feature: " nil t))
                        (save-excursion
                          (re-search-forward "^;; feature: " nil t)
                          (line-beginning-position))
                      (point-max))))
          (push (cons feature (buffer-substring-no-properties begin end)) sections)
          (goto-char end)))
      (nreverse sections))))

(defconst roc-query-runtime--feature-list
  '((comments doc-comments definition-names)
    (keywords strings string-escapes types type-variables tag-types)
    (numbers errors early-return)
    (record-field-declaration record-field-access tags variable-use
     function-calls modules operators delimiters brackets arrows
     lambdas assignments))
  "Font-lock levels for testing generated queries independently of the mode.")

(defun roc-query-runtime--check-faces (query)
  "Assert every capture in QUERY names a defined Emacs face."
  (with-temp-buffer
    (insert query)
    (goto-char (point-min))
    (let ((count 0))
      (while (re-search-forward "@[[:alnum:]_.-]+" nil t)
        (unless (save-excursion
                  (goto-char (match-beginning 0))
                  (search-backward ";" (line-beginning-position) t))
          (setq count (1+ count))
          (should (facep (intern (substring (match-string 0) 1))))))
      (should (> count 0)))))

(defun roc-query-runtime--settings ()
  "Compile the generated sections as ordered font-lock settings."
  (let* ((sections (roc-query-runtime--sections))
         (features (mapcar #'car sections))
         (enabled (apply #'append roc-query-runtime--feature-list)))
    (should (> (length sections) 30))
    (should (cl-subsetp features enabled))
    (should (cl-subsetp enabled features))
    (apply #'treesit-font-lock-rules
           (cl-loop for (feature . query) in sections
                    do (progn (roc-query-runtime--check-faces query)
                              (treesit-query-compile 'roc query t))
                    append (list :language 'roc :override t
                                 :feature feature query)))))

(defvar roc-query-runtime--settings (roc-query-runtime--settings))

(defun roc-query-runtime--face (source needle level &optional occurrence disabled-features)
  "Return SOURCE's face at NEEDLE's OCCURRENCE at font-lock LEVEL.
DISABLED-FEATURES is a list of features to remove independently."
  (with-temp-buffer
    (insert source)
    (prog-mode)
    (let ((root (treesit-parser-root-node (treesit-parser-create 'roc))))
      (should-not (treesit-node-check root 'has-error)))
    (setq-local treesit-font-lock-settings roc-query-runtime--settings)
    (setq-local treesit-font-lock-feature-list
                (copy-tree roc-query-runtime--feature-list))
    (setq-local treesit-font-lock-feature-list
                (mapcar (lambda (features)
                          (cl-set-difference features disabled-features))
                        treesit-font-lock-feature-list))
    (let ((treesit-font-lock-level level))
      (treesit-major-mode-setup))
    (font-lock-ensure)
    (goto-char (point-min))
    (dotimes (_ (or occurrence 1))
      (should (search-forward needle nil t)))
    (get-text-property (match-beginning 0) 'face)))

(ert-deftest roc-query-runtime-interpolation ()
  "Identifiers in strings override the broad string capture."
  (let ((source "main = |name| \"hello ${name}!\"\n"))
    (should (eq (roc-query-runtime--face source "name}!" 4)
                'font-lock-variable-use-face))
    (should (eq (roc-query-runtime--face source "hello " 4)
                'font-lock-string-face))))

(ert-deftest roc-query-runtime-numbers ()
  "Suffixed integer and decimal numbers retain a numeric face."
  (let ((source "main = { a: 12.U8, b: 1.5.F64 }\n"))
    (dolist (number '("12.U8" "1.5.F64"))
      (should (eq (roc-query-runtime--face source number 3)
                  'font-lock-number-face)))))

(ert-deftest roc-query-runtime-calls ()
  "Call targets have no definition face at level 3 and a call face at 4."
  (let ((source "main = |f| { f(1)\n    2 -> f\n }\n"))
    (should-not (memq (roc-query-runtime--face source "f(1)" 3)
                      '(font-lock-function-name-face font-lock-function-call-face)))
    (should-not (memq (roc-query-runtime--face source "f\n" 3)
                      '(font-lock-function-name-face font-lock-function-call-face)))
    (should (eq (roc-query-runtime--face source "f(1)" 4)
                'font-lock-function-call-face))
    (should (eq (roc-query-runtime--face source "f\n" 4)
                'font-lock-function-call-face))))

(ert-deftest roc-query-runtime-inferred ()
  "Generated rules capture only inferred identifiers with a variable face."
  (let* ((sections (roc-query-runtime--sections))
         (features (mapcar #'car sections))
         (query (mapconcat #'cdr sections "\n"))
         (inferred-pattern
          "(inferred_associated_annotation[[:space:]]+name: (annotation_pre_colon (identifier) @font-lock-variable-name-face))")
         (inferred-sections
          (cl-remove-if-not
           (lambda (section) (string-match inferred-pattern (cdr section)))
           sections))
         (inferred-query
          (progn
            (should (= (length inferred-sections) 1))
            (should (eq (caar inferred-sections) 'definition-names))
            (string-match inferred-pattern (cdar inferred-sections))
            (match-string 0 (cdar inferred-sections)))))
    (should (> (cl-count 'definition-names features) 1))
    (should (< (cl-position 'definition-names features)
               (cl-position 'function-calls features)))
    (should (< (cl-position 'function-calls features)
               (cl-position 'definition-names features :from-end t)))
    (should-not (string-match-p "@roc-ts--fontify" query))
    (dolist (source '("Flags := [A].{ is_eq : _ }\n"
                      "Flags := [A].{ is_eq : _\n # comment\n ## docs\n is_eq = 42 }\n"
                      "Flags := [A].{ is_eq : _\n # comment\n other = 42 }\n"
                      "Flags := [A].{ unknown : _ }\n"))
      (let* ((name (if (string-match-p "unknown" source) "unknown" "is_eq"))
             (capture (with-temp-buffer
                     (insert source)
                     (treesit-parser-create 'roc)
                     (let* ((root (treesit-buffer-root-node 'roc))
                            (captures (treesit-query-capture
                                       root inferred-query)))
                       (should (= (length captures) 1))
                       (let ((identifier (cdar captures)))
                         (should (equal (treesit-node-text identifier) name))
                         (should (= (treesit-node-start identifier)
                                    (1+ (string-match (concat name " :") source))))
                         (should (= (treesit-node-end identifier)
                                    (+ (treesit-node-start identifier) (length name))))
                         (should (equal (buffer-substring-no-properties
                                         (treesit-node-end identifier)
                                         (+ 2 (treesit-node-end identifier)))
                                        " :")))))))
        (dolist (level '(3 4))
          (should (eq (roc-query-runtime--face source (concat name " :") level)
                      'font-lock-variable-name-face))
          (should-not (eq (roc-query-runtime--face
                           source (concat name " :") level nil '(definition-names))
                          'font-lock-variable-name-face)))))))

(ert-deftest roc-query-runtime-custom-faces ()
  "Generated Roc-specific captures apply their locally defined face identities."
  (let ((source "main = |value| { crash\n value? }\n"))
    (should (eq (roc-query-runtime--face source "crash" 3)
                'roc-ts-crash-face))
    (should (eq (roc-query-runtime--face source "?" 3)
                'roc-ts-question-mark-face))
    (should-not (eq (roc-query-runtime--face source "crash" 3 nil '(keywords))
                    'roc-ts-crash-face))
    (should-not (eq (roc-query-runtime--face source "?" 3 nil '(early-return))
                    'roc-ts-question-mark-face))))

(ert-deftest roc-query-runtime-doc-comments ()
  "Doc comments use the comment fallback when their feature is disabled."
  (let ((source "## documentation\nmain = 1\n"))
    (should (eq (roc-query-runtime--face source "documentation" 1)
                'font-lock-doc-face))
    (should (eq (roc-query-runtime--face source "documentation" 1 nil '(doc-comments))
                'font-lock-comment-face))))

(ert-deftest roc-query-runtime-package-and-arrows ()
  "Only the URI in a platform reference is a string; arrows remain distinct."
  (let ((source "app [main!] { pf: platform \"./platform/main.roc\" }\n\nmain! = || 1\n"))
    (should (eq (roc-query-runtime--face source "./platform/main.roc" 4)
                'font-lock-string-face))
    (should-not (eq (roc-query-runtime--face source "pf:" 4)
                    'font-lock-string-face)))
  (let ((source "main = |x| x -> map\n"))
    (should (eq (roc-query-runtime--face source "->" 4)
                'font-lock-operator-face))
    (should-not (eq (roc-query-runtime--face source "->" 4 nil '(arrows))
                    'font-lock-misc-punctuation-face))
    (should-not (eq (roc-query-runtime--face source "->" 4 nil '(operators))
                    'font-lock-operator-face))))

(ert-deftest roc-query-runtime-field-features ()
  "Record literal declarations and accesses have independently gated faces."
  (let ((source "main = |item| { count: 1, selected: item.count }\n"))
    (should (eq (roc-query-runtime--face source "count:" 4)
                'font-lock-property-name-face))
    (should (eq (roc-query-runtime--face source "count }" 4)
                'font-lock-property-use-face))
    (should-not (eq (roc-query-runtime--face source "count:" 4 nil
                                             '(record-field-declaration))
                    'font-lock-property-name-face))
    (should (eq (roc-query-runtime--face source "count }" 4 nil
                                         '(record-field-declaration))
                'font-lock-property-use-face))
    (should (eq (roc-query-runtime--face source "count:" 4 nil
                                         '(record-field-access))
                'font-lock-property-name-face))
    (should-not (eq (roc-query-runtime--face source "count }" 4 nil
                                             '(record-field-access))
                    'font-lock-property-use-face))))

(ert-deftest roc-query-runtime-ordinary-commas ()
  "Tuple and call commas depend on delimiters, not arrows."
  (let ((source "main = |f| { pair = (1, 2)\n f(1, 2) }\n"))
    (dolist (occurrence '(1 2))
      (should (eq (roc-query-runtime--face source "," 4 occurrence)
                  'font-lock-delimiter-face))
      (should (eq (roc-query-runtime--face source "," 4 occurrence '(arrows))
                  'font-lock-delimiter-face))
      (should-not (eq (roc-query-runtime--face source "," 4 occurrence
                                               '(delimiters))
                      'font-lock-delimiter-face)))))

(ert-deftest roc-query-runtime-type-and-match-arrows ()
  "Function-type and match arrows depend on arrows, not operators."
  (let ((source "map : Str -> Str\nmain = |x| match x { A => 1, B => 2 }\n"))
    (dolist (arrow '("->" "=>"))
      (should (eq (roc-query-runtime--face source arrow 4)
                  'font-lock-misc-punctuation-face))
      (should (eq (roc-query-runtime--face source arrow 4 nil '(operators))
                  'font-lock-misc-punctuation-face))
      (should-not (eq (roc-query-runtime--face source arrow 4 nil '(arrows))
                      'font-lock-misc-punctuation-face)))))

(provide 'check-emacs-query-runtime)
;;; check-emacs-query-runtime.el ends here
