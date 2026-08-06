require([
  'jquery',
  'splunkjs/mvc',
  'splunkjs/mvc/searchmanager',
  'splunkjs/mvc/simplexml/ready!'
], function($, mvc, SearchManager) {
  'use strict';

  var service = mvc.createService();
  var message = $('#ccp-framework-message');
  var scopeMessage = $('#ccp-scope-message');
  var systemMessage = $('#ccp-system-message');
  var directScopeLoaded = false;
  var directScopeRequested = false;
  var directScopeAttempts = 0;
  var manager = new SearchManager({
    id: 'CCPFrameworkCatalog',
    search: '| inputlookup framework_catalog.csv | lookup ccp_framework_selections framework_key OUTPUT selected | eval selected=coalesce(selected, default_selected), selected=if(selected=1,1,0) | sort framework_name | table framework_key framework_name version authority content_status selected summary source_url',
    earliest_time: '0',
    latest_time: 'now'
  }, { tokens: false });
  var results = manager.data('results', { count: 0, output_mode: 'json' });
  var scopeManager = mvc.Components.get('CCPSetupScopes') || new SearchManager({
    id: 'CCPSetupScopes',
    search: '| inputlookup ccp_scopes | search status=active | sort scope_name | table scope_key scope_name',
    earliest_time: '0',
    latest_time: 'now'
  }, { tokens: false });
  var scopeResults = scopeManager.data('results', { count: 0, output_mode: 'json' });

  function esc(value) {
    return $('<div>').text(value || '').html();
  }

  function render(rows, fields) {
    var list = $('#ccp-framework-list').empty();
    if (!rows.length) {
      list.append('<div class="ccp-empty-state">No framework content is available yet.</div>');
      return;
    }
    rows.forEach(function(row) {
      var item = {};
      fields.forEach(function(field, index) { item[field] = row[index]; });
      var checked = String(item.selected) === '1' ? ' checked' : '';
      var statusClass = item.content_status === 'complete' ? 'ccp-pack-complete' : 'ccp-pack-foundation';
      list.append(
        '<label class="ccp-framework-card">' +
          '<input class="ccp-framework-checkbox" type="checkbox" data-framework-key="' + esc(item.framework_key) + '"' + checked + ' />' +
          '<span class="ccp-framework-card-body"><strong>' + esc(item.framework_name) + '</strong>' +
          '<span class="ccp-framework-version">' + esc(item.version) + ' · ' + esc(item.authority) + '</span>' +
          '<span class="ccp-framework-summary">' + esc(item.summary) + '</span>' +
          '<span class="ccp-pack-status ' + statusClass + '">' + esc(item.content_status) + ' content pack</span></span>' +
        '</label>'
      );
    });
  }

  function showError(detail) {
    $('#ccp-framework-list').html('<div class="ccp-empty-state ccp-message-error">Framework content could not be loaded. ' + esc(detail || 'Check the search log and app permissions.') + '</div>');
  }

  function consumeScopes(data) {
    var payload = data && data.data ? data.data : data;
    if (!payload && directScopeLoaded) {
      return;
    }
    if (Array.isArray(payload)) {
      payload = { rows: payload.map(function(row) {
        return [row.scope_key, row.scope_name];
      }), fields: ['scope_key', 'scope_name'] };
    }
    if (payload && Array.isArray(payload.results) && Array.isArray(payload.fields)) {
      payload.rows = payload.results.map(function(result) {
        return payload.fields.map(function(field) { return result[typeof field === 'string' ? field : field.name]; });
      });
    }
    var select = $('#ccp-system-record-scope').empty();
    if (!payload || !Array.isArray(payload.rows)) {
      if (directScopeLoaded || select.find('option[value]').length > 1) {
        return;
      }
      select.append('<option value="">Audit scopes could not be loaded</option>');
      return;
    }
    directScopeLoaded = true;
    if (!payload.rows.length) {
      select.append('<option value="">Create an audit scope first</option>');
      return;
    }
    select.append('<option value="">Select an audit scope</option>');
    payload.rows.forEach(function(row) {
      var fields = payload.fields || [];
      var item = {};
      fields.forEach(function(field, fieldIndex) { item[typeof field === 'string' ? field : field.name] = row[fieldIndex]; });
      select.append($('<option>').val(item.scope_key).text(item.scope_name));
    });
  }

  function loadScopesDirect() {
    if (directScopeRequested) {
      return;
    }
    directScopeRequested = true;
    directScopeAttempts += 1;
    service.request('storage/collections/data/ccp_scopes', 'GET', null, null, null, null, null)
      .done(function(data) {
        var rows = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
        rows = rows.filter(function(row) { return !row.status || row.status === 'active'; });
        consumeScopes({ rows: rows.map(function(row) { return [row.scope_key, row.scope_name]; }), fields: ['scope_key', 'scope_name'] });
      }).fail(function() {
        directScopeRequested = false;
        if (!directScopeLoaded && directScopeAttempts < 4) {
          setTimeout(loadScopesDirect, directScopeAttempts * 1500);
        } else if (!directScopeLoaded) {
          consumeScopes(null);
        }
      });
  }

  scopeResults.on('data', function(properties) {
    consumeScopes(properties && properties.data ? properties.data : properties);
  });
  if (scopeResults.data && scopeResults.data()) {
    consumeScopes(scopeResults.data());
  }
  scopeResults.on('error', function() { loadScopesDirect(); });
  scopeManager.on('search:failed', function() { loadScopesDirect(); });
  if (scopeManager && typeof scopeManager.startSearch === 'function') {
    scopeManager.startSearch();
  }
  loadScopesDirect();
  setTimeout(function() { if (!directScopeLoaded) { loadScopesDirect(); } }, 5000);

  function consume(data) {
    if (!data) {
      return false;
    }

    if (Array.isArray(data.rows)) {
      render(data.rows, data.fields || []);
      return true;
    }

    // Splunk 10 returns JSON objects under `results`; older releases expose
    // positional values under `rows`. Normalize both to the renderer format.
    if (Array.isArray(data.results) && Array.isArray(data.fields)) {
      var fields = data.fields.map(function(field) {
        return typeof field === 'string' ? field : field.name;
      });
      var rows = data.results.map(function(result) {
        return fields.map(function(field) { return result[field]; });
      });
      render(rows, fields);
      return true;
    }

    return false;
  }

  results.on('data', function(properties) {
    var data = properties && properties.data ? properties.data : properties;
    if (!data && typeof results.data === 'function') {
      data = results.data();
    }
    if (!consume(data)) {
      // Splunk 10 can emit the model event before its JSON payload is attached.
      setTimeout(function() {
        var settled = typeof results.data === 'function' ? results.data() : null;
        if (!consume(settled)) {
          showError('The search returned no usable result data.');
        }
      }, 0);
    }
  });

  results.on('error', function() {
    showError('The framework catalog search failed.');
  });

  manager.on('search:failed', function() {
    showError('The framework catalog search failed.');
  });

  $('#ccp-save-frameworks').on('click', function() {
    var records = [];
    $('.ccp-framework-checkbox').each(function() {
      var checkbox = $(this);
      var key = checkbox.data('framework-key');
      records.push({
        _key: key,
        framework_key: key,
        selected: checkbox.is(':checked'),
        updated_by: mvc.Components.get('default') ? mvc.Components.get('default').get('user') : '',
        updated_at: new Date().toISOString()
      });
    });
    message.removeClass('ccp-message-error ccp-message-success').text('Saving...');
    service.request(
      'storage/collections/data/ccp_framework_selections/batch_save',
      'POST',
      null,
      null,
      JSON.stringify(records),
      { 'Content-Type': 'application/json' },
      null
    ).done(function() {
      message.addClass('ccp-message-success').text('Framework selection saved. Open Home or Audit Review to use the selected content.');
    }).fail(function(xhr) {
      var detail = xhr && xhr.responseText ? ' ' + xhr.responseText : '';
      message.addClass('ccp-message-error').text('Framework selection could not be saved.' + detail);
    });
  });

  $('#ccp-save-scope').on('click', function() {
    var key = $.trim($('#ccp-scope-key').val());
    var name = $.trim($('#ccp-scope-name').val());
    var owner = $.trim($('#ccp-scope-owner').val());
    if (!key || !name || !owner) {
      scopeMessage.removeClass('ccp-message-success').addClass('ccp-message-error').text('Scope key, name, and owner are required.');
      return;
    }
    scopeMessage.removeClass('ccp-message-error ccp-message-success').text('Saving...');
    var payload = {
      _key: key,
      scope_key: key,
      scope_name: name,
      scope_type: $('#ccp-scope-type').val(),
      owner: owner,
      description: $.trim($('#ccp-scope-description').val()),
      status: 'active',
      updated_at: new Date().toISOString()
    };
    service.request(
      'storage/collections/data/ccp_scopes',
      'POST',
      null,
      null,
      JSON.stringify(payload),
      { 'Content-Type': 'application/json' },
      null
    ).done(function() {
      scopeMessage.removeClass('ccp-message-error').addClass('ccp-message-success').text('Audit scope saved. Refresh the table to confirm it.');
    }).fail(function(xhr) {
      var detail = xhr && xhr.responseText ? ' ' + xhr.responseText : '';
      scopeMessage.removeClass('ccp-message-success').addClass('ccp-message-error').text('Audit scope could not be saved.' + detail);
    });
  });

  $('#ccp-save-system').on('click', function() {
    var key = $.trim($('#ccp-system-record-key').val());
    var name = $.trim($('#ccp-system-record-name').val());
    var scope = $.trim($('#ccp-system-record-scope').val());
    var owner = $.trim($('#ccp-system-record-owner').val());
    if (!key || !name || !scope || !owner) {
      systemMessage.removeClass('ccp-message-success').addClass('ccp-message-error').text('System key, name, scope, and owner are required.');
      return;
    }
    systemMessage.removeClass('ccp-message-error ccp-message-success').text('Saving...');
    var payload = {
      _key: key,
      system_key: key,
      system_name: name,
      scope_key: scope,
      description: $.trim($('#ccp-system-record-description').val()),
      system_type: $('#ccp-system-record-type').val(),
      environment: $('#ccp-system-record-environment').val(),
      owner: owner,
      business_owner: $.trim($('#ccp-system-record-business-owner').val()),
      technical_owner: $.trim($('#ccp-system-record-technical-owner').val()),
      criticality: $('#ccp-system-record-criticality').val(),
      data_classification: $('#ccp-system-record-classification').val(),
      regulatory_impact: $('#ccp-system-record-regulatory-impact').val(),
      status: 'active',
      updated_at: new Date().toISOString()
    };
    service.request('storage/collections/data/ccp_systems', 'POST', null, null, JSON.stringify(payload), { 'Content-Type': 'application/json' }, null)
      .done(function() { systemMessage.removeClass('ccp-message-error').addClass('ccp-message-success').text('System saved. Refresh the table to confirm it.'); })
      .fail(function(xhr) { var detail = xhr && xhr.responseText ? ' ' + xhr.responseText : ''; systemMessage.removeClass('ccp-message-success').addClass('ccp-message-error').text('System could not be saved.' + detail); });
  });
});
