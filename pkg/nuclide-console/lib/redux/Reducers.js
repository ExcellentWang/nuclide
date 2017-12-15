'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = accumulateState;

var _collection;

function _load_collection() {
  return _collection = require('nuclide-commons/collection');
}

var _Actions;

function _load_Actions() {
  return _Actions = _interopRequireWildcard(require('./Actions'));
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

const RECORD_PROPERTIES_TO_COMPARE = ['text', 'level', 'scopeName', 'sourceId', 'kind']; /**
                                                                                          * Copyright (c) 2015-present, Facebook, Inc.
                                                                                          * All rights reserved.
                                                                                          *
                                                                                          * This source code is licensed under the license found in the LICENSE file in
                                                                                          * the root directory of this source tree.
                                                                                          *
                                                                                          * 
                                                                                          * @format
                                                                                          */

function shouldAccumulateRecordCount(recordA, recordB) {
  if (String(recordA.sourceId).toLowerCase().includes('debugger') || String(recordB.sourceId).toLowerCase().includes('debugger')) {
    return false;
  }
  const areRelevantPropertiesEqual = RECORD_PROPERTIES_TO_COMPARE.every(prop => recordA[prop] === recordB[prop]);

  // if data exists, we should not accumulate this into the previous record
  const doesDataExist = recordA.data || recordB.data;

  const recATags = recordA.tags;
  const recBTags = recordB.tags;
  const areTagsEqual = !recATags && !recBTags || recATags && recBTags && (0, (_collection || _load_collection()).arrayEqual)(recATags, recBTags);

  return areRelevantPropertiesEqual && !Boolean(doesDataExist) && Boolean(areTagsEqual);
}

function accumulateState(state, action) {
  switch (action.type) {
    case (_Actions || _load_Actions()).RECORD_RECEIVED:
      {
        const { record } = action.payload;
        // check if the message is exactly the same as the previous one, if so
        // we add a count to it.
        const lastRecord = state.records[state.records.length - 1];
        if (state.records.length && shouldAccumulateRecordCount(lastRecord, record)) {
          state.records[state.records.length - 1] = Object.assign({}, lastRecord, {
            repeatCount: lastRecord.repeatCount + 1,
            timestamp: record.timestamp
          });
          return state;
        } else {
          return Object.assign({}, state, {
            records: state.records.concat(record).slice(-state.maxMessageCount)
          });
        }
      }
    case (_Actions || _load_Actions()).SET_MAX_MESSAGE_COUNT:
      {
        const { maxMessageCount } = action.payload;
        if (maxMessageCount <= 0) {
          return state;
        }
        return Object.assign({}, state, {
          maxMessageCount,
          records: state.records.slice(-maxMessageCount)
        });
      }
    case (_Actions || _load_Actions()).REGISTER_SOURCE:
      {
        const { source } = action.payload;
        return Object.assign({}, state, {
          providers: new Map(state.providers).set(source.id, Object.assign({}, source, {
            name: source.name || source.id
          }))
        });
      }
    case (_Actions || _load_Actions()).CLEAR_RECORDS:
      {
        return Object.assign({}, state, {
          records: []
        });
      }
    case (_Actions || _load_Actions()).REGISTER_EXECUTOR:
      {
        const { executor } = action.payload;
        return Object.assign({}, state, {
          executors: new Map(state.executors).set(executor.id, executor)
        });
      }
    case (_Actions || _load_Actions()).SELECT_EXECUTOR:
      {
        const { executorId } = action.payload;
        return Object.assign({}, state, {
          currentExecutorId: executorId
        });
      }
    case (_Actions || _load_Actions()).REMOVE_SOURCE:
      {
        const { sourceId } = action.payload;
        const providers = new Map(state.providers);
        const providerStatuses = new Map(state.providerStatuses);
        const executors = new Map(state.executors);
        providers.delete(sourceId);
        providerStatuses.delete(sourceId);
        executors.delete(sourceId);
        return Object.assign({}, state, {
          providers,
          providerStatuses,
          executors
        });
      }
    case (_Actions || _load_Actions()).UPDATE_STATUS:
      {
        const { status, providerId } = action.payload;
        return Object.assign({}, state, {
          providerStatuses: new Map(state.providerStatuses).set(providerId, status)
        });
      }
    case (_Actions || _load_Actions()).EXECUTE:
      {
        const command = action.payload.code;
        return Object.assign({}, state, {
          history: state.history.concat(command).slice(-1000)
        });
      }
    case (_Actions || _load_Actions()).SET_CREATE_PASTE_FUNCTION:
      {
        const { createPasteFunction } = action.payload;
        return Object.assign({}, state, {
          createPasteFunction
        });
      }
    case (_Actions || _load_Actions()).SET_WATCH_EDITOR_FUNCTION:
      {
        const { watchEditor } = action.payload;
        return Object.assign({}, state, {
          watchEditor
        });
      }
    case (_Actions || _load_Actions()).SET_FONT_SIZE:
      {
        const { fontSize } = action.payload;
        return Object.assign({}, state, {
          fontSize
        });
      }
  }

  return state;
}