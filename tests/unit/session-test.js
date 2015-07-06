/* jshint expr:true */
import { it } from 'ember-mocha';
import Ember from 'ember';
import Session from 'ember-simple-auth/session';
import EphemeralStore from 'ember-simple-auth/stores/ephemeral';
import Authenticator from 'ember-simple-auth/authenticators/base';

let store;
let container;
let authenticator;
let session;

describe('Session', () => {
  beforeEach(() => {
    store         = EphemeralStore.create();
    container     = {
      lookup() {}
    };
    authenticator = Authenticator.create();
    session       = Session.create();
    session.setProperties({ store, container });
    sinon.stub(container, 'lookup').returns(authenticator);
  });

  it('does not allow data to be stored for the key "secure"', () => {
    expect(() => {
      session.set('secure', 'test');
    }).to.throw(Error);
  });

  function itHandlesAuthenticatorEvents(preparation) {
    context('when the authenticator triggers the "sessionDataUpdated" event', () => {
      beforeEach(() => {
        return preparation.call();
      });

      it('stores the data the event is triggered with in its secure section', (done) => {
        authenticator.trigger('sessionDataUpdated', { some: 'property' });

        Ember.run.next(() => {
          expect(session.get('secure')).to.eql({ some: 'property', authenticator: 'authenticator' });
          done();
        });
      });
    });

    context('when the authenticator triggers the "invalidated" event', () => {
      beforeEach(() => {
        return preparation.call();
      });

      it('is not authenticated', (done) => {
        authenticator.trigger('sessionDataInvalidated');

        Ember.run.next(() => {
          expect(session.get('isAuthenticated')).to.be.false;
          done();
        });
      });

      it('clears its secure section', (done) => {
        session.set('content', { some: 'property', secure: { some: 'other property' } });
        authenticator.trigger('sessionDataInvalidated');

        Ember.run.next(() => {
          expect(session.get('content.secure')).to.eql({});
          done();
        });
      });

      it('updates the store', (done) => {
        authenticator.trigger('sessionDataInvalidated');

        Ember.run.next(() => {
          expect(store.restore().secure).to.eql({});
          done();
        });
      });

      it('triggers the "sessionInvalidationSucceeded" event', (done) => {
        let triggered = false;
        session.one('sessionInvalidationSucceeded', () => {
          triggered = true;
        });
        authenticator.trigger('sessionDataInvalidated');

        Ember.run.next(() => {
          expect(triggered).to.be.true;
          done();
        });
      });
    });
  }

  describe('restore', () => {
    function itDoesNotRestore() {
      it('returns a rejecting promise', () => {
        return session.restore().then(null, () => {
          expect(true).to.be.true;
        });
      });

      it('is not authenticated', () => {
        return session.restore().then(null, () => {
          expect(session.get('isAuthenticated')).to.be.false;
        });
      });

      it('clears its secure section', () => {
        session.set('content', { secure: { some: 'other property' } });

        return session.restore().then(null, () => {
          expect(session.get('content.secure')).to.eql({});
        });
      });

      it('does not trigger the "sessionAuthenticationFailed" event', () => {
        let triggered = false;
        session.one('sessionAuthenticationFailed', () => triggered = true);

        return session.restore().then(null, () => {
          expect(triggered).to.be.false;
        });
      });
    }

    context('when the restored data contains an authenticator factory', () => {
      beforeEach(() => {
        store.persist({ secure: { authenticator: 'authenticator' } });
      });

      context('when the authenticator resolves restoration', () => {
        beforeEach(() => {
          sinon.stub(authenticator, 'restore').returns(Ember.RSVP.resolve({ some: 'property' }));
        });

        it('returns a resolving promise', () => {
          return session.restore().then(() => {
            expect(true).to.be.true;
          });
        });

        it('is authenticated', () => {
          return session.restore().then(() => {
            expect(session.get('isAuthenticated')).to.be.true;
          });
        });

        it('stores the data the authenticator resolves with in its secure section', () => {
          store.persist({ secure: { authenticator: 'authenticator' } });

          return session.restore().then(() => {
            let properties = store.restore();
            delete properties.authenticator;

            expect(session.get('secure')).to.eql({ some: 'property', authenticator: 'authenticator' });
          });
        });

        it('persists its content in the store', () => {
          return session.restore().then(() => {
            let properties = store.restore();
            delete properties.authenticator;

            expect(properties).to.eql({ secure: { some: 'property', authenticator: 'authenticator' } });
          });
        });

        it('persists the authenticator factory in the store', () => {
          return session.restore().then(() => {
            expect(store.restore().secure.authenticator).to.eql('authenticator');
          });
        });

        it('does not trigger the "sessionAuthenticationSucceeded" event', () => {
          let triggered = false;
          session.one('sessionAuthenticationSucceeded', () => triggered = true);

          return session.restore().then(() => {
            expect(triggered).to.be.false;
          });
        });

        itHandlesAuthenticatorEvents(() => {
          return session.restore();
        });
      });

      context('when the authenticator rejects restoration', () => {
        beforeEach(() => {
          sinon.stub(authenticator, 'restore').returns(Ember.RSVP.reject());
        });

        itDoesNotRestore();
      });
    });

    context('when the restored data does not contain an authenticator factory', () => {
      itDoesNotRestore();
    });
  });

  describe('authentication', () => {
    context('when the authenticator resolves authentication', () => {
      beforeEach(() => {
        sinon.stub(authenticator, 'authenticate').returns(Ember.RSVP.resolve({ some: 'property' }));
      });

      it('is authenticated', () => {
        return session.authenticate('authenticator').then(() => {
          expect(session.get('isAuthenticated')).to.be.true;
        });
      });

      it('returns a resolving promise', () => {
        return session.authenticate('authenticator').then(() => {
          expect(true).to.be.true;
        });
      });

      it('stores the data the authenticator resolves with in its secure section', () => {
        return session.authenticate('authenticator').then(() => {
          expect(session.get('secure')).to.eql({ some: 'property', authenticator: 'authenticator' });
        });
      });

      it('persists its content in the store', () => {
        return session.authenticate('authenticator').then(() => {
          let properties = store.restore();
          delete properties.authenticator;

          expect(properties).to.eql({ secure: { some: 'property', authenticator: 'authenticator' } });
        });
      });

      it('persists the authenticator factory in the store', () => {
        return session.authenticate('authenticator').then(() => {
          expect(store.restore().secure.authenticator).to.eql('authenticator');
        });
      });

      it('triggers the "sessionAuthenticationSucceeded" event', () => {
        let triggered = false;
        session.one('sessionAuthenticationSucceeded', () => triggered = true);

        return session.authenticate('authenticator').then(() => {
          expect(true).to.be.true;
        });
      });

      it('does not trigger the "sessionAuthenticationFailed" event', () => {
        let triggered = false;
        session.one('sessionAuthenticationFailed', () => triggered = true);

        return session.authenticate('authenticator').then(() => {
          expect(triggered).to.be.false;
        });
      });

      itHandlesAuthenticatorEvents(() => {
        return session.authenticate('authenticator');
      });
    });

    context('when the authenticator rejects authentication', () => {
      it('is not authenticated', () => {
        sinon.stub(authenticator, 'authenticate').returns(Ember.RSVP.reject('error auth'));

        return session.authenticate('authenticator').then(null, () => {
          expect(session.get('isAuthenticated')).to.be.false;
        });
      });

      it('returns a rejecting promise', () => {
        sinon.stub(authenticator, 'authenticate').returns(Ember.RSVP.reject('error auth'));

        return session.authenticate('authenticator').then(null, () => {
          expect(true).to.be.true;
        });
      });

      it('clears its secure section', () => {
        sinon.stub(authenticator, 'authenticate').returns(Ember.RSVP.reject('error auth'));
        session.set('content', { some: 'property', secure: { some: 'other property' } });

        return session.authenticate('authenticator').then(null, () => {
          expect(session.get('content')).to.eql({ some: 'property', secure: {} });
        });
      });

      it('updates the store', () => {
        sinon.stub(authenticator, 'authenticate').returns(Ember.RSVP.reject('error auth'));
        session.set('content', { some: 'property', secure: { some: 'other property' } });

        return session.authenticate('authenticator').then(null, () => {
          expect(store.restore()).to.eql({ some: 'property', secure: {} });
        });
      });

      it('does not trigger the "sessionAuthenticationSucceeded" event', () => {
        let triggered = false;
        sinon.stub(authenticator, 'authenticate').returns(Ember.RSVP.reject('error auth'));
        session.one('sessionAuthenticationSucceeded', () => triggered = true);

        return session.authenticate('authenticator').then(null, () => {
          expect(triggered).to.be.false;
        });
      });

      it('triggers the "sessionAuthenticationFailed" event', () => {
        let triggered = false;
        sinon.stub(authenticator, 'authenticate').returns(Ember.RSVP.reject('error'));
        session.one('sessionAuthenticationFailed', (error) => triggered = error);

        return session.authenticate('authenticator').then(null, () => {
          expect(triggered).to.eql('error');
        });
      });
    });
  });

  describe('invalidation', () => {
    beforeEach(() => {
      sinon.stub(authenticator, 'authenticate').returns(Ember.RSVP.resolve({ some: 'property' }));
      return session.authenticate('authenticator');
    });

    context('when the authenticator resolves invaldiation', () => {
      beforeEach(() => {
        sinon.stub(authenticator, 'invalidate').returns(Ember.RSVP.resolve());
      });

      it('is not authenticated', () => {
        return session.invalidate().then(() => {
          expect(session.get('isAuthenticated')).to.be.false;
        });
      });

      it('returns a resolving promise', () => {
        return session.invalidate().then(() => {
          expect(true).to.be.true;
        });
      });

      it('clears its secure section', () => {
        session.set('content', { some: 'property', secure: { some: 'other property' } });

        return session.invalidate().then(() => {
          expect(session.get('content')).to.eql({ some: 'property', secure: {} });
        });
      });

      it('updates the store', () => {
        session.set('content', { some: 'property', secure: { some: 'other property' } });

        return session.invalidate().then(() => {
          expect(store.restore()).to.eql({ some: 'property', secure: {} });
        });
      });

      it('does not trigger the "sessionInvalidationFailed" event', () => {
        let triggered = false;
        session.one('sessionInvalidationFailed', () => triggered = true);

        return session.invalidate().then(() => {
          expect(triggered).to.be.false;
        });
      });

      it('triggers the "sessionInvalidationSucceeded" event', () => {
        let triggered = false;
        session.one('sessionInvalidationSucceeded', () => triggered = true);

        return session.invalidate().then(() => {
          expect(triggered).to.be.true;
        });
      });
    });

    context('when the authenticator rejects invalidation', () => {
      it('stays authenticated', () => {
        sinon.stub(authenticator, 'invalidate').returns(Ember.RSVP.reject('error'));

        return session.invalidate().then(null, () => {
          expect(session.get('isAuthenticated')).to.be.true;
        });
      });

      it('returns a rejecting promise', () => {
        sinon.stub(authenticator, 'invalidate').returns(Ember.RSVP.reject('error'));

        return session.invalidate().then(null, () => {
          expect(true).to.be.true;
        });
      });

      it('keeps its content', () => {
        sinon.stub(authenticator, 'invalidate').returns(Ember.RSVP.reject('error'));

        return session.invalidate().then(null, () => {
          expect(session.get('secure')).to.eql({ some: 'property', authenticator: 'authenticator' });
        });
      });

      it('does not update the store', () => {
        sinon.stub(authenticator, 'invalidate').returns(Ember.RSVP.reject('error'));

        return session.invalidate().then(null, () => {
          expect(store.restore()).to.eql({ secure: { some: 'property', authenticator: 'authenticator' } });
        });
      });

      it('triggers the "sessionInvalidationFailed" event', () => {
        let triggerd = false;
        sinon.stub(authenticator, 'invalidate').returns(Ember.RSVP.reject('error'));
        session.one('sessionInvalidationFailed', (error) => triggerd = error);

        return session.invalidate().then(null, () => {
          expect(triggerd).to.eql('error');
        });
      });

      it('does not trigger the "sessionInvalidationSucceeded" event', () => {
        sinon.stub(authenticator, 'invalidate').returns(Ember.RSVP.reject('error'));
        let triggered = false;
        session.one('sessionInvalidationSucceeded', () => triggered = true);

        return session.invalidate().then(null, () => {
          expect(triggered).to.be.false;
        });
      });

      itHandlesAuthenticatorEvents(Ember.K);
    });
  });

  describe("when the session's content changes", () => {
    context('when a single property is set', () => {
      beforeEach(() => {
        session.set('some', 'property');
      });

      it('persists its content in the store', () => {
        let properties = store.restore();
        delete properties.authenticator;

        expect(properties).to.eql({ some: 'property', secure: {} });
      });
    });

    context('when multiple properties are set at once', () => {
      beforeEach(() => {
        session.set('some', 'property');
        session.setProperties({ multiple: 'properties' });
      });

      it('persists its content in the store', () => {
        let properties = store.restore();
        delete properties.authenticator;

        expect(properties).to.eql({ some: 'property', multiple: 'properties', secure: {} });
      });
    });
  });

  context('when the store triggers the "sessionDataUpdated" event', () => {
    context('when there is an authenticator factory in the event data', () => {
      context('when the authenticator resolves restoration', () => {
        beforeEach(() => {
          sinon.stub(authenticator, 'restore').returns(Ember.RSVP.resolve({ some: 'other property' }));
        });

        it('is authenticated', (done) => {
          store.trigger('sessionDataUpdated', { some: 'other property', secure: { authenticator: 'authenticator' } });

          Ember.run.next(() => {
            expect(session.get('isAuthenticated')).to.be.true;
            done();
          });
        });

        it('stores the data the authenticator resolves with in its secure section', (done) => {
          store.trigger('sessionDataUpdated', { some: 'property', secure: { authenticator: 'authenticator' } });

          Ember.run.next(() => {
            expect(session.get('secure')).to.eql({ some: 'other property', authenticator: 'authenticator' });
            done();
          });
        });

        it('persists its content in the store', (done) => {
          store.trigger('sessionDataUpdated', { some: 'property', secure: { authenticator: 'authenticator' } });

          Ember.run.next(() => {
            let properties = store.restore();

            expect(properties).to.eql({ some: 'property', secure: { some: 'other property', authenticator: 'authenticator' } });
            done();
          });
        });

        context('when the session is already authenticated', () => {
          beforeEach(() => {
            session.set('isAuthenticated', true);
          });

          it('does not trigger the "sessionAuthenticationSucceeded" event', (done) => {
            let triggered = false;
            session.one('sessionAuthenticationSucceeded', () => triggered = true);
            store.trigger('sessionDataUpdated', { some: 'other property', secure: { authenticator: 'authenticator' } });

            Ember.run.next(() => {
              expect(triggered).to.be.false;
              done();
            });
          });
        });

        context('when the session is not already authenticated', () => {
          beforeEach(() => {
            session.set('isAuthenticated', false);
          });

          it('triggers the "sessionAuthenticationSucceeded" event', (done) => {
            let triggered = false;
            session.one('sessionAuthenticationSucceeded', () => triggered = true);
            store.trigger('sessionDataUpdated', { some: 'other property', secure: { authenticator: 'authenticator' } });

            Ember.run.next(() => {
              expect(triggered).to.be.true;
              done();
            });
          });
        });
      });

      context('when the authenticator rejects restoration', () => {
        beforeEach(() => {
          sinon.stub(authenticator, 'restore').returns(Ember.RSVP.reject());
        });

        it('is not authenticated', (done) => {
          store.trigger('sessionDataUpdated', { some: 'other property', secure: { authenticator: 'authenticator' } });

          Ember.run.next(() => {
            expect(session.get('isAuthenticated')).to.be.false;
            done();
          });
        });

        it('clears its secure section', (done) => {
          session.set('content', { some: 'property', secure: { some: 'other property' } });
          store.trigger('sessionDataUpdated', { some: 'other property', secure: { authenticator: 'authenticator' } });

          Ember.run.next(() => {
            expect(session.get('content.secure')).to.eql({});
            done();
          });
        });

        it('updates the store', (done) => {
          session.set('content', { some: 'property', secure: { some: 'other property' } });
          store.trigger('sessionDataUpdated', { some: 'other property', secure: { authenticator: 'authenticator' } });

          Ember.run.next(() => {
            expect(store.restore()).to.eql({ some: 'other property', secure: {} });
            done();
          });
        });

        context('when the session is authenticated', () => {
          beforeEach(() => {
            session.set('isAuthenticated', true);
          });

          it('triggers the "sessionInvalidationSucceeded" event', (done) => {
            let triggered = false;
            session.one('sessionInvalidationSucceeded', () => triggered = true);
            store.trigger('sessionDataUpdated', { some: 'other property', secure: { authenticator: 'authenticator' } });

            Ember.run.next(() => {
              expect(triggered).to.be.true;
              done();
            });
          });
        });

        context('when the session is not authenticated', () => {
          beforeEach(() => {
            session.set('isAuthenticated', false);
          });

          it('does not trigger the "sessionInvalidationSucceeded" event', (done) => {
            let triggered = false;
            session.one('sessionInvalidationSucceeded', () => triggered = true);

            Ember.run.next(() => {
              expect(triggered).to.be.false;
              done();
            });
          });
        });
      });
    });

    context('when there is no authenticator factory in the store', () => {
      it('is not authenticated', (done) => {
        store.trigger('sessionDataUpdated', { some: 'other property' });

        Ember.run.next(() => {
          expect(session.get('isAuthenticated')).to.be.false;
          done();
        });
      });

      it('clears its secure section', (done) => {
        session.set('content', { some: 'property', secure: { some: 'other property' } });
        store.trigger('sessionDataUpdated', { some: 'other property' });

        Ember.run.next(() => {
          expect(session.get('content')).to.eql({ some: 'other property', secure: {} });
          done();
        });
      });

      it('updates the store', (done) => {
        session.set('content', { some: 'property', secure: { some: 'other property' } });
        store.trigger('sessionDataUpdated', { some: 'other property' });

        Ember.run.next(() => {
          expect(store.restore()).to.eql({ some: 'other property', secure: {} });
          done();
        });
      });

      context('when the session is authenticated', () => {
        beforeEach(() => {
          session.set('isAuthenticated', true);
        });

        it('triggers the "sessionInvalidationSucceeded" event', (done) => {
          let triggered = false;
          session.one('sessionInvalidationSucceeded', () => triggered = true);
          store.trigger('sessionDataUpdated', { some: 'other property' });

          Ember.run.next(() => {
            expect(triggered).to.be.true;
            done();
          });
        });
      });

      context('when the session is not authenticated', () => {
        beforeEach(() => {
          session.set('isAuthenticated', false);
        });

        it('does not trigger the "sessionInvalidationSucceeded" event', (done) => {
          let triggered = false;
          session.one('sessionInvalidationSucceeded', () => triggered = true);

          Ember.run.next(() => {
            expect(triggered).to.be.false;
            done();
          });
        });
      });
    });
  });
});