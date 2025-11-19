import { HTMLToScene } from '../classes/HTMLToScene.js';
import { ModuleInfo } from '../core.js';

/**
 * @module html-to-scene.HTMLToSceneHooks
 */

class HTMLToSceneHooks {
	static hook() {
		Hooks.once('init', (...args) => HTMLToScene.init(...args));
		Hooks.once('ready', (...args) => HTMLToScene.debugMode());

		Hooks.on('canvasReady', (...args) => HTMLToScene.replace(...args));
		Hooks.on('updateScene', (...args) => HTMLToScene.replace(...args));

		Hooks.on('canvasPan', () => HTMLToScene.updateDimensions());

		Hooks.on('renderSmallTimeApp', () => HTMLToScene.updateSmallTime());
		Hooks.on('diceSoNiceReady', () => {
			HTMLToScene.swapPosition('dice-box-canvas');
			HTMLToScene._diceSoNiceInstalled = true;
		});
		Hooks.on('lightingRefresh', () => HTMLToScene.updateSceneControls()); //renderSceneControls happens before the scene data is loaded

		Hooks.on('renderSceneConfig', (...args) =>
			HTMLToScene.renderSceneConfig(...args)
		);

		// Foundry VTT v13: Ensure form data is saved even when fields are disabled
		Hooks.on('preUpdateScene', (scene, updateData, options, userId) => {
			HTMLToScene.prepareSceneUpdate(scene, updateData);
		});

		Hooks.on('collapseSidebar', () => HTMLToScene.updateDimensions());

		Hooks.on('pauseGame', () => HTMLToScene.pauseControl());

		/**
		 * Own hooks
		 */

		Hooks.on('htmlToSceneReady', () => HTMLToScene.htmlToSceneReadyMacro());

		Hooks.on('htmlToSceneIFrameReady', () => HTMLToScene.htmlAccessSetter());

		Hooks.on('htmlToSceneIFrameReady', () =>
			HTMLToScene.htmlToSceneIFrameReadyMacro()
		);

		Hooks.on('htmlToSceneIFrameUpdated', () =>
			HTMLToScene.htmlToSceneIFrameUpdatedMacro()
		);
	}
}

export { HTMLToSceneHooks };
