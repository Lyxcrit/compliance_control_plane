require([
  'jquery',
  'splunkjs/mvc',
  'splunkjs/mvc/searchmanager',
  'splunkjs/mvc/simplexml/ready!'
], function($, mvc, SearchManager) {
  'use strict';

  var service = mvc.createService();
  var message = $('#ccp-evidence-message');
  var frameworks = [];
  var requirements = [];
  var systems = [];
  var directScopeLoaded = false;
  var urlParams = new URLSearchParams(window.location.search);

  function applyUrlDefaults() {
    var frameworkKey = urlParams.get('framework_token');
    var requirementKey = urlParams.get('requirement_token');
    var systemKey = urlParams.get('system_token');
    var scopeKey = urlParams.get('scope_token');
    if (frameworkKey && $('#ccp-framework-key option[value="' + frameworkKey + '"]').length) {
      $('#ccp-framework-key').val(frameworkKey);
    }
    if (systemKey) { $('#ccp-system-key').val(systemKey); }
    if (scopeKey && $('#ccp-scope-key option[value="' + scopeKey + '"]').length) {
      $('#ccp-scope-key').val(scopeKey);
    }
    refreshSystems();
    refreshRequirements();
    if (requirementKey && $('#ccp-requirement-key option[value="' + requirementKey + '"]').length) {
      $('#ccp-requirement-key').val(requirementKey);
    }
  }

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
    if (Array.isArray(payload.results)) { return payload.results; }
    if (payload.data && Array.isArray(payload.data)) { return payload.data; }
    return [];
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
    rows.forEach(function(row) { select.append($('<option>').val(row[valueField]).text(row[labelField])); });
  }

  function catalogManager(id, search) {
    return mvc.Components.get(id) || new SearchManager({ id: id, search: search, earliest_time: '0', latest_time: 'now' }, { tokens: false });
  }

  function refreshRequirements() {
    var frameworkKey = $('#ccp-framework-key').val();
    var framework = frameworks.filter(function(row) { return row.framework_key === frameworkKey; })[0];
    if (framework) {
      $('#ccp-framework-version').val(framework.version || '');
      $('#ccp-content-digest').val(framework.content_digest || '');
    }
    populateSelect('#ccp-requirement-key', requirements.filter(function(row) { return row.framework_key === frameworkKey; }), 'requirement_key', 'title', 'No checks are available for this framework');
  }

  function refreshSystems() {
    var scopeKey = $('#ccp-scope-key').val();
    var matching = systems.filter(function(row) { return !scopeKey || row.scope_key === scopeKey; });
    populateSelect('#ccp-system-key', matching, 'system_key', 'system_name', 'Register a system in this audit scope first');
    var systemKey = urlParams.get('system_token');
    if (systemKey && $('#ccp-system-key option[value="' + systemKey + '"]').length) {
      $('#ccp-system-key').val(systemKey);
    }
  }

  function loadCatalog() {
    var frameworkManager = catalogManager('CCPEvidenceFrameworks', '| inputlookup framework_catalog.csv | lookup ccp_framework_selections framework_key OUTPUT selected | eval selected_value=tostring(coalesce(selected,default_selected)), selected=if(selected_value="1" OR selected_value="true",1,0) | search status=active selected=1 | table framework_key framework_name version content_digest');
    var frameworkResults = frameworkManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(frameworkResults, function(rows) { frameworks = rows; populateSelect('#ccp-framework-key', frameworks, 'framework_key', 'framework_name', 'No active frameworks. Configure Framework Setup first.'); applyUrlDefaults(); });
    frameworkManager.on('search:failed', function() { populateSelect('#ccp-framework-key', [], 'framework_key', 'framework_name', 'Framework catalog could not be loaded'); });

    var requirementManager = catalogManager('CCPEvidenceRequirements', '| inputlookup requirements.csv | lookup ccp_framework_selections framework_key OUTPUT selected | lookup ccp_framework_catalog framework_key OUTPUT default_selected | eval selected_value=tostring(coalesce(selected,default_selected)), selected=if(selected_value="1" OR selected_value="true",1,0) | search selected=1 | table framework_key requirement_key title');
    var requirementResults = requirementManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(requirementResults, function(rows) { requirements = rows; applyUrlDefaults(); });

    var scopeManager = catalogManager('CCPEvidenceScopes', '| inputlookup ccp_scopes | search status=active | table scope_key scope_name');
    var scopeResults = scopeManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(scopeResults, function(rows) { directScopeLoaded = true; populateSelect('#ccp-scope-key', rows, 'scope_key', 'scope_name', 'Configure an audit scope first'); applyUrlDefaults(); });
    scopeManager.on('search:failed', function() { populateSelect('#ccp-scope-key', [], 'scope_key', 'scope_name', 'Audit scopes could not be loaded'); });

    var systemManager = catalogManager('CCPEvidenceSystems', '| inputlookup ccp_systems | search status=active | table system_key system_name scope_key');
    var systemResults = systemManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(systemResults, function(rows) { systems = rows; applyUrlDefaults(); });

    setTimeout(function() {
      if (directScopeLoaded) { return; }
      service.request('storage/collections/data/ccp_scopes', 'GET', null, null, null, null, null).done(function(data) {
        var rows = collectionRows(data);
        directScopeLoaded = true;
        populateSelect('#ccp-scope-key', rows.filter(function(row) { return !row.status || row.status === 'active'; }), 'scope_key', 'scope_name', 'Configure an audit scope first');
        applyUrlDefaults();
      });
    }, 1500);
    [frameworkManager, requirementManager, scopeManager, systemManager].forEach(function(searchManager) {
      if (searchManager && typeof searchManager.startSearch === 'function') { searchManager.startSearch(); }
    });
  }

  $('#ccp-framework-key').on('change', refreshRequirements);
  $('#ccp-scope-key').on('change', refreshSystems);
  loadCatalog();

  function value(id) {
    return $.trim($('#' + id).val());
  }

  function requiredFields() {
    return [
      ['ccp-system-key', 'System key'],
      ['ccp-scope-key', 'Scope key'],
      ['ccp-framework-key', 'Framework key'],
      ['ccp-framework-version', 'Framework version'],
      ['ccp-content-digest', 'Content digest'],
      ['ccp-requirement-key', 'Requirement key'],
      ['ccp-evidence-type', 'Evidence type'],
      ['ccp-evidence-title', 'Evidence title'],
      ['ccp-evidence-owner', 'Owner'],
      ['ccp-collected-by', 'Collected by'],
      ['ccp-source-type', 'Source type']
    ];
  }

  function currentKey(payload) {
    return 'evidence-' + [payload.framework_key, payload.requirement_key, payload.scope_key, payload.system_key, payload.evidence_type, payload.title].join('-').replace(/[^a-zA-Z0-9_.-]/g, '-');
  }

  function saveCurrentEvidence(payload) {
    var key = currentKey(payload);
    var current = $.extend({}, payload, { _key: key, current_key: key });
    return service.request('storage/collections/data/ccp_evidence_current/batch_save', 'POST', null, null, JSON.stringify([current]), { 'Content-Type': 'application/json' }, null);
  }

  function saveEvidence() {
    message.removeClass('ccp-message-error ccp-message-success').text('');
    var missing = requiredFields().filter(function(field) { return !value(field[0]); });
    if (missing.length) {
      message.addClass('ccp-message-error').text('Required: ' + missing.map(function(field) { return field[1]; }).join(', '));
      return;
    }
    var reviewedBy = value('ccp-reviewed-by');
    var reviewedAt = value('ccp-reviewed-at');
    if ((reviewedBy && !reviewedAt) || (!reviewedBy && reviewedAt)) {
      message.addClass('ccp-message-error').text('Reviewed by and Reviewed at must be provided together.');
      return;
    }
    var sourceType = value('ccp-source-type');
    var documentUrl = value('ccp-document-url');
    if (/document|policy|procedure/i.test(sourceType) && !documentUrl && !value('ccp-evidence-location')) {
      message.addClass('ccp-message-error').text('Document or policy evidence requires a URL or Splunk reference.');
      return;
    }

    var payload = {
      system_key: value('ccp-system-key'),
      scope_key: value('ccp-scope-key'),
      framework_key: value('ccp-framework-key'),
      framework_version: value('ccp-framework-version'),
      content_digest: value('ccp-content-digest'),
      requirement_key: value('ccp-requirement-key'),
      evidence_type: value('ccp-evidence-type'),
      title: value('ccp-evidence-title'),
      location: value('ccp-evidence-location'),
      owner: value('ccp-evidence-owner'),
      collected_by: value('ccp-collected-by'),
      source_type: sourceType,
      status: value('ccp-evidence-status'),
      collected_at: value('ccp-collected-at'),
      review_due_at: value('ccp-review-due-at'),
      expires_at: value('ccp-expires-at'),
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
      acceptance_notes: value('ccp-acceptance-notes'),
      document_url: value('ccp-document-url'),
      document_version: value('ccp-document-version'),
      artifact_hash: value('ccp-artifact-hash')
    };

    $('#ccp-save-evidence').prop('disabled', true);
    service.request(
      'storage/collections/data/ccp_evidence',
      'POST',
      null,
      null,
      JSON.stringify(payload),
      { 'Content-Type': 'application/json' },
      null
    ).done(function() {
      saveCurrentEvidence(payload).done(function() {
        message.addClass('ccp-message-success').text('Evidence saved. Refresh the table to confirm the record.');
        $('#ccp-evidence-title, #ccp-evidence-location, #ccp-document-url, #ccp-document-version, #ccp-artifact-hash, #ccp-collected-at, #ccp-review-due-at, #ccp-expires-at, #ccp-reviewed-by, #ccp-reviewed-at, #ccp-acceptance-notes').val('');
      }).fail(function(xhr) {
        var detail = xhr && xhr.responseText ? ' ' + xhr.responseText : '';
        message.addClass('ccp-message-error').text('Evidence history saved, but current posture could not be updated.' + detail);
      });
    }).fail(function(xhr) {
      var detail = xhr && xhr.responseText ? ' ' + xhr.responseText : '';
      message.addClass('ccp-message-error').text('Evidence could not be saved.' + detail);
    }).always(function() {
      $('#ccp-save-evidence').prop('disabled', false);
    });
  }

  $('#ccp-save-evidence').on('click', saveEvidence);
});
