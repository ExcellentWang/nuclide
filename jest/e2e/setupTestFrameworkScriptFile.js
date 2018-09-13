/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @noflow
 * @format
 */
'use strict';

/* eslint nuclide-internal/no-commonjs: 0 */

require('../../modules/nuclide-node-transpiler/lib/require-hook.js');
const {closeAllTabs} = require('../e2e/tools');

beforeEach(async () => {
  await closeAllTabs();
});
