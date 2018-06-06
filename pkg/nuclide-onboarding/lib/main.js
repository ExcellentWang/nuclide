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

import type {OnboardingFragment} from './types';

import createUtmUrl from './createUtmUrl';
import featureConfig from 'nuclide-commons-atom/feature-config';
import UniversalDisposable from 'nuclide-commons/UniversalDisposable';
import {viewableFromReactElement} from '../../commons-atom/viewableFromReactElement';
import OnboardingPaneItem, {WORKSPACE_VIEW_URI} from './OnboardingPaneItem';
import * as Immutable from 'immutable';
import createPackage from 'nuclide-commons-atom/createPackage';
import {destroyItemWhere} from 'nuclide-commons-atom/destroyItemWhere';
import * as React from 'react';
import {BehaviorSubject} from 'rxjs';
import {shell} from 'electron';

class Activation {
  // A stream of all of the fragments. This is essentially the state of our panel.
  _allOnboardingFragmentsStream: BehaviorSubject<
    Immutable.Map<string, OnboardingFragment>,
  > = new BehaviorSubject(Immutable.Map());

  _subscriptions: UniversalDisposable;

  constructor(state: ?Object) {
    this._subscriptions = this._registerCommandAndOpener();
    this._considerDisplayingOnboarding();
  }

  setOnboardingFragments(
    onboardingFragment: OnboardingFragment,
  ): UniversalDisposable {
    this._allOnboardingFragmentsStream.next(
      this._allOnboardingFragmentsStream
        .getValue()
        .set(onboardingFragment.key, onboardingFragment),
    );
    return new UniversalDisposable(() => {
      this._allOnboardingFragmentsStream.next(
        this._allOnboardingFragmentsStream
          .getValue()
          .remove(onboardingFragment.key),
      );
    });
  }

  dispose(): void {
    this._allOnboardingFragmentsStream.next(Immutable.Map());
    this._subscriptions.dispose();
  }

  _considerDisplayingOnboarding() {
    const showOnboarding = featureConfig.get(
      'nuclide-onboarding.showOnboarding',
    );
    // flowlint-next-line sketchy-null-mixed:off
    if (showOnboarding) {
      // eslint-disable-next-line nuclide-internal/atom-apis
      atom.workspace.open(WORKSPACE_VIEW_URI, {searchAllPanes: true});
    }
  }

  _registerCommandAndOpener(): UniversalDisposable {
    return new UniversalDisposable(
      atom.workspace.addOpener(uri => {
        if (uri === WORKSPACE_VIEW_URI) {
          return viewableFromReactElement(
            <OnboardingPaneItem
              allOnboardingFragmentsStream={this._allOnboardingFragmentsStream}
            />,
          );
        }
      }),
      () => destroyItemWhere(item => item instanceof OnboardingPaneItem),
      atom.commands.add('atom-workspace', 'nuclide-onboarding:toggle', () => {
        atom.workspace.toggle(WORKSPACE_VIEW_URI);
      }),
      atom.commands.add('atom-workspace', 'nuclide-docs:open', () => {
        shell.openExternal('https://nuclide.io/');
      }),
      atom.commands.add(
        'atom-workspace',
        // eslint-disable-next-line nuclide-internal/atom-apis
        'nuclide-onboarding:open-docs',
        e => {
          const url = createUtmUrl('https://nuclide.io/docs', 'help');
          shell.openExternal(url);
        },
      ),
    );
  }
}

createPackage(module.exports, Activation);
