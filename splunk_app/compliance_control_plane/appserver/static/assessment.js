require([
  'jquery',
  'splunkjs/mvc',
  'splunkjs/mvc/searchmanager',
  'splunkjs/mvc/simplexml/ready!'
], function($, mvc, SearchManager) {
  'use strict';

  var service = mvc.createService();
  var message = $('#ccp-assessment-message');
  var frameworks = [];
  var requirements = [];
  var systems = [];
  var evidenceRecords = [];
  var measurementRecords = [];
  var directScopeLoaded = false;
  var urlParams = new URLSearchParams(window.location.search);

  function applyUrlDefaults() {
    var frameworkKey = urlParams.get('framework_token');
    var requirementKey = urlParams.get('requirement_token');
    var systemKey = urlParams.get('system_token');
    var scopeKey = urlParams.get('scope_token');
    if (frameworkKey && $('#ccp-assessment-framework option[value="' + frameworkKey + '"]').length) {
      $('#ccp-assessment-framework').val(frameworkKey);
    }
    if (systemKey) { $('#ccp-assessment-system').val(systemKey); }
    if (scopeKey && $('#ccp-assessment-scope option[value="' + scopeKey + '"]').length) {
      $('#ccp-assessment-scope').val(scopeKey);
    }
    refreshSystems();
    refreshRequirements();
    if (requirementKey && $('#ccp-assessment-requirement option[value="' + requirementKey + '"]').length) {
      $('#ccp-assessment-requirement').val(requirementKey);
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
    rows.forEach(function(row) {
      select.append($('<option>').val(row[valueField]).text(row[labelField]));
    });
  }

  function catalogManager(id, search) {
    return mvc.Components.get(id) || new SearchManager({ id: id, search: search, earliest_time: '0', latest_time: 'now' }, { tokens: false });
  }

  function loadCatalog() {
    var frameworkManager = catalogManager('CCPAssessmentFrameworks', '| inputlookup framework_catalog.csv | lookup ccp_framework_selections framework_key OUTPUT selected | eval selected_value=tostring(coalesce(selected,default_selected)), selected=if(selected_value="1" OR selected_value="true",1,0) | search status=active selected=1 | table framework_key framework_name version content_digest');
    var frameworkResults = frameworkManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(frameworkResults, function(rows) {
      frameworks = rows;
      populateSelect('#ccp-assessment-framework', frameworks, 'framework_key', 'framework_name', 'No active frameworks');
      applyUrlDefaults();
    });
    frameworkManager.on('search:failed', function() { populateSelect('#ccp-assessment-framework', [], 'framework_key', 'framework_name', 'Framework catalog could not be loaded'); });

    var requirementManager = catalogManager('CCPAssessmentRequirements', '| inputlookup requirements.csv | lookup ccp_framework_selections framework_key OUTPUT selected | lookup ccp_framework_catalog framework_key OUTPUT default_selected | eval selected_value=tostring(coalesce(selected,default_selected)), selected=if(selected_value="1" OR selected_value="true",1,0) | search selected=1 | table framework_key requirement_key title verification_mode measurement_key');
    var requirementResults = requirementManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(requirementResults, function(rows) { requirements = rows; applyUrlDefaults(); });

    var scopeManager = catalogManager('CCPAssessmentScopes', '| inputlookup ccp_scopes | search status=active | table scope_key scope_name');
    var scopeResults = scopeManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(scopeResults, function(rows) { directScopeLoaded = true; populateSelect('#ccp-assessment-scope', rows, 'scope_key', 'scope_name', 'Configure an audit scope first'); applyUrlDefaults(); });
    scopeManager.on('search:failed', function() { populateSelect('#ccp-assessment-scope', [], 'scope_key', 'scope_name', 'Audit scopes could not be loaded'); });

    var systemManager = catalogManager('CCPAssessmentSystems', '| inputlookup ccp_systems | search status=active | table system_key system_name scope_key');
    var systemResults = systemManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(systemResults, function(rows) { systems = rows; applyUrlDefaults(); });

    var evidenceManager = catalogManager('CCPAssessmentEvidence', '| inputlookup ccp_evidence_current | search status="Current" | table system_key scope_key framework_key requirement_key document_url location reviewed_at');
    var evidenceResults = evidenceManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(evidenceResults, function(rows) { evidenceRecords = rows; });

    var measurementManager = catalogManager('CCPAssessmentMeasurements', '| inputlookup ccp_measurements | sort 0 - measured_at | dedup scope_key framework_key requirement_key | table scope_key framework_key requirement_key status measured_at');
    var measurementResults = measurementManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(measurementResults, function(rows) { measurementRecords = rows; });

    setTimeout(function() {
      if (directScopeLoaded) { return; }
      service.request('storage/collections/data/ccp_scopes', 'GET', null, null, null, null, null).done(function(data) {
      var rows = collectionRows(data);
        directScopeLoaded = true;
        populateSelect('#ccp-assessment-scope', rows.filter(function(row) { return !row.status || row.status === 'active'; }), 'scope_key', 'scope_name', 'Configure an audit scope first');
        applyUrlDefaults();
      });
    }, 1500);
    [frameworkManager, requirementManager, scopeManager, systemManager, evidenceManager, measurementManager].forEach(function(searchManager) {
      if (searchManager && typeof searchManager.startSearch === 'function') { searchManager.startSearch(); }
    });
  }

  function refreshRequirements() {
    var frameworkKey = $('#ccp-assessment-framework').val();
    var framework = frameworks.filter(function(row) { return row.framework_key === frameworkKey; })[0];
    if (framework) {
      $('#ccp-assessment-framework-version').val(framework.version || '');
      $('#ccp-assessment-content-digest').val(framework.content_digest || '');
    }
    var matching = requirements.filter(function(row) { return row.framework_key === frameworkKey; });
    populateSelect('#ccp-assessment-requirement', matching, 'requirement_key', 'title', 'No checks are available for this framework');
  }

  function refreshSystems() {
    var scopeKey = $('#ccp-assessment-scope').val();
    var matching = systems.filter(function(row) { return !scopeKey || row.scope_key === scopeKey; });
    populateSelect('#ccp-assessment-system', matching, 'system_key', 'system_name', 'Register a system in this audit scope first');
    var systemKey = urlParams.get('system_token');
    if (systemKey && $('#ccp-assessment-system option[value="' + systemKey + '"]').length) {
      $('#ccp-assessment-system').val(systemKey);
    }
  }

  $('#ccp-assessment-framework').on('change', refreshRequirements);
  $('#ccp-assessment-scope').on('change', refreshSystems);
  loadCatalog();

  function value(id) { return $.trim($('#' + id).val()); }

  function selectedRequirement() {
    var key = value('ccp-assessment-requirement');
    return requirements.filter(function(item) {
      return item.framework_key === value('ccp-assessment-framework') && item.requirement_key === key;
    })[0] || null;
  }

  function hasCurrentReviewedEvidence(payload) {
    return evidenceRecords.some(function(item) {
      return item.system_key === payload.system_key && item.scope_key === payload.scope_key &&
        item.framework_key === payload.framework_key && item.requirement_key === payload.requirement_key &&
        item.reviewed_at && (item.document_url || item.location);
    });
  }

  function hasPassingMeasurement(payload) {
    return measurementRecords.some(function(item) {
      return item.scope_key === payload.scope_key && item.framework_key === payload.framework_key &&
        item.requirement_key === payload.requirement_key && item.status === 'Pass';
    });
  }

  function findingFor(payload) {
    if (payload.status !== 'Fail' && payload.status !== 'Partial') {
      return null;
    }
    var findingKey = 'assessment-' + (payload.framework_key + '-' + payload.requirement_key + '-' + payload.system_key).replace(/[^a-zA-Z0-9_.-]/g, '-');
    return {
      _key: findingKey,
      finding_key: findingKey,
      scope_key: payload.scope_key,
      framework_key: payload.framework_key,
      framework_version: payload.framework_version,
      requirement_key: payload.requirement_key,
      title: 'Assessment requires remediation: ' + payload.requirement_key,
      severity: payload.status === 'Fail' ? 'High' : 'Medium',
      status: 'Open',
      owner: 'Control owner',
      owner_kind: 'team',
      owner_role: 'control_owner',
      due_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
      remediation: payload.notes,
      source: 'assessment',
      exception_reference: payload.exception_reference || '',
      retest_at: '',
      closed_at: '',
      notes: 'Created from a partial or failed assessment decision.',
      updated_at: new Date().toISOString()
    };
  }

  function saveFinding(finding) {
    return service.request('storage/collections/data/ccp_findings/batch_save', 'POST', null, null, JSON.stringify([finding]), { 'Content-Type': 'application/json' }, null);
  }

  function currentKey(payload) {
    return 'assessment-' + [payload.framework_key, payload.requirement_key, payload.scope_key, payload.system_key].join('-').replace(/[^a-zA-Z0-9_.-]/g, '-');
  }

  function saveCurrentAssessment(payload) {
    var key = currentKey(payload);
    var current = $.extend({}, payload, { _key: key, current_key: key });
    return service.request('storage/collections/data/ccp_assessment_current/batch_save', 'POST', null, null, JSON.stringify([current]), { 'Content-Type': 'application/json' }, null);
  }

  function saveAssessment() {
    message.removeClass('ccp-message-error ccp-message-success').text('');
    var required = [
      ['ccp-assessment-system', 'System key'],
      ['ccp-assessment-scope', 'Scope key'],
      ['ccp-assessment-framework', 'Framework key'],
      ['ccp-assessment-framework-version', 'Framework version'],
      ['ccp-assessment-content-digest', 'Content digest'],
      ['ccp-assessment-requirement', 'Requirement key'],
      ['ccp-assessment-assessor', 'Assessor'],
      ['ccp-assessed-at', 'Assessed at'],
      ['ccp-assessment-notes', 'Decision notes']
    ];
    var missing = required.filter(function(field) { return !value(field[0]); });
    if (missing.length) {
      message.addClass('ccp-message-error').text('Required: ' + missing.map(function(field) { return field[1]; }).join(', '));
      return;
    }
    var score = value('ccp-assessment-score');
    if (score && (Number(score) < 0 || Number(score) > 100)) {
      message.addClass('ccp-message-error').text('Score must be between 0 and 100.');
      return;
    }
    var reviewer = value('ccp-assessment-reviewer');
    var reviewedAt = value('ccp-assessment-reviewed-at');
    if ((reviewer && !reviewedAt) || (!reviewer && reviewedAt)) {
      message.addClass('ccp-message-error').text('Reviewer and Reviewed at must be provided together.');
      return;
    }
    var requirement = selectedRequirement();
    if (value('ccp-assessment-status') === 'Pass' && requirement) {
      if ((requirement.verification_mode === 'document' || requirement.verification_mode === 'hybrid') && !hasCurrentReviewedEvidence({
        system_key: value('ccp-assessment-system'), scope_key: value('ccp-assessment-scope'),
        framework_key: value('ccp-assessment-framework'), requirement_key: value('ccp-assessment-requirement')
      })) {
        message.addClass('ccp-message-error').text('Pass requires current, reviewed evidence with a document URL or Splunk reference.');
        return;
      }
      if ((requirement.verification_mode === 'technical' || requirement.verification_mode === 'hybrid') && requirement.measurement_key && !hasPassingMeasurement({
        scope_key: value('ccp-assessment-scope'), framework_key: value('ccp-assessment-framework'), requirement_key: value('ccp-assessment-requirement')
      })) {
        message.addClass('ccp-message-error').text('Pass requires a passing technical measurement for this check.');
        return;
      }
    }
    var payload = {
      system_key: value('ccp-assessment-system'),
      scope_key: value('ccp-assessment-scope'),
      framework_key: value('ccp-assessment-framework'),
      framework_version: value('ccp-assessment-framework-version'),
      content_digest: value('ccp-assessment-content-digest'),
      requirement_key: value('ccp-assessment-requirement'),
      status: value('ccp-assessment-status'),
      score: score ? Number(score) : 0,
      assessor: value('ccp-assessment-assessor'),
      assessed_at: value('ccp-assessed-at'),
      reviewer: reviewer,
      reviewed_at: reviewedAt,
      valid_until: value('ccp-assessment-valid-until'),
      exception_reference: value('ccp-assessment-exception'),
      notes: value('ccp-assessment-notes')
    };
    $('#ccp-save-assessment').prop('disabled', true);
    service.request('storage/collections/data/ccp_assessments', 'POST', null, null, JSON.stringify(payload), { 'Content-Type': 'application/json' }, null)
      .done(function() {
        saveCurrentAssessment(payload).done(function() {
          var finding = findingFor(payload);
          if (!finding) {
            message.addClass('ccp-message-success').text('Assessment saved. Refresh the table to confirm the decision.');
          } else {
            saveFinding(finding).done(function() {
              message.addClass('ccp-message-success').text('Assessment saved and remediation finding created.');
            }).fail(function(xhr) {
              var detail = xhr && xhr.responseText ? ' ' + xhr.responseText : '';
              message.addClass('ccp-message-error').text('Assessment saved, but the remediation finding could not be created.' + detail);
            });
          }
        }).fail(function(xhr) {
          var detail = xhr && xhr.responseText ? ' ' + xhr.responseText : '';
          message.addClass('ccp-message-error').text('Assessment history saved, but current posture could not be updated.' + detail);
        });
        $('#ccp-assessment-notes, #ccp-assessed-at, #ccp-assessment-score, #ccp-assessment-reviewer, #ccp-assessment-reviewed-at, #ccp-assessment-valid-until, #ccp-assessment-exception').val('');
      }).fail(function(xhr) {
        var detail = xhr && xhr.responseText ? ' ' + xhr.responseText : '';
        message.addClass('ccp-message-error').text('Assessment could not be saved.' + detail);
      }).always(function() { $('#ccp-save-assessment').prop('disabled', false); });
  }

  $('#ccp-save-assessment').on('click', saveAssessment);
});
