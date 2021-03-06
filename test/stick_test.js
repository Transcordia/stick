var system = require("system");
var assert = require("assert");

var {Application} = require("../lib/stick");
var {mount,route} = require("../lib/middleware");
var {urlFor} = require("../lib/helpers");

exports.testMiddleware = function() {
    function twice(next, app) {
        return function(req) {
            return next(req) + next(req)
        }
    }
    function uppercase(next, app) {
        return function(req) {
            return next(req.toUpperCase()).toUpperCase()
        }
    }
    function foobar(next, app) {
        return function(req) {
            return req === "FOO" ?
                "bar" : "unexpected req: " + req
        }
    }
    function append_(next, app) {
        return function(req) {
            return next(req) + "_"
        }
    }
    function _prepend(next, app) {
        return function(req) {
            return "_" + next(req)
        }
    }
    var app = new Application(foobar());
    app.configure(twice, uppercase);
    assert.equal(app("foo"), "BARBAR");
    app = new Application();
    app.configure(twice, uppercase, foobar);
    assert.equal(app("foo"), "BARBAR");
    var dev = app.env("development");
    dev.configure(twice);
    var prod = app.env("production");
    prod.configure(_prepend, append_);
    assert.equal(app("foo"), "BARBAR");
    assert.equal(dev("foo"), "BARBARBARBAR");
    assert.equal(prod("foo"), "_BARBAR_");
};

// Middlewares
exports.testAccept = require("./middleware/accept_test");
exports.testCors = require("./middleware/cors_test");
exports.testCsrf = require("./middleware/csrf_test");
exports.testMount = require("./middleware/mount_test");
exports.testParams = require("./middleware/params_test");
exports.testRoute = require("./middleware/route_test");
exports.testLocale = require("./middleware/locale_test");

/**
 * The default behavior of mount.js middleware will issue a 303 redirect if the user enters a mount
 * path which does not end with a slash on a GET request. The redirect returns the browser to the
 * same path, but with a trailing slash. Not very nice for performance or style when using REST urls.
 */
exports.testNormalUrls = function() {
    var response;

    var app = new Application();
    app.configure(mount);

    app.mount("/", function() { return "root" });
    app.mount("/foo", function() { return "foo" });
    app.mount("/foo/bar", function() { return "foo/bar" });

    // These URLs should return a 303 response using the default URL treatment
    response = app({headers: {host: "foo.com"}, method: "GET", env: {}, pathInfo: ""});
    assert.strictEqual(response.status, 303);
    response = app({headers: {host: "foo.com"}, method: "GET", env: {}, pathInfo: "/foo"});
    assert.strictEqual(response.status, 303);
    response = app({headers: {host: "foo.com"}, method: "GET", env: {}, pathInfo: "/foo/bar"});
    assert.strictEqual(response.status, 303);
};

/**
 * When using the mount command, the developer can choose to use REST-style URLs without a redirect
 * and without a trailing slash on the end of the URL.
 */
exports.testRESTUrls = function() {
    var response;

    var app = new Application();
    app.configure(mount);

    app.mount("/", function() { return "root" }, true);
    app.mount("/foo", function() { return "foo" }, true);
    app.mount("/foo/bar", function() { return "foo/bar" }, true);

    // Using REST urls, these requests should return the expected content
    assert.equal(app({headers: {host: "foo.com"}, env: {}, method: "GET", pathInfo: ""}), "root");
    assert.equal(app({headers: {host: "foo.com"}, env: {}, method: "GET", pathInfo: "/foo"}), "foo");
    assert.equal(app({headers: {host: "foo.com"}, env: {}, method: "GET", pathInfo: "/foo/bar"}), "foo/bar");
};

if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}
