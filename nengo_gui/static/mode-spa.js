define('ace/mode/spa', function(require, exports, module) {

var oop = require("ace/lib/oop");
var PythonMode = require("ace/mode/python").Mode;
var SpaHighlightRules = require("ace/mode/spa_highlight_rules").SpaHighlightRules;

var Mode = function() {
    this.HighlightRules = SpaHighlightRules;
};
oop.inherits(Mode, PythonMode);

(function() {
    // Extra logic goes here.
}).call(Mode.prototype);

exports.Mode = Mode;
});


define('ace/mode/spa_highlight_rules', function(require, exports, module) {

var oop = require("ace/lib/oop");
var PythonHighlightRules = require("ace/mode/python_highlight_rules").PythonHighlightRules;

var SpaHighlightRules = function() {

    var stringEscape = "\\\\(x[0-9A-Fa-f]{2}|[0-7]{3}|[\\\\abfnrtv'\"]|U[0-9A-Fa-f]{8}|u[0-9A-Fa-f]{4})";
    this.$rules = new PythonHighlightRules().getRules();
    this.$rules.start.splice(0, 0, {
        token: "keyword",
        regex: "spa\\s*\\.\\s*Actions\\([uUrR]?'(?!'')",
        next: "spa_q_start"
    }, {
        token: "keyword",
        regex: "spa\\s*\\.\\s*Actions\\([uUrR]?\"(?!\"\")",
        next: "spa_qq_start"
    }, {
        token: "keyword",
        regex: "spa\\s*\\.\\s*Actions\\([uUrR]?'''",
        next: "spa_q3_start"
    }, {
        token: "keyword",
        regex: "spa\\s*\\.\\s*Actions\\([uUrR]?\"{3}",
        next: "spa_qq3_start"
    });

    var spa_rules = [{
        token: "keyword",
        regex: "\\b(ifmax|elifmax)\\b"
    }, {
        token: "support.function",
        regex: "\\b(dot|reinterpret|translate)\\b"
    }, {
        token: "support.constant",
        regex: "\\b[A-Z][_0-9a-zA-Z]*\\b"
    }];

    this.embedRules(PythonHighlightRules, "spa_q_", [{
        token: "constant.language.escape",
        regex: stringEscape,
    }]);
    this.$rules.spa_q_start = spa_rules.concat([{
        token: "keyword",
        regex: "'(\\s*\\))?|$",
        next: "start",
    }].concat(this.$rules.spa_q_start));
    this.embedRules(PythonHighlightRules, "spa_qq_", [{
        token: "constant.language.escape",
        regex: stringEscape,
        }]);
    this.$rules.spa_qq_start = spa_rules.concat([{
        token: "keyword",
        regex: "\"(\\s*\\))?|$",
        next: "start",
    }].concat(this.$rules.spa_qq_start));
    this.embedRules(PythonHighlightRules, "spa_q3_", [{
        token: "constant.language.escape",
        regex: stringEscape,
    }]);
    this.$rules.spa_q3_start = spa_rules.concat([{
        token: "keyword",
        regex: "'''\\s*\\)",
        next: "start",
    }].concat(this.$rules.spa_q3_start));
    this.embedRules(PythonHighlightRules, "spa_qq3_", [{
        token: "constant.language.escape",
        regex: stringEscape,
    }]);
    this.$rules.spa_qq3_start = spa_rules.concat([{
        token: "keyword",
        regex: "\"{3}\\s*\\)",
        next: "start",
    }].concat(this.$rules.spa_qq3_start));
}

oop.inherits(SpaHighlightRules, PythonHighlightRules);

exports.SpaHighlightRules = SpaHighlightRules;
});
