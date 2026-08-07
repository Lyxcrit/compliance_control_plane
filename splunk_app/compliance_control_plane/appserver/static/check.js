require([
  'splunkjs/mvc',
  'splunkjs/mvc/simplexml/ready!'
], function(mvc) {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  // Simple XML form drilldowns use form.<token>; accept the unprefixed form
  // as well so direct links and older saved URLs remain usable.
  var frameworkKey = params.get('form.framework_token') || params.get('framework_token');
  var requirementKey = params.get('form.requirement_token') || params.get('requirement_token');
  if (!frameworkKey && !requirementKey) {
    return;
  }

  var tokens = mvc.Components.get('default');
  if (!tokens) {
    return;
  }

  function setToken(name, value) {
    if (value) {
      tokens.set(name, value);
    }
  }

  function applyFramework() {
    setToken('form.framework_token', frameworkKey);
    setToken('framework_token', frameworkKey);
  }

  function applyRequirement() {
    setToken('form.requirement_token', requirementKey);
    setToken('requirement_token', requirementKey);
  }

  // The requirement input depends on the framework search. Apply the framework
  // first, then the requirement after the dependent catalog has had a chance to load.
  applyFramework();
  setTimeout(applyFramework, 250);
  setTimeout(applyRequirement, 750);
  setTimeout(applyRequirement, 1500);
  setTimeout(applyRequirement, 2500);
});
