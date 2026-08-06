require([
  'jquery',
  'splunkjs/mvc',
  'splunkjs/mvc/searchmanager',
  'splunkjs/mvc/simplexml/ready!'
], function($, mvc, SearchManager) {
  'use strict';

  var service = mvc.createService();
  var message = $('#ccp-finding-message');
  var frameworks = [];
  var requirements = [];
  var urlParams = new URLSearchParams(window.location.search);
  var directScopeLoaded = false;

  function resultRows(data, resultModel) {
    var payload = data && data.data ? data.data : data;
    if (!payload && resultModel && typeof resultModel.data === 'function') {
      payload = resultModel.data();
    }
    if (!payload) { return []; }
    if (Array.isArray(payload.rows)) {
      return payload.rows.map(function(row) {
        var item = {};
        (payload.fields || []).forEach(function(field, index) { item[typeof field === 'string' ? field : field.name] = row[index]; });
        return item;
      });
    }
    return Array.isArray(payload.results) ? payload.results : [];
  }

  function collectionRows(data) {
    if (Array.isArray(data)) { return data; }
    if (data && Array.isArray(data.data)) { return data.data; }
    if (data && data.data && Array.isArray(data.data.data)) { return data.data.data; }
    if (data && Array.isArray(data.results)) { return data.results; }
    return [];
  }

  function bindResults(resultModel, handler) {
    resultModel.on('data', function(properties) {
      var rows = resultRows(properties, resultModel);
      if (!rows.length && resultModel.data && resultModel.data()) {
        rows = resultRows(resultModel.data(), resultModel);
      }
      handler(rows);
    });
    if (resultModel.data && resultModel.data()) {
      var settled = resultRows(resultModel.data(), resultModel);
      if (settled.length) { handler(settled); }
    }
  }

  function populateSelect(selector, rows, valueField, labelField, emptyLabel) {
    var select = $(selector).empty();
    if (!rows.length) {
      select.append($('<option>').val('').text(emptyLabel));
      return;
    }
    select.append($('<option>').val('').text('Select...'));
    rows.forEach(function(row) { select.append($('<option>').val(row[valueField]).text(row[labelField])); });
  }

  function catalogManager(id, search) {
    return mvc.Components.get(id) || new SearchManager({ id: id, search: search, earliest_time: '0', latest_time: 'now' }, { tokens: false });
  }

  function refreshRequirements() {
    var frameworkKey = $('#ccp-finding-framework').val();
    var framework = frameworks.filter(function(row) { return row.framework_key === frameworkKey; })[0];
    $('#ccp-finding-version').val(framework ? (framework.version || '') : '');
    populateSelect('#ccp-finding-requirement', requirements.filter(function(row) { return row.framework_key === frameworkKey; }), 'requirement_key', 'title', 'No checks are available for this framework');
  }

  function applyUrlDefaults() {
    var frameworkKey = urlParams.get('framework_token');
    var requirementKey = urlParams.get('requirement_token');
    var scopeKey = urlParams.get('scope_token');
    if (frameworkKey && $('#ccp-finding-framework option[value="' + frameworkKey + '"]').length) {
      $('#ccp-finding-framework').val(frameworkKey);
    }
    if (scopeKey && $('#ccp-finding-scope option[value="' + scopeKey + '"]').length) {
      $('#ccp-finding-scope').val(scopeKey);
    }
    refreshRequirements();
    if (requirementKey && $('#ccp-finding-requirement option[value="' + requirementKey + '"]').length) {
      $('#ccp-finding-requirement').val(requirementKey);
    }
  }

  function loadCatalog() {
    var frameworkManager = catalogManager('CCPFindingFrameworks', '| inputlookup framework_catalog.csv | lookup ccp_framework_selections framework_key OUTPUT selected | eval selected_value=tostring(coalesce(selected,default_selected)), selected=if(selected_value="1" OR selected_value="true",1,0) | search status=active selected=1 | table framework_key framework_name version');
    var frameworkResults = frameworkManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(frameworkResults, function(rows) {
      frameworks = rows;
      populateSelect('#ccp-finding-framework', frameworks, 'framework_key', 'framework_name', 'No active frameworks. Configure Framework Setup first.');
      applyUrlDefaults();
    });
    var requirementManager = catalogManager('CCPFindingRequirements', '| inputlookup requirements.csv | lookup ccp_framework_selections framework_key OUTPUT selected | lookup ccp_framework_catalog framework_key OUTPUT default_selected | eval selected_value=tostring(coalesce(selected,default_selected)), selected=if(selected_value="1" OR selected_value="true",1,0) | search selected=1 | table framework_key requirement_key title');
    var requirementResults = requirementManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(requirementResults, function(rows) { requirements = rows; applyUrlDefaults(); });
    var scopeManager = catalogManager('CCPFindingScopes', '| inputlookup ccp_scopes | search status=active | table scope_key scope_name');
    var scopeResults = scopeManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(scopeResults, function(rows) { directScopeLoaded = true; populateSelect('#ccp-finding-scope', rows, 'scope_key', 'scope_name', 'No active scopes. Configure Framework Setup first.'); applyUrlDefaults(); });
    setTimeout(function() {
      if (directScopeLoaded) { return; }
      service.request('storage/collections/data/ccp_scopes', 'GET', null, null, null, null, null).done(function(data) {
        var scopeRows = collectionRows(data);
        directScopeLoaded = true;
        populateSelect('#ccp-finding-scope', scopeRows.filter(function(row) { return !row.status || row.status === 'active'; }), 'scope_key', 'scope_name', 'No active scopes. Configure Framework Setup first.');
        applyUrlDefaults();
      });
    }, 1500);
    [frameworkManager, requirementManager, scopeManager].forEach(function(searchManager) {
      if (searchManager && typeof searchManager.startSearch === 'function') { searchManager.startSearch(); }
    });
  }

  $('#ccp-finding-framework').on('change', refreshRequirements);
  loadCatalog();

  function value(id) { return $.trim($('#' + id).val()); }

  $('#ccp-save-finding').on('click', function() {
    var required = [
      ['ccp-finding-key', 'Finding key'], ['ccp-finding-scope', 'Scope key'],
      ['ccp-finding-framework', 'Framework key'], ['ccp-finding-version', 'Framework version'],
      ['ccp-finding-requirement', 'Requirement key'], ['ccp-finding-title', 'Title'],
      ['ccp-finding-owner', 'Owner'], ['ccp-finding-remediation', 'Remediation']
    ];
    var missing = required.filter(function(field) { return !value(field[0]); });
    if (missing.length) {
      message.removeClass('ccp-message-success').addClass('ccp-message-error').text('Required: ' + missing.map(function(field) { return field[1]; }).join(', '));
      return;
    }
    var key = value('ccp-finding-key');
    var payload = {
      _key: key, finding_key: key, scope_key: value('ccp-finding-scope'),
      framework_key: value('ccp-finding-framework'), framework_version: value('ccp-finding-version'),
      requirement_key: value('ccp-finding-requirement'), title: value('ccp-finding-title'),
      severity: value('ccp-finding-severity'), status: value('ccp-finding-status'),
      owner: value('ccp-finding-owner'), owner_kind: value('ccp-finding-owner-kind'), owner_role: value('ccp-finding-owner-role'), due_at: value('ccp-finding-due'),
      remediation: value('ccp-finding-remediation'), source: value('ccp-finding-source') || 'manual',
      exception_reference: value('ccp-finding-exception'), retest_at: value('ccp-finding-retest'),
      closed_at: value('ccp-finding-closed'), notes: value('ccp-finding-notes'),
      updated_at: new Date().toISOString()
    };
    message.removeClass('ccp-message-error ccp-message-success').text('Saving...');
    $('#ccp-save-finding').prop('disabled', true);
    service.request('storage/collections/data/ccp_findings', 'POST', null, null, JSON.stringify(payload), { 'Content-Type': 'application/json' }, null)
      .done(function() { message.removeClass('ccp-message-error').addClass('ccp-message-success').text('Finding saved. Refresh the table to confirm it.'); })
      .fail(function(xhr) { var detail = xhr && xhr.responseText ? ' ' + xhr.responseText : ''; message.removeClass('ccp-message-success').addClass('ccp-message-error').text('Finding could not be saved.' + detail); })
      .always(function() { $('#ccp-save-finding').prop('disabled', false); });
  });
});
