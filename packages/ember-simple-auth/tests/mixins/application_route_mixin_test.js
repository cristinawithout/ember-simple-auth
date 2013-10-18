var testRoute;
var TestRoute = Ember.Route.extend(Ember.SimpleAuth.ApplicationRouteMixin, {
  transitionTo: function(targetRoute) {
    this.transitionedTo = targetRoute;
  }
});

var ajaxMock;
var AjaxMock = Ember.Object.extend({
  ajaxCapture: function(url, options) {
    this.requestUrl     = url;
    this.requestOptions = options;
    return {
      always: function(callback) {
        callback();
      }
    };
  }
});

var attemptedTransitionMock = { retry: function() { this.retried = true; } };

module('Ember.SimpleAuth.ApplicationRouteMixin', {
  originalAjax: Ember.$.ajax,
  setup: function() {
    testRoute                           = TestRoute.create();
    ajaxMock                            = AjaxMock.create();
    Ember.SimpleAuth.serverSessionRoute = '/session/route';
    Ember.$.ajax                        = ajaxMock.ajaxCapture.bind(ajaxMock);
    testRoute.set('session', Ember.SimpleAuth.Session.create());
  },
  teardown: function() {
    Ember.$.ajax = this.originalAjax;
  }
});

test('redirects to the correct route on login', function() {
  Ember.SimpleAuth.loginRoute = 'some.route';
  testRoute._actions['login'].apply(testRoute);

  equal(testRoute.transitionedTo, 'some.route', 'Ember.SimpleAuth.ApplicationRouteMixin redirects to the login route on login.');
});

test('sends a DELETE request to the correct route on logout', function() {
  testRoute._actions['logout'].apply(testRoute);

  equal(ajaxMock.requestUrl, '/session/route', 'Ember.SimpleAuth.ApplicationRouteMixin sends a request to the correct route on logout.');
  equal(ajaxMock.requestOptions.type, 'DELETE', 'Ember.SimpleAuth.ApplicationRouteMixin sends a DELETE request on logout.');
});

test('destroys the current session on logout', function() {
  testRoute.set('session.authToken', 'some token');
  testRoute._actions['logout'].apply(testRoute);

  equal(testRoute.get('session.isAuthenticated'), false, 'Ember.SimpleAuth.ApplicationRouteMixin destroys the current session on logout.');
});

test('redirects to the correct route on logout', function() {
  Ember.SimpleAuth.routeAfterLogout = 'some.route';
  testRoute._actions['logout'].apply(testRoute);

  equal(testRoute.transitionedTo, 'some.route', 'Ember.SimpleAuth.ApplicationRouteMixin redirects to the routeAfterLogout on logout.');
});

test('redirects to the correct route on loginSucceeded', function() {
  Ember.SimpleAuth.routeAfterLogin = 'some.route';
  testRoute._actions['loginSucceeded'].apply(testRoute);

  equal(testRoute.transitionedTo, 'some.route', 'Ember.SimpleAuth.ApplicationRouteMixin redirects to the routeAfterLogin route on loginSucceeded when no attempted transition is saved.');

  testRoute.set('session.attemptedTransition', attemptedTransitionMock);
  testRoute._actions['loginSucceeded'].apply(testRoute);

  ok(attemptedTransitionMock.retried, 'Ember.SimpleAuth.ApplicationRouteMixin retries a saved attempted transition on loginSucceeded.');
});

test('clears a saved attempted transition on loginSucceeded', function() {
  testRoute.set('session.attemptedTransition', attemptedTransitionMock);
  testRoute._actions['loginSucceeded'].apply(testRoute);

  equal(testRoute.get('session.attemptedTransition'), undefined, 'Ember.SimpleAuth.ApplicationRouteMixin clears a saved attempted transition on loginSucceeded.');
});
