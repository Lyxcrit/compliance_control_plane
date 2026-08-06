require([
  'jquery',
  'splunkjs/mvc',
  'splunkjs/mvc/searchmanager',
  'splunkjs/mvc/simplexml/ready!'
], function($, mvc, SearchManager) {
  'use strict';

  var service = mvc.createService();
  var message = $('#ccp-measurement-message');
  var technicalChecks = [];
  var directScopeLoaded = false;

  function rows(data, resultModel) {
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
      var values = rows(properties, resultModel);
      if (!values.length && resultModel.data && resultModel.data()) {
        values = rows(resultModel.data(), resultModel);
      }
      handler(values);
    });
    if (resultModel.data && resultModel.data()) {
      var settled = rows(resultModel.data(), resultModel);
      if (settled.length) { handler(settled); }
    }
  }

  function populate(selector, values, valueField, labelField, emptyLabel) {
    var select = $(selector).empty();
    if (!values.length) {
      select.append($('<option>').val('').text(emptyLabel));
      return;
    }
    select.append($('<option>').val('').text('Select...'));
    values.forEach(function(item) { select.append($('<option>').val(item[valueField]).text(item[labelField])); });
  }

  function catalogManager(id, search) {
    return mvc.Components.get(id) || new SearchManager({ id: id, search: search, earliest_time: '0', latest_time: 'now' }, { tokens: false });
  }

  function selectedCheck() {
    var key = value('ccp-measurement-check');
    return technicalChecks.filter(function(item) { return item.check_key === key; })[0] || null;
  }

  function applyCheck() {
    var check = selectedCheck();
    if (!check) { return; }
    $('#ccp-measurement-name').val(check.measurement_key);
    $('#ccp-measurement-adapter').val(check.adapter_key);
    $('#ccp-measurement-expected').val(check.expected_value);
    $('#ccp-measurement-source').val('Automated check: ' + check.display_name);
    $('#ccp-measurement-limitations').val(check.limitations);
  }

  function loadMeasurementCatalogs() {
    // Catalog searches, including technical_checks.csv, are declared in the dashboard XML so Splunk owns their lifecycle.
    var scopeManager = catalogManager('CCPMeasurementScopes', '| inputlookup ccp_scopes | search status=active | sort scope_name | table scope_key scope_name');
    var scopeResults = scopeManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(scopeResults, function(values) { directScopeLoaded = true; populate('#ccp-measurement-scope', values, 'scope_key', 'scope_name', 'Configure an audit scope first'); });
    scopeManager.on('search:failed', function() { populate('#ccp-measurement-scope', [], 'scope_key', 'scope_name', 'Audit scopes could not be loaded'); });

    var requirementManager = catalogManager('CCPMeasurementRequirements', '| inputlookup requirements.csv | search framework_key="omb-m-26-14" | sort requirement_key | table requirement_key title');
    var requirementResults = requirementManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(requirementResults, function(values) { populate('#ccp-measurement-requirement', values, 'requirement_key', 'title', 'M-26-14 checks are unavailable'); });
    requirementManager.on('search:failed', function() { populate('#ccp-measurement-requirement', [], 'requirement_key', 'title', 'M-26-14 checks could not be loaded'); });

    var measurementManager = catalogManager('CCPMeasurementDefinitions', '| inputlookup measurement_adapters.csv | search status="ready" | dedup measurement_key | sort display_name | table measurement_key display_name');
    var measurementResults = measurementManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(measurementResults, function(values) { populate('#ccp-measurement-name', values, 'measurement_key', 'display_name', 'Measurement catalog is unavailable'); });
    measurementManager.on('search:failed', function() { populate('#ccp-measurement-name', [], 'measurement_key', 'display_name', 'Measurements could not be loaded'); });

    var adapterManager = catalogManager('CCPMeasurementAdapters', '| inputlookup measurement_adapters.csv | search status="ready" | sort display_name | table adapter_key display_name');
    var adapterResults = adapterManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(adapterResults, function(values) { populate('#ccp-measurement-adapter', values, 'adapter_key', 'display_name', 'Adapters are unavailable'); });
    adapterManager.on('search:failed', function() { populate('#ccp-measurement-adapter', [], 'adapter_key', 'display_name', 'Adapters could not be loaded'); });

    var checkManager = catalogManager('CCPTechnicalChecks', '| inputlookup technical_checks.csv | sort display_name | table check_key display_name measurement_key adapter_key evidence_type search expected_value limitations');
    var checkResults = checkManager.data('results', { count: 0, output_mode: 'json' });
    bindResults(checkResults, function(values) {
      technicalChecks = values;
      populate('#ccp-measurement-check', technicalChecks, 'check_key', 'display_name', 'No executable checks are available');
    });
    checkManager.on('search:failed', function() { populate('#ccp-measurement-check', [], 'check_key', 'display_name', 'Executable checks could not be loaded'); });

    setTimeout(function() {
      if (directScopeLoaded) { return; }
      service.request('storage/collections/data/ccp_scopes', 'GET', null, null, null, null, null).done(function(data) {
        var scopeRows = collectionRows(data);
        directScopeLoaded = true;
        populate('#ccp-measurement-scope', scopeRows.filter(function(row) { return !row.status || row.status === 'active'; }), 'scope_key', 'scope_name', 'Configure an audit scope first');
      });
    }, 1500);
    [scopeManager, requirementManager, measurementManager, adapterManager, checkManager].forEach(function(searchManager) {
      if (searchManager && typeof searchManager.startSearch === 'function') { searchManager.startSearch(); }
    });
  }

  loadMeasurementCatalogs();
  $('#ccp-measurement-check').on('change', applyCheck);

  function value(id) { return $.trim($('#' + id).val()); }

  function findingFor(payload) {
    if (payload.status !== 'Fail' && payload.status !== 'Partial') {
      return null;
    }
    var findingKey = 'measurement-' + payload.result_key;
    return {
      _key: findingKey,
      finding_key: findingKey,
      scope_key: payload.scope_key,
      framework_key: payload.framework_key,
      framework_version: payload.framework_version,
      requirement_key: payload.requirement_key,
      title: 'Measurement requires remediation: ' + payload.measurement_key,
      severity: payload.status === 'Fail' ? 'High' : 'Medium',
      status: 'Open',
      owner: 'Control owner',
      owner_kind: 'team',
      owner_role: 'control_owner',
      due_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
      remediation: 'Review the observed value against the expected value, correct the underlying condition, and record a retest. Observed: ' + payload.observed_value + '. Expected: ' + payload.expected_value + '.',
      source: payload.adapter_key,
      retest_at: '',
      exception_reference: '',
      closed_at: '',
      notes: payload.limitations || 'Created from a partial or failed technical measurement.',
      updated_at: new Date().toISOString()
    };
  }

  function saveFinding(finding) {
    return service.request('storage/collections/data/ccp_findings/batch_save', 'POST', null, null, JSON.stringify([finding]), { 'Content-Type': 'application/json' }, null);
  }

  $('#ccp-run-check').on('click', function() {
    var check = selectedCheck();
    if (!check) {
      message.removeClass('ccp-message-success').addClass('ccp-message-error').text('Select an executable check first.');
      return;
    }
    message.removeClass('ccp-message-error ccp-message-success').text('Running check...');
    $('#ccp-run-check').prop('disabled', true);
    var manager = new SearchManager({
      id: 'CCPRunTechnicalCheck' + String(Date.now()),
      search: check.search,
      earliest_time: '0',
      latest_time: 'now'
    }, { tokens: false });
    var runResults = manager.data('results', { count: 1, output_mode: 'json' });
    bindResults(runResults, function(values) {
      var result = values[0];
      if (!result || !result.status) {
        message.removeClass('ccp-message-success').addClass('ccp-message-error').text('The check returned no usable result data.');
        return;
      }
      $('#ccp-measurement-status').val(result.status);
      $('#ccp-measurement-observed').val(result.observed || '');
      $('#ccp-measurement-expected').val(result.expected || check.expected_value);
      $('#ccp-measurement-at').val(new Date().toISOString());
      $('#ccp-measurement-limitations').val(check.limitations + (result.details ? ' ' + result.details : ''));
      $('#ccp-check-result').text(result.status + ': ' + (result.observed || '') + (result.details ? ' ' + result.details : ''));
      message.removeClass('ccp-message-error').addClass('ccp-message-success').text('Check completed. Review the result and save it as measurement evidence.');
    });
    manager.on('search:failed', function() { message.removeClass('ccp-message-success').addClass('ccp-message-error').text('The technical check could not run. Verify the required data source and permissions.'); });
    manager.on('search:error', function() { message.removeClass('ccp-message-success').addClass('ccp-message-error').text('The technical check returned an error.'); });
    manager.on('search:done', function() { $('#ccp-run-check').prop('disabled', false); });
  });

  $('#ccp-save-measurement').on('click', function() {
    var required = [
      ['ccp-measurement-key', 'Result key'], ['ccp-measurement-scope', 'Scope key'],
      ['ccp-measurement-framework', 'Framework key'], ['ccp-measurement-version', 'Framework version'],
      ['ccp-measurement-requirement', 'Requirement key'], ['ccp-measurement-name', 'Measurement key'],
      ['ccp-measurement-adapter', 'Adapter key'], ['ccp-measurement-observed', 'Observed value'],
      ['ccp-measurement-expected', 'Expected value'], ['ccp-measurement-at', 'Measured at'],
      ['ccp-measurement-source', 'Source']
    ];
    var missing = required.filter(function(field) { return !value(field[0]); });
    if (missing.length) {
      message.removeClass('ccp-message-success').addClass('ccp-message-error').text('Required: ' + missing.map(function(field) { return field[1]; }).join(', '));
      return;
    }
    var key = value('ccp-measurement-key');
    var payload = {
      _key: key, result_key: key, scope_key: value('ccp-measurement-scope'),
      framework_key: value('ccp-measurement-framework'), framework_version: value('ccp-measurement-version'),
      requirement_key: value('ccp-measurement-requirement'), measurement_key: value('ccp-measurement-name'),
      adapter_key: value('ccp-measurement-adapter'), status: value('ccp-measurement-status'),
      observed_value: value('ccp-measurement-observed'), expected_value: value('ccp-measurement-expected'),
      measured_at: value('ccp-measurement-at'), source: value('ccp-measurement-source'),
      evidence_key: value('ccp-measurement-evidence'), limitations: value('ccp-measurement-limitations'),
      updated_at: new Date().toISOString()
    };
    message.removeClass('ccp-message-error ccp-message-success').text('Saving...');
    $('#ccp-save-measurement').prop('disabled', true);
    service.request('storage/collections/data/ccp_measurements', 'POST', null, null, JSON.stringify(payload), { 'Content-Type': 'application/json' }, null)
      .done(function() {
        var finding = findingFor(payload);
        if (!finding) {
          message.removeClass('ccp-message-error').addClass('ccp-message-success').text('Measurement result saved. Refresh the table to confirm it.');
          return;
        }
        saveFinding(finding).done(function() {
          message.removeClass('ccp-message-error').addClass('ccp-message-success').text('Measurement saved and remediation finding created.');
        }).fail(function(xhr) {
          var detail = xhr && xhr.responseText ? ' ' + xhr.responseText : '';
          message.removeClass('ccp-message-success').addClass('ccp-message-error').text('Measurement saved, but the remediation finding could not be created.' + detail);
        });
      })
      .fail(function(xhr) { var detail = xhr && xhr.responseText ? ' ' + xhr.responseText : ''; message.removeClass('ccp-message-success').addClass('ccp-message-error').text('Measurement result could not be saved.' + detail); })
      .always(function() { $('#ccp-save-measurement').prop('disabled', false); });
  });
});
