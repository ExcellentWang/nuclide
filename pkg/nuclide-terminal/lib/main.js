/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 * @format
 */

import {destroyItemWhere} from 'nuclide-commons-atom/destroyItemWhere';
// for homedir
import os from 'os';
import nullthrows from 'nullthrows';

import createPackage from 'nuclide-commons-atom/createPackage';
import getElementFilePath from '../../commons-atom/getElementFilePath';
import {goToLocation} from 'nuclide-commons-atom/go-to-location';
import nuclideUri from 'nuclide-commons/nuclideUri';
import UniversalDisposable from 'nuclide-commons/UniversalDisposable';

import {setRpcService} from './AtomServiceContainer';
import {deserializeTerminalView, TerminalView} from './terminal-view';
import {
  infoFromUri,
  uriFromInfo,
  URI_PREFIX,
} from '../../commons-node/nuclide-terminal-uri';
import {FocusManager} from './FocusManager';

import type CwdApi from '../../nuclide-current-working-directory/lib/CwdApi';
import type {CreatePasteFunction} from 'atom-ide-ui/pkg/atom-ide-console/lib/types';

class Activation {
  _subscriptions: UniversalDisposable;
  _cwd: ?CwdApi;

  constructor() {
    const focusManager = new FocusManager();
    this._subscriptions = new UniversalDisposable(
      focusManager,
      atom.workspace.addOpener(uri => {
        if (uri.startsWith(URI_PREFIX)) {
          return new TerminalView(uri);
        }
      }),
      atom.commands.add(
        'atom-workspace',
        'nuclide-terminal:new-terminal',
        event => {
          const cwd = this._getPathOrCwd(event);
          const uri = cwd != null ? uriFromInfo({cwd}) : uriFromInfo({});
          goToLocation(uri);
        },
      ),
      atom.commands.add(
        'atom-workspace',
        'nuclide-terminal:new-local-terminal',
        event => {
          const uri = uriFromInfo({cwd: os.homedir()});
          goToLocation(uri);
        },
      ),
      atom.commands.add(
        'atom-workspace',
        'nuclide-terminal:toggle-terminal-focus',
        () => focusManager.toggleFocus(),
      ),
    );
  }

  provideTerminal(): nuclide$TerminalApi {
    return {
      open: (info: nuclide$TerminalInfo): Promise<nuclide$TerminalInstance> => {
        const terminalView: any = goToLocation(uriFromInfo(info));
        return terminalView;
      },
      close: (key: string) => {
        destroyItemWhere(item => {
          if (item.getURI == null || item.getURI() == null) {
            return false;
          }

          const uri = nullthrows(item.getURI());
          try {
            // Only close terminal tabs with the same unique key.
            const otherInfo = infoFromUri(uri);
            return otherInfo.key === key;
          } catch (e) {}
          return false;
        });
      },
    };
  }

  dispose() {
    this._subscriptions.dispose();
  }

  consumePasteProvider(provider: any): IDisposable {
    const createPaste: CreatePasteFunction = provider.createPaste;
    const disposable = new UniversalDisposable(
      atom.commands.add(
        '.terminal-pane',
        'nuclide-terminal:create-paste',
        async event => {
          const {currentTarget: {terminal}} = (event: any);
          const uri = await createPaste(
            terminal.getSelection(),
            {
              title: 'Paste from Nuclide Terminal',
            },
            'terminal paste',
          );
          atom.notifications.addSuccess(`Created paste at ${uri}`);
        },
      ),
      atom.contextMenu.add({
        '.terminal-pane': [
          {
            label: 'Create Paste',
            command: 'nuclide-terminal:create-paste',
            shouldDisplay: event => {
              const div = event.target.closest('.terminal-pane');
              if (div == null) {
                return false;
              }
              const {terminal} = (div: any);
              if (terminal == null) {
                return false;
              }
              return terminal.hasSelection();
            },
          },
          {type: 'separator'},
        ],
      }),
    );
    this._subscriptions.add(disposable);
    return new UniversalDisposable(() => {
      disposable.dispose();
      this._subscriptions.remove(disposable);
    });
  }

  initializeCwdApi(cwd: CwdApi): IDisposable {
    this._cwd = cwd;
    return new UniversalDisposable(() => {
      this._cwd = null;
    });
  }

  consumeRpcService(rpcService: nuclide$RpcService): IDisposable {
    return setRpcService(rpcService);
  }

  _getPathOrCwd(event: Event): ?string {
    const editorPath = getElementFilePath(
      ((event.target: any): HTMLElement),
      true,
    );

    if (editorPath != null) {
      return nuclideUri.endsWithSeparator(editorPath)
        ? editorPath
        : nuclideUri.dirname(editorPath);
    }

    if (this._cwd != null) {
      return this._cwd.getCwd();
    }

    return null;
  }
}

// eslint-disable-next-line rulesdir/no-commonjs
module.exports = {
  // exported for package.json entry
  deserializeTerminalView,
};

createPackage(module.exports, Activation);
