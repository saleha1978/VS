/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { SCMMenus } from '../../browser/menus.js';
import { SCMViewService } from '../../browser/scmViewService.js';
import { ISCMProvider, ISCMRepository, ISCMService } from '../../common/scm.js';

suite('SCMViewService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	test('sorts repositories by full path, keeping nested repositories after their parent', () => runWithFakedTimers({}, async () => {
		const repositories = [
			'/ws/a', '/ws/b', '/ws/a/common1', '/ws/a/x', '/ws/a/common1/foo', '/ws/a/common1/foo/bar',
			'/ws/a/x/common2', '/ws/b/common1', '/ws/b/y', '/ws/b/common1/foo', '/ws/b/y/common2'
		].map(path => new class extends mock<ISCMRepository>() {
			override readonly provider = new class extends mock<ISCMProvider>() {
				override readonly providerId = 'git';
				override readonly label = 'Git';
				override readonly rootUri = URI.file(path);
			}();
		}());

		const instantiationService = disposables.add(new TestInstantiationService());
		instantiationService.stubInstance(SCMMenus, {});
		instantiationService.stub(ISCMService, new class extends mock<ISCMService>() {
			override readonly repositories = repositories;
			override readonly onDidAddRepository = Event.None;
			override readonly onDidRemoveRepository = Event.None;
		}());
		instantiationService.stub(IConfigurationService, new TestConfigurationService({ 'scm.repositories.sortOrder': 'path' }));
		instantiationService.stub(IContextKeyService, disposables.add(new MockContextKeyService()));
		instantiationService.stub(IEditorService, new class extends mock<IEditorService>() {
			override readonly onDidActiveEditorChange = Event.None;
		}());
		instantiationService.stub(IExtensionService, new class extends mock<IExtensionService>() {
			override readonly onWillStop = Event.None;
		}());
		instantiationService.stub(IStorageService, disposables.add(new TestStorageService()));
		instantiationService.stub(IWorkspaceContextService, new class extends mock<IWorkspaceContextService>() { }());

		const scmViewService = disposables.add(instantiationService.createInstance(SCMViewService));

		assert.deepStrictEqual(scmViewService.repositories.map(r => r.provider.rootUri?.path), [
			'/ws/a', '/ws/a/common1', '/ws/a/common1/foo', '/ws/a/common1/foo/bar', '/ws/a/x', '/ws/a/x/common2',
			'/ws/b', '/ws/b/common1', '/ws/b/common1/foo', '/ws/b/y', '/ws/b/y/common2'
		]);
	}));
});
